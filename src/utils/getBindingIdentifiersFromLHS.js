import flatMap from './flatMap.js';
import type { Node } from '../types.js';

/**
 * Gets the names to be bound in the LHS of an assignment.
 *
 *   a = 1;                         // [ 'a' ]
 *   ({ b, c } = {});               // [ 'b', 'c' ]
 *   [ d, e ] = [];                 // [ 'd', 'e' ]
 *   ({ f: g, h: [ i, j ] } = {});  // [ 'g', 'i', 'j' ]
 *   [ k.l, ...m ] = [];            // [ 'm' ]
 */
export default function getBindingIdentifiersFromLHS(node: Node): Array<Node> {
  switch (node.type) {
    case 'Identifier':
      return [node];

    case 'ObjectPattern':
      return flatMap(node.properties, property => getBindingIdentifiersFromLHS(property.value));

    case 'ArrayPattern':
      return flatMap(node.elements, getBindingIdentifiersFromLHS);

    case 'RestElement':
      return getBindingIdentifiersFromLHS(node.argument);

    default:
      return [];
  }
}
