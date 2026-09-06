import { describe, expect, it } from "vitest";
import { detectCycles } from "./cycle-detect.js";
import { topoSort } from "./topo-sort.js";
import type { ConsumptionEdge, ConsumptionNode, Franchise } from "./types.js";

function node(id: string): ConsumptionNode {
  return { id, franchiseId: "test", title: id, kind: "tv" };
}

function edge(id: string, from: string, to: string): ConsumptionEdge {
  return {
    id,
    from,
    to,
    relation: "sequel",
    strength: "required",
    tracks: ["chronological"],
  };
}

function franchise(nodes: ConsumptionNode[], edges: ConsumptionEdge[]): Franchise {
  return { id: "test", name: "Test", nodes, edges };
}

describe("detectCycles", () => {
  it("detects a simple 3-node cycle with correct cycleNodes and implicatedEdgeIds", () => {
    const f = franchise(
      [node("a"), node("b"), node("c")],
      [edge("e-ab", "a", "b"), edge("e-bc", "b", "c"), edge("e-ca", "c", "a")],
    );

    const stalled = topoSort(f, "chronological");
    expect(stalled.order).toBeNull();

    const cycles = detectCycles(f, "chronological", stalled.residualNodes);

    expect(cycles).toHaveLength(1);
    const cycle = cycles[0];
    expect(cycle).toBeDefined();
    if (!cycle) return;

    // The walk should start and end on the same node and visit all 3.
    expect(cycle.cycleNodes[0]).toBe(cycle.cycleNodes[cycle.cycleNodes.length - 1]);
    expect(new Set(cycle.cycleNodes)).toEqual(new Set(["a", "b", "c"]));
    expect(cycle.implicatedEdgeIds.sort()).toEqual(["e-ab", "e-bc", "e-ca"].sort());
    expect(cycle.track).toBe("chronological");
    expect(cycle.description).toContain("chronological track");
  });

  it("only flags the cycle when a valid separate component also exists", () => {
    const f = franchise(
      [node("a"), node("b"), node("c"), node("x"), node("y")],
      [
        edge("e-ab", "a", "b"),
        edge("e-bc", "b", "c"),
        edge("e-ca", "c", "a"),
        edge("e-xy", "x", "y"),
      ],
    );

    const stalled = topoSort(f, "chronological");
    expect(stalled.order).toBeNull();
    expect(stalled.residualNodes.sort()).toEqual(["a", "b", "c"]);

    const cycles = detectCycles(f, "chronological", stalled.residualNodes);

    expect(cycles).toHaveLength(1);
    expect(new Set(cycles[0]?.cycleNodes)).toEqual(new Set(["a", "b", "c"]));
  });

  it("reports multiple independent cycles separately", () => {
    const f = franchise(
      [node("a"), node("b"), node("c"), node("x"), node("y"), node("z")],
      [
        edge("e-ab", "a", "b"),
        edge("e-ba", "b", "a"),
        edge("e-xy", "x", "y"),
        edge("e-yz", "y", "z"),
        edge("e-zx", "z", "x"),
      ],
    );

    const stalled = topoSort(f, "chronological");
    expect(stalled.order).toBeNull();

    const cycles = detectCycles(f, "chronological", stalled.residualNodes);

    expect(cycles).toHaveLength(2);
    const nodeSets = cycles.map((c) => new Set(c.cycleNodes));
    expect(nodeSets.some((s) => s.size === 2 && s.has("a") && s.has("b"))).toBe(true);
    expect(nodeSets.some((s) => s.size === 3 && s.has("x") && s.has("y") && s.has("z"))).toBe(true);
  });
});
