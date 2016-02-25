export type Node = Object;
export type Token = Object;
export type SourceMap = Object;

export type Binding = {};

export type Scope = {
  getBinding: (name: string) => Binding,
  globals: {[key: string]: Node}
};
