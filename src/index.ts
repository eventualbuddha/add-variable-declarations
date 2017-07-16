import MagicString from 'magic-string';
import TraverseState from './utils/TraverseState';
import getBindingIdentifiersFromLHS from './utils/getBindingIdentifiersFromLHS';
import lhsHasNonIdentifierAssignment from './utils/lhsHasNonIdentifierAssignment';
import traverse, { NodePath } from 'babel-traverse';
import * as t from 'babel-types';
import { parse } from 'babylon';

// Extracted from magic-string/index.d.ts.
export type SourceMap = {
  toString(): string;
  toUrl(): string;
};

export default function addVariableDeclarations(
  source: string,
  editor = new MagicString(source),
  ast: t.File = parse(source, {
    plugins: [
      'jsx',
      'flow',
      'classConstructorCall',
      'doExpressions',
      'objectRestSpread',
      'decorators',
      'classProperties',
      'exportExtensions',
      'asyncGenerators',
      'functionBind',
      'functionSent',
      'dynamicImport',
      'optionalChaining',
    ],
    sourceType: 'module',
    allowReturnOutsideFunction: true,
    tokens: true,
  } as any)
): { code: string, map: SourceMap } {
  let state: TraverseState | null = null;
  let savedStates: Array<TraverseState> = [];
  let seen = new Set<t.Node>();

  traverse(ast, {
    /**
     * Adds `var` for assignments, either in place or at the top of the scope.
     *
     *   a = 1;      // can add `var` inline
     *   b(c = 2);   // needs standalone `var` at the top of scope
     */
    AssignmentExpression(path: NodePath<t.AssignmentExpression>) {
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
        t.isExpressionStatement(path.parent) ||
        (t.isForStatement(path.parent) && node === path.parent.init)
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
    Identifier(path: NodePath<t.Identifier>) {
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
    ForXStatement(path: NodePath<t.ForXStatement>) {
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
    SequenceExpression(path: NodePath<t.SequenceExpression>) {
      let state = getState();
      let { node } = path;
      let names = [];

      if (!t.isExpressionStatement(path.parent) &&
          !(t.isForStatement(path.parent) && node === path.parent.init)) {
        return;
      }

      for (let expression of node.expressions) {
        if (!t.isAssignmentExpression(expression)) {
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

      state.addInlineBinding(node, names, { shouldRemoveParens: true });
      node.expressions.forEach(expression => seen.add(expression));
    },

    Scope: {
      enter(path: NodePath<t.Scopable>) {
        state = new TraverseState(path.scope, state);
      },

      exit() {
        if (state) {
          state.commitDeclarations(editor, source, ast.tokens);
          state = state.parentState;
        }
      }
    },

    enter(path: NodePath<t.Node>) {
      // ObjectMethod and ClassMethod nodes are strange in that their key name
      // is in the outer scope, not the method scope, so we get the wrong scope
      // if we use the usual scope enter and exit hooks. To work around this,
      // pretend to be one scope higher while in the key, then restore the state
      // afterward.
      if ((t.isObjectMethod(path.parent) && path.key === 'key') ||
          (t.isClassMethod(path.parent) && path.key === 'key')) {
        savedStates.push(getState());
        state = getState().parentState;
      }
    },

    exit(path: NodePath<t.Node>) {
      if ((t.isObjectMethod(path.parent) && path.key === 'key') ||
          (t.isClassMethod(path.parent) && path.key === 'key')) {
        state = savedStates.pop() || null;
      }
    },
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

