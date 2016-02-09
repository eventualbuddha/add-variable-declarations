import getIndentForLineContainingOffset from './getIndentForLineContainingOffset.js';

export default function buildDeclarationForNames(names: Array<string>, source: string, offset: number): string {
  return `var ${names.sort().join(', ')};\n${getIndentForLineContainingOffset(source, offset)}`;
}

