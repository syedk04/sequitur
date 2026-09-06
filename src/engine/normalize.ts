import type { ConsumptionEdge, Franchise } from "./types.js";

/**
 * Normalizes a raw, hand-authored `Franchise` into the canonical form the
 * rest of the engine assumes:
 *
 *  - `prequel` edges are flipped into `sequel` edges with `from`/`to`
 *    swapped, so downstream algorithms only ever have to reason about one
 *    canonical direction for "is a sequel of" relationships.
 *  - Structural integrity is validated: every edge must reference existing
 *    node ids, and edge ids must be unique. Both are treated as malformed
 *    data and throw immediately with an actionable message.
 *
 * Note: a node pair with edges in *both* directions that share a track
 * (e.g. A -sequel-> B and B -sequel-> A both on "chronological") is a
 * genuine contradiction in the source data, but it is NOT rejected here.
 * That is a graph-shape problem (a 2-cycle) for `cycle-detect.ts` to
 * surface during topological sort, not a data-integrity problem for
 * `normalize.ts` to reject outright.
 */
export function normalizeFranchise(franchise: Franchise): Franchise {
  const nodeIds = new Set(franchise.nodes.map((n) => n.id));

  const seenEdgeIds = new Set<string>();
  for (const edge of franchise.edges) {
    if (seenEdgeIds.has(edge.id)) {
      throw new Error(`Malformed franchise "${franchise.id}": duplicate edge id "${edge.id}".`);
    }
    seenEdgeIds.add(edge.id);

    if (!nodeIds.has(edge.from)) {
      throw new Error(
        `Malformed franchise "${franchise.id}": edge "${edge.id}" references ` +
          `unknown "from" node id "${edge.from}".`,
      );
    }
    if (!nodeIds.has(edge.to)) {
      throw new Error(
        `Malformed franchise "${franchise.id}": edge "${edge.id}" references ` +
          `unknown "to" node id "${edge.to}".`,
      );
    }
    if (edge.tracks.length === 0) {
      throw new Error(
        `Malformed franchise "${franchise.id}": edge "${edge.id}" has an empty ` +
          `"tracks" array, so it would silently be excluded from every ordering. ` +
          `Specify at least one of "release" or "chronological".`,
      );
    }
  }

  const normalizedEdges: ConsumptionEdge[] = franchise.edges.map((edge) => {
    if (edge.relation !== "prequel") {
      return edge;
    }
    return {
      ...edge,
      relation: "sequel",
      from: edge.to,
      to: edge.from,
    };
  });

  return {
    ...franchise,
    edges: normalizedEdges,
  };
}
