import MagicString from 'magic-string';
import TraverseState from './utils/TraverseState.js';
import buildDeclarationForNames from './utils/buildDeclarationForNames.js';
import getFirstStatementInBlock from './utils/getFirstStatementInBlock.js';
import getNamesFromLHS from './utils/getNamesFromLHS.js';
import getParenthesesRanges from './utils/getParenthesesRanges.js';
import traverse from 'babel-traverse';
import type NodePath from 'babel-traverse/src/path/index.js';
import type { Node, Token, SourceMap } from './types.js';
import { parse } from 'babylon';

const BABYLON_PLUGINS = [
  'classProperties'
];

export default function addVariableDeclarations(
  source: string,
  editor: MagicString=new MagicString(source),
  ast: Node=parse(source, { plugins: BABYLON_PLUGINS })
): { code: string, map: SourceMap } {
  let state = null;
  let seen = new Set();
  let deferredInlinePositions = [];

  traverse(ast, {
    /**
     * Adds `var` for assignments, either in place or at the top of the scope.
     *
     *   a = 1;      // can add `var` inline
     *   b(c = 2);   // needs standalone `var` at the top of scope
     */
    AssignmentExpression(path: NodePath) {
      let { node } = path;

      if (node.operator !== '=') {
        // Ignore e.g. `+=`.
        return;
      }

      if (seen.has(node)) {
        // We've already processed this one.
        return;
      }

      let names = getNamesFromLHS(node.left);
      let newNames = names.filter(name => state.addName(name));
      let state = getState();
      let canInsertVar = (
        path.parent.type === 'ExpressionStatement' ||
        (
          path.parent.type === 'ForStatement' &&
          node === path.parent.init
        )
      );

      if (newNames.length === 0) {
        return;
      }

      if (canInsertVar && newNames.length === names.length) {
        getParenthesesRanges(node, ast.tokens).forEach(({ start, end }) => editor.remove(start, end));
        deferredInlinePositions.push(node.start);
      } else {
        let insertionScope = path.scope;
        let firstStatement;
        do {
          firstStatement = getFirstStatementInBlock(insertionScope.block);
          insertionScope = insertionScope.parent;
        } while (!firstStatement);
        editor.insert(
          firstStatement.start,
          buildDeclarationForNames(newNames, source, firstStatement.start)
        );
      }
    },

    /**
     * Adds `var` to `for-in` and `for-of` loops, e.g.
     *
     *   for (key in object) {
     *     …
     *   }
     *
     *   for (item of list) {
     *     …
     *   }
     */
    ForXStatement(path: NodePath) {
      let state = getState();
      let { node } = path;
      let names = getNamesFromLHS(node.left);
      let newNames = names.filter(name => state.addName(name));

      if (newNames.length === 0) {
        return;
      }

      if (newNames.length === names.length) {
        deferredInlinePositions.push(node.left.start);
      } else {
        let firstStatement = getFirstStatementInBlock(path.parentPath.scope.block);
        editor.insert(
          firstStatement.start,
          buildDeclarationForNames(names, source, firstStatement.start)
        );
      }
    },

    /**
     * Optimizes for the case where there are multiple assignments in one
     * sequence of expressions, e.g.
     *
     *   for (i = 0, length = list.length; i < length; i++) {
     *     …
     *   }
     */
    SequenceExpression(path: NodePath) {
      let state = getState();
      let { node } = path;
      let names = [];

      for (let i = 0; i < node.expressions.length; i++) {
        let expression = node.expressions[i];
        if (expression.type !== 'AssignmentExpression') {
          return;
        }

        let lhsNames = getNamesFromLHS(expression.left);
        if (lhsNames.length === 0) {
          return;
        }

        names.push(...lhsNames);
      }

      let newNames = names.filter(name => !state.hasName(name));

      if (newNames.length !== names.length) {
        return;
      }

      node.expressions.forEach(expression => seen.add(expression));
      deferredInlinePositions.push(node.start);
    },

    Scope: {
      enter(path: NodePath) {
        state = new TraverseState(path.scope, state);
      },

      exit() {
        state = state ? state.parentState : null;
      }
    }
  });

  function getState(): TraverseState {
    if (!state) {
      throw new Error('BUG: state is not set');
    } else {
      return state;
    }
  }

  deferredInlinePositions.forEach(position => editor.insert(position, 'var '));

  return {
    code: editor.toString(),
    map: editor.generateMap()
  };
}

