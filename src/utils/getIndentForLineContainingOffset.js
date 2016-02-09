export default function getIndentForLineContainingOffset(source: string, offset: number): string {
  let lastNewlineIndex = source.lastIndexOf('\n', offset);

  for (let i = lastNewlineIndex + 1; i < source.length; i++) {
    switch (source[i]) {
      case ' ':
      case '\t':
        break;

      default:
        return source.slice(lastNewlineIndex + 1, i);
    }
  }

  return source.slice(lastNewlineIndex + 1);
}
