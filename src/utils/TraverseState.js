import type { Scope } from 'babel-traverse';

export default class TraverseState {
  constructor(scope: Scope, parentState: ?TraverseState=null) {
    this.scope = scope;
    this.parentState = parentState;
    this.names = new Set();
  }

  addName(name: string): boolean {
    if (this.hasName(name)) {
      return false;
    }
    this.names.add(name);
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
