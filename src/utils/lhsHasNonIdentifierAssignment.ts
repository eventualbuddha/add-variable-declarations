import * as t from '@babel/types';

/**
 * Determines if any assignments are to properties or other non-identifiers. If
 * so, then it's illegal to put `var` to the left of the assignment.
 *
 * @example
 *
 *   a = 1;              // false
 *   ({ b, c } = {});    // false
 *   [ d, e.f ] = [];    // true
 */
export default function lhsHasNonIdentifierAssignment(node: t.Node): boolean {
  if (t.isIdentifier(node)) {
    return false;
  }

  if (t.isObjectPattern(node)) {
    return node.properties.some((property) =>
      lhsHasNonIdentifierAssignment(
        t.isRestElement(property) ? property.argument : property.value
      )
    );
  }

  if (t.isArrayPattern(node)) {
    return node.elements.some(
      (element) => element && lhsHasNonIdentifierAssignment(element)
    );
  }

  if (t.isRestElement(node)) {
    // JS allows array and object destructuring on a rest assignee, but they
    // can't be used in an inline assignment.
    return !t.isIdentifier(node.argument);
  }

  if (t.isAssignmentPattern(node)) {
    return lhsHasNonIdentifierAssignment(node.left);
  }

  return true;
}
