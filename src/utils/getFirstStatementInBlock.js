import type { Node } from '../types.js';

export default function getFirstStatementInBlock(node: Node): ?Node {
  switch (node.type) {
    case 'BlockStatement':
    case 'Program':
      return node.body[0];

    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ForStatement':
      return getFirstStatementInBlock(node.body);

    case 'ArrowFunctionExpression':
      if (node.body.type === 'BlockStatement') {
        return getFirstStatementInBlock(node.body);
      } else {
        return null;
      }

    default:
      return null;
  }
}
