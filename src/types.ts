import * as t from '@babel/types';

// This should be defined in `@babel/types` but isn't.
export interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
  loc: t.SourceLocation;
}

export interface TokenType {
  label: string;
  keyword?: string;
  beforeExpr: boolean;
  startsExpr: boolean;
  rightAssociative: boolean;
  isLoop: boolean;
  isAssign: boolean;
  prefix: boolean;
  postfix: boolean;
  binop: number | null;
  updateContext: Function | null;
}
