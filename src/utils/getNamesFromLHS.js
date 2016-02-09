import flatMap from './flatMap.js';

/**
 * Gets the names to be bound in the LHS of an assignment.
 *
 *   a = 1;                         // [ 'a' ]
 *   ({ b, c } = {});               // [ 'b', 'c' ]
 *   [ d, e ] = [];                 // [ 'd', 'e' ]
 *   ({ f: g, h: [ i, j ] } = {});  // [ 'g', 'i', 'j' ]
 */
export default function getNamesFromLHS(node: Node): Array<string> {
  switch (node.type) {
    case 'Identifier':
      return [node.name];

    case 'ObjectPattern':
      return flatMap(node.properties, property => getNamesFromLHS(property.value));

    case 'ArrayPattern':
      return flatMap(node.elements, getNamesFromLHS);

    default:
      return [];
  }
}
