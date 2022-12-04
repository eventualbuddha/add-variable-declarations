import { Node } from '@babel/types';
import { Token } from '../types';

export default function getParenthesesRanges(
  node: Node,
  tokens: Array<Token>
): Array<{ start: number; end: number }> {
  let leftParenTokens: Array<Token> = [];
  let rightParenTokens: Array<Token> = [];

  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];
    if (token.start === node.start) {
      for (let j = i - 1; j >= 0; j--) {
        if (tokens[j].type.label === '(') {
          leftParenTokens.unshift(tokens[j]);
        } else {
          break;
        }
      }
    } else if (token.end === node.end) {
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].type.label === ')') {
          rightParenTokens.push(tokens[j]);
        } else {
          break;
        }
      }
      break;
    }
  }

  if (
    leftParenTokens.length === 0 ||
    leftParenTokens.length !== rightParenTokens.length
  ) {
    return [];
  }

  return [
    {
      start: leftParenTokens[0].start,
      end: leftParenTokens[leftParenTokens.length - 1].end,
    },
    {
      start: rightParenTokens[0].start,
      end: rightParenTokens[rightParenTokens.length - 1].end,
    },
  ];
}
