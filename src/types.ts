export type TokenType = {
  label: string;
};

export type Token = {
  type: TokenType;
  start: number;
  end: number;
};
