import * as t from '@babel/types';

export default function getFirstStatementInBlock(node: t.Node): t.Node | null {
  if (t.isBlockStatement(node) || t.isProgram(node)) {
    return node.body[0];
  }

  if (t.isFunction(node)) {
    return getFirstStatementInBlock(node.body);
  }

  return null;
}
