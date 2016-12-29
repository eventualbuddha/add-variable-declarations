import MagicString from 'magic-string';
import TraverseState from './utils/TraverseState.js';
import getBindingIdentifiersFromLHS from './utils/getBindingIdentifiersFromLHS.js';
import lhsHasNonIdentifierAssignment from './utils/lhsHasNonIdentifierAssignment';
import traverse from 'babel-traverse';
import type NodePath from 'babel-traverse/src/path/index.js';
import type { Node, SourceMap } from './types.js';
import { parse } from 'babylon';

const BABYLON_PLUGINS = [
  'flow',
  'jsx',
  'asyncFunctions',
  'asyncGenerators',
  'classConstructorCall',
  'classProperties',
  'decorators',
  'doExpressions',
  'exponentiationOperator',
  'exportExtensions',
  'functionBind',
  'functionSent',
  'objectRestSpread',
  'trailingFunctionCommas'
];

export default function addVariableDeclarations(
  source: string,
  editor: MagicString=new MagicString(source),
  ast: Node=parse(source, {
      plugins: BABYLON_PLUGINS,
      sourceType: 'module',
      allowReturnOutsideFunction: true
    })
): { code: string, map: SourceMap } {
  let state = null;
  let seen = new Set();

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

      let state = getState();
      let names = getBindingIdentifiersFromLHS(node.left).map(id => id.name);
      let canInsertVar = !lhsHasNonIdentifierAssignment(node.left) && (
          path.parent.type === 'ExpressionStatement' ||
          (path.parent.type === 'ForStatement' && node === path.parent.init)
        );
      if (canInsertVar) {
        state.addInlineBinding(node, names, { shouldRemoveParens: true });
      } else {
        for (let name of names) {
          state.addBinding(name);
        }
      }
    },

    /**
     * We want to declare each variable at its most specific scope across all
     * assignments and usages, so note each usage, since it might affect that
     * scope.
     */
    Identifier(path: NodePath) {
      let state = getState();
      state.handleSeenIdentifier(path.node.name);
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
      let names = getBindingIdentifiersFromLHS(node.left).map(id => id.name);
      if (lhsHasNonIdentifierAssignment(node.left)) {
        for (let name of names) {
          state.addBinding(name);
        }
      } else {
        state.addInlineBinding(node.left, names, { shouldRemoveParens: false });
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

      for (let expression of node.expressions) {
        if (expression.type !== 'AssignmentExpression') {
          return;
        }

        let identifiers = getBindingIdentifiersFromLHS(expression.left);
        if (identifiers.length === 0) {
          return;
        }
        if (lhsHasNonIdentifierAssignment(expression.left)) {
          return;
        }

        names.push(...identifiers.map(identifier => identifier.name));
      }
      state.addInlineBinding(node, names, { shouldRemoveParens: false });
      node.expressions.forEach(expression => seen.add(expression));
    },

    Scope: {
      enter(path: NodePath) {
        state = new TraverseState(path.scope, state);
      },

      exit() {
        if (state) {
          state.commitDeclarations(editor, source, ast.tokens);
          state = state.parentState;
        }
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

  return {
    code: editor.toString(),
    map: editor.generateMap()
  };
}

