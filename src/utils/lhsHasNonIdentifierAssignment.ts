import * as t from 'babel-types';

/**
 * Determines if any assignments are to properties or other non-identifiers. If
 * so, then it's illegal to put `var` to the left of the assignment.
 *
 *   a = 1;                         // false
 *   ({ b, c } = {});               // false
 *   [ d, e.f ] = [];               // true
 */
export default function lhsHasNonIdentifierAssignment(node: t.Node): boolean {
  if (t.isIdentifier(node)) {
    return false;
  }

  if (t.isObjectPattern(node)) {
    return node.properties.some(property => lhsHasNonIdentifierAssignment(
      t.isRestProperty(property)
        ? property.argument
        : property.value
    ));
  }

  if (t.isArrayPattern(node)) {
    return node.elements.some(lhsHasNonIdentifierAssignment);
  }

  if (t.isRestElement(node)) {
    // JS allows array and object destructuring on a rest assignee, but they
    // can't be used in an inline assignment.
    return !t.isIdentifier(node.argument);
  }

  return true;
}
