import type { Node, Scope } from '../types.js';

export default class TraverseState {
  scope: Scope;
  parentState: ?TraverseState;
  bindingIdentifiers: Set<Node> = new Set();
  names: Set<string> = new Set();

  constructor(scope: Scope, parentState: ?TraverseState=null) {
    this.scope = scope;
    this.parentState = parentState;
  }

  addBindingIdentifier(node: Node): boolean {
    if (this.hasName(node.name)) {
      return false;
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
}
