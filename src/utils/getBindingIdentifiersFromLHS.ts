import * as t from '@babel/types';

/**
 * Gets the names to be bound in the LHS of an assignment.
 *
 * @example
 *
 *   a = 1;                         // [ 'a' ]
 *   ({ b, c } = {});               // [ 'b', 'c' ]
 *   [ d, e ] = [];                 // [ 'd', 'e' ]
 *   ({ f: g, h: [ i, j ] } = {});  // [ 'g', 'i', 'j' ]
 *   [ k.l, ...m ] = [];            // [ 'm' ]
 */
export default function getBindingIdentifiersFromLHS(
  node: t.Node
): Array<t.Identifier> {
  if (t.isIdentifier(node)) {
    return [node];
  }

  if (t.isObjectPattern(node)) {
    return node.properties.flatMap((property) =>
      getBindingIdentifiersFromLHS(
        t.isRestElement(property) ? property.argument : property.value
      )
    );
  }

  if (t.isArrayPattern(node)) {
    return node.elements.flatMap((element) =>
      element ? getBindingIdentifiersFromLHS(element) : []
    );
  }

  if (t.isRestElement(node)) {
    return getBindingIdentifiersFromLHS(node.argument);
  }

  if (t.isAssignmentPattern(node)) {
    return getBindingIdentifiersFromLHS(node.left);
  }

  return [];
}
