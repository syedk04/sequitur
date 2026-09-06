import type { Franchise, NodeId, OrderingTrack } from "./types.js";

/**
 * Filters `order` down to the nodes that are safe to reveal given
 * `seenNodeIds`.
 *
 * A node is revealed iff:
 *   - it is already in `seenNodeIds`, OR
 *   - every node in its transitive predecessor closure on `track`
 *     (following ALL edges regardless of `strength` — both "required" and
 *     "recommended" edges are spoiler-relevant; strength only affects
 *     "must watch" status, not spoiler safety) is itself in
 *     `seenNodeIds`.
 *
 * Unrevealed nodes are omitted entirely from the result (no placeholder
 * entries) — this is a documented v1 decision, not a bug.
 */
export function filterSpoilers(
  franchise: Franchise,
  track: OrderingTrack,
  order: NodeId[],
  seenNodeIds: Set<NodeId>,
): NodeId[] {
  const knownNodeIds = new Set(franchise.nodes.map((node) => node.id));

  const predecessors = new Map<NodeId, NodeId[]>();
  for (const node of franchise.nodes) {
    predecessors.set(node.id, []);
  }
  for (const edge of franchise.edges) {
    if (!edge.tracks.includes(track)) continue;
    predecessors.get(edge.to)?.push(edge.from);
  }

  const closureCache = new Map<NodeId, Set<NodeId>>();

  function transitivePredecessorClosure(nodeId: NodeId): Set<NodeId> {
    const cached = closureCache.get(nodeId);
    if (cached) return cached;

    const closure = new Set<NodeId>();
    const stack = [...(predecessors.get(nodeId) ?? [])];
    const visited = new Set<NodeId>();

    while (stack.length > 0) {
      const current = stack.pop();
      if (current === undefined || visited.has(current)) continue;
      visited.add(current);
      closure.add(current);
      for (const pred of predecessors.get(current) ?? []) {
        if (!visited.has(pred)) {
          stack.push(pred);
        }
      }
    }

    closureCache.set(nodeId, closure);
    return closure;
  }

  function isRevealed(nodeId: NodeId): boolean {
    if (seenNodeIds.has(nodeId)) return true;
    // A node not present in this franchise has no verifiable predecessor
    // closure — fail closed (treat as unrevealed) rather than defaulting to
    // an empty closure, which would reveal it unconditionally.
    if (!knownNodeIds.has(nodeId)) return false;
    const closure = transitivePredecessorClosure(nodeId);
    for (const ancestor of closure) {
      if (!seenNodeIds.has(ancestor)) return false;
    }
    return true;
  }

  return order.filter((nodeId) => isRevealed(nodeId));
}
