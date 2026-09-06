import type { CycleReport, Franchise, NodeId, OrderingTrack } from "./types.js";
import { trackEdgesFor } from "./topo-sort.js";

interface EdgeLookupEntry {
  edgeId: string;
  to: NodeId;
}

/**
 * Given the set of nodes that a stalled Kahn's-algorithm run could not
 * place (the "residual" set — every node implicated in one or more
 * cycles), finds concrete cycles by DFS restricted to that residual
 * subgraph on the given track.
 *
 * This uses a simple repeated find-a-cycle / remove-its-nodes / repeat
 * strategy rather than a full Tarjan's SCC decomposition. That is
 * sufficient (and easier to produce human-readable output from) at the
 * scale of hand-authored fixture graphs.
 */
export function detectCycles(
  franchise: Franchise,
  track: OrderingTrack,
  residualNodes: NodeId[],
): CycleReport[] {
  const residualSet = new Set(residualNodes);
  const trackEdges = trackEdgesFor(franchise, track);

  const adjacency = new Map<NodeId, EdgeLookupEntry[]>();
  for (const nodeId of residualSet) {
    adjacency.set(nodeId, []);
  }
  for (const edge of trackEdges) {
    if (residualSet.has(edge.from) && residualSet.has(edge.to)) {
      adjacency.get(edge.from)?.push({ edgeId: edge.id, to: edge.to });
    }
  }

  const reports: CycleReport[] = [];
  const active = new Set(residualSet);

  while (active.size > 0) {
    const cycle = findOneCycle(active, adjacency);
    if (!cycle) {
      // No more cycles among the remaining active nodes; anything left is
      // residual only because it depends transitively on a cycle we've
      // already reported, not because it's part of an independent cycle.
      break;
    }

    reports.push(buildReport(cycle, track));

    for (const nodeId of cycle.nodeWalk.slice(0, -1)) {
      active.delete(nodeId);
    }
  }

  return reports;
}

interface CycleWalk {
  /** e.g. [a, b, c, a] — first and last entries are the same node. */
  nodeWalk: NodeId[];
  edgeIds: string[];
}

function findOneCycle(
  active: Set<NodeId>,
  adjacency: Map<NodeId, EdgeLookupEntry[]>,
): CycleWalk | null {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<NodeId, number>();
  for (const nodeId of active) color.set(nodeId, WHITE);

  const pathNodes: NodeId[] = [];
  const pathEdgeIds: string[] = [];

  function dfs(node: NodeId): CycleWalk | null {
    color.set(node, GRAY);
    pathNodes.push(node);

    for (const { edgeId, to } of adjacency.get(node) ?? []) {
      if (!active.has(to)) continue;
      const toColor = color.get(to) ?? WHITE;

      if (toColor === GRAY) {
        // Found the back-edge that closes the cycle.
        const cycleStart = pathNodes.indexOf(to);
        const nodeWalk = [...pathNodes.slice(cycleStart), to];
        const edgeIds = [...pathEdgeIds.slice(cycleStart), edgeId];
        return { nodeWalk, edgeIds };
      }
      if (toColor === WHITE) {
        pathEdgeIds.push(edgeId);
        const found = dfs(to);
        if (found) return found;
        pathEdgeIds.pop();
      }
    }

    color.set(node, BLACK);
    pathNodes.pop();
    return null;
  }

  for (const nodeId of active) {
    if (color.get(nodeId) === WHITE) {
      const found = dfs(nodeId);
      if (found) return found;
    }
  }
  return null;
}

function buildReport(cycle: CycleWalk, track: OrderingTrack): CycleReport {
  const description = `${cycle.nodeWalk.join(" -> ")} (${track} track)`;
  return {
    cycleNodes: cycle.nodeWalk,
    implicatedEdgeIds: cycle.edgeIds,
    track,
    description,
  };
}
