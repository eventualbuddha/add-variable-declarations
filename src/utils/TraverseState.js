import type { Node, Scope } from '../types.js';

export default class TraverseState {
  scope: Scope;
  parentState: ?TraverseState;
  bindingIdentifiers: Set<Node> = new Set();
  names: Set<string> = new Set();
  globals: Map<string, Node> = new Map();

  constructor(scope: Scope, parentState: ?TraverseState=null) {
    this.scope = scope;
    this.parentState = parentState;
    this.collectGlobals(scope);
  }

  addBindingIdentifier(node: Node): boolean {
    if (this.hasName(node.name)) {
      return false;
    }
    let global = this.getGlobal(node.name);
    if (global && global.start < node.start) {
      // Anything that is referenced before being assigned is really, truly, a
      // global and should not be converted to a local variable.
      return;
    }
    this.bindingIdentifiers.add(node);
    this.names.add(node.name);
    return true;
  }

  hasName(name: string): boolean {
    let state = this;
    do {
      if (state.hasOwnName(name)) {
        return true;
      }
    } while (state = state.parentState);
    return false;
  }

  hasOwnName(name: string): boolean {
    return !!this.scope.getBinding(name) || this.names.has(name);
  }

  getGlobal(name: string): ?Node {
    let state = this;
    do {
      let global = state.globals.get(name);
      if (global) {
        return global;
      }
    } while (state = state.parentState);
    return null;
  }

  /**
   * @private
   */
  collectGlobals(scope: Scope) {
    Object.keys(scope.globals).forEach(
      name => this.globals.set(name, scope.globals[name])
    );
  }
}
