import { Scope } from '@babel/traverse';
import { isFunction, Node } from '@babel/types';
import MagicString from 'magic-string';
import { Token } from '../types';
import buildDeclarationForNames from './buildDeclarationForNames';
import getFirstStatementInBlock from './getFirstStatementInBlock';
import getParenthesesRanges from './getParenthesesRanges';

/**
 * The state of one proposed binding. As new usages are seen, the
 * mostSpecificScope field is updated accordingly.
 */
export class BindingState {
  name: string;
  mostSpecificScope: Scope;
  isInOriginalPosition: boolean = true;

  constructor(name: string, scope: Scope) {
    this.name = name;
    this.mostSpecificScope = scope;
  }

  handleSeenScope(scope: Scope) {
    let newScopes = new Set();
    for (let newScope = scope; newScope; newScope = newScope.parent) {
      newScopes.add(newScope);
    }
    while (!newScopes.has(this.mostSpecificScope)) {
      this.mostSpecificScope = this.mostSpecificScope.parent;
      this.isInOriginalPosition = false;
    }
  }
}

/**
 * Information about an "inline binding", a potential opportunity to insert
 * `var` directly at the variable declaration.
 */
export type InlineBindingState = {
  node: Node;
  bindings: Array<BindingState>;
  shouldRemoveParens: boolean;
};

/**
 * Mutable structure containing the current declarations in the traversal. Each
 * TraverseState object corresponds to one scope in the source code (which could
 * be any block, not just a function scope), so the full set of TraverseState
 * objects forms a tree structure, but any any point in time, the current
 * TraverseState forms a path through all parent scopes.
 *
 * Even though every scope gets a TraverseState, only function scopes can
 * actually "own" bindings. This makes it easy to detect when two variables are
 * the same.
 */
export default class TraverseState {
  scope: Scope;
  parentState: TraverseState | null;
  ownedBindings: Map<string, BindingState> = new Map();
  ownedInlineBindings: Array<InlineBindingState> = [];

  constructor(scope: Scope, parentState: TraverseState | null = null) {
    this.scope = scope;
    this.parentState = parentState;
  }

  /**
   * Declare that there is an assignment to a variable with this name in this
   * scope.
   */
  addBinding(name: string) {
    let searchResult = this.resolveName(name);
    if (searchResult === 'NOT_FOUND') {
      this.createBinding(name, this.scope);
    } else if (searchResult !== 'ALREADY_DECLARED') {
      searchResult.handleSeenScope(this.scope);
    }
  }

  /**
   * Note that this identifier appears in this scope. This won't create
   * bindings, but might update the most specific scope for existing bindings.
   */
  handleSeenIdentifier(name: string) {
    let searchResult = this.resolveName(name);
    if (searchResult !== 'NOT_FOUND' && searchResult !== 'ALREADY_DECLARED') {
      searchResult.handleSeenScope(this.scope);
    }
  }

  /**
   * Declare that, if possible, the given names should all have declarations
   * added by inserting `var` at the start of the specified node. If any of them
   * end up changing scopes due to later information, or if any of them are
   * already declared, we'll just add the names to the most specific scope.
   *
   * To make calling code simpler, this method allows an empty array of names
   * (in which case it's a no-op) and allows names that are already defined
   * (in which case we immediately know that we won't be able to do an inline
   * binding).
   */
  addInlineBinding(
    node: Node,
    names: Array<string>,
    { shouldRemoveParens }: { shouldRemoveParens: boolean }
  ) {
    if (names.length === 0) {
      return;
    }
    // This is only eligible as an inline binding if every name is distinct and not yet taken.
    if (
      names.every((name) => this.resolveName(name) === 'NOT_FOUND') &&
      new Set(names).size === names.length
    ) {
      let newBindings = names.map((name) =>
        this.createBinding(name, this.scope)
      );
      let bindingOwner = this.getEnclosingBindingOwner();
      bindingOwner.ownedInlineBindings.push({
        node,
        bindings: newBindings,
        shouldRemoveParens,
      });
    } else {
      for (let name of names) {
        this.addBinding(name);
      }
    }
  }

  createBinding(name: string, scope: Scope): BindingState {
    let bindingOwner = this.getEnclosingBindingOwner();
    if (bindingOwner.ownedBindings.has(name)) {
      throw new Error(
        'Tried to create a binding for a name that is already taken.'
      );
    }
    let newState = new BindingState(name, scope);
    bindingOwner.ownedBindings.set(name, newState);
    return newState;
  }

  getEnclosingBindingOwner(): TraverseState {
    if (this.canOwnBindings()) {
      return this;
    } else if (!this.parentState) {
      throw new Error(`expected parent state but none was found!`);
    } else {
      return this.parentState.getEnclosingBindingOwner();
    }
  }

  canOwnBindings(): boolean {
    if (!this.parentState) {
      return true;
    }
    return isFunction(this.scope.block);
  }

  resolveName(name: string): BindingState | 'NOT_FOUND' | 'ALREADY_DECLARED' {
    if (this.scope.getBinding(name)) {
      return 'ALREADY_DECLARED';
    }
    let binding = this.ownedBindings.get(name);
    if (binding) {
      return binding;
    }
    if (this.parentState) {
      return this.parentState.resolveName(name);
    } else {
      return 'NOT_FOUND';
    }
  }

  /**
   * When we finish processing a function, we know that we have all information
   * we need for variables scoped to this function, so we can insert the `var`
   * declarations at the right places.
   */
  commitDeclarations(
    editor: MagicString,
    source: string,
    tokens: Array<Token>
  ) {
    let usedNames = new Set<string>();
    // Defer `var` insertions so that magic-string will insert things in the
    // right order.
    let varInsertionPoints: Array<number> = [];
    for (let inlineBinding of this.ownedInlineBindings) {
      if (
        inlineBinding.bindings.every((binding) => binding.isInOriginalPosition)
      ) {
        let { node, shouldRemoveParens } = inlineBinding;
        if (shouldRemoveParens) {
          for (let { start, end } of getParenthesesRanges(node, tokens)) {
            editor.remove(start, end);
          }
        }
        varInsertionPoints.push(node.start!);
        for (let binding of inlineBinding.bindings) {
          usedNames.add(binding.name);
        }
      }
    }

    for (let [scope, names] of this.getBindingNamesByScope(
      usedNames
    ).entries()) {
      let firstStatement = this.getFirstStatementForScope(scope);
      if (firstStatement) {
        editor.appendLeft(
          firstStatement.start!,
          buildDeclarationForNames(names, source, firstStatement.start!)
        );
      }
    }

    for (let insertionPoint of varInsertionPoints) {
      editor.appendLeft(insertionPoint, 'var ');
    }
  }

  /**
   * Get all names that we still need to declare (ones not in usedNames), sorted
   * and grouped by scope.
   */
  getBindingNamesByScope(usedNames: Set<string>): Map<Scope, Array<string>> {
    let bindingNamesByScope = new Map<Scope, Array<string>>();

    for (let { name, mostSpecificScope } of this.ownedBindings.values()) {
      if (usedNames.has(name)) {
        continue;
      }

      let names = bindingNamesByScope.get(mostSpecificScope);
      if (names) {
        names.push(name);
      } else {
        bindingNamesByScope.set(mostSpecificScope, [name]);
      }
    }

    for (let names of bindingNamesByScope.values()) {
      names.sort();
    }

    return bindingNamesByScope;
  }

  getFirstStatementForScope(scope: Scope): Node | null {
    let firstStatement;
    let insertionScope = scope;

    do {
      firstStatement = getFirstStatementInBlock(insertionScope.block);
      insertionScope = insertionScope.parent;
    } while (!firstStatement);

    return firstStatement;
  }
}
