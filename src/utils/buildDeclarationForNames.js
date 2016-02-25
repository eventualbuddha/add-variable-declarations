import getIndentForLineContainingOffset from './getIndentForLineContainingOffset.js';

export default function buildDeclarationForNames(names: Array<string>, source: string, offset: number): string {
  let nameList = names.sort((a, b) => a.localeCompare(b)).join(', ');
  let indent = getIndentForLineContainingOffset(source, offset);
  return `var ${nameList};\n${indent}`;
}

