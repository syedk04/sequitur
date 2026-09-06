import { describe, expect, it } from "vitest";
import { topoSort } from "./topo-sort.js";
import type { ConsumptionEdge, ConsumptionNode, Franchise } from "./types.js";

function node(id: string, releaseDate?: string): ConsumptionNode {
  return {
    id,
    franchiseId: "test",
    title: id,
    kind: "tv",
    ...(releaseDate ? { releaseDate } : {}),
  };
}

function edge(
  id: string,
  from: string,
  to: string,
  tracks: ConsumptionEdge["tracks"] = ["release", "chronological"],
): ConsumptionEdge {
  return { id, from, to, relation: "sequel", strength: "required", tracks };
}

function franchise(nodes: ConsumptionNode[], edges: ConsumptionEdge[]): Franchise {
  return { id: "test", name: "Test", nodes, edges };
}

describe("topoSort", () => {
  it("produces the exact expected order for a linear chain", () => {
    const f = franchise(
      [node("a"), node("b"), node("c"), node("d")],
      [edge("e1", "a", "b"), edge("e2", "b", "c"), edge("e3", "c", "d")],
    );

    const result = topoSort(f, "chronological");

    expect(result.order).toEqual(["a", "b", "c", "d"]);
    expect(result.residualNodes).toEqual([]);
    expect(result.unconstrainedPairs).toEqual([]);
  });

  it("produces correct unconstrainedPairs for independent parallel branches", () => {
    // a -> b, c -> d : two totally independent chains, no relation between
    // {a, b} and {c, d}.
    const f = franchise(
      [node("a"), node("b"), node("c"), node("d")],
      [edge("e1", "a", "b"), edge("e2", "c", "d")],
    );

    const result = topoSort(f, "chronological");

    expect(result.order).not.toBeNull();
    expect(result.order).toHaveLength(4);

    const pairKeys = new Set(result.unconstrainedPairs.map(([x, y]) => [x, y].sort().join("-")));
    // a and c are simultaneously eligible at the start.
    expect(pairKeys.has("a-c")).toBe(true);
    // a and b should never be unconstrained (direct edge).
    expect(pairKeys.has("a-b")).toBe(false);
    expect(pairKeys.has("c-d")).toBe(false);
  });

  it("is deterministic for the chronological track using input array order as tiebreak", () => {
    // No edges at all: every node is eligible immediately. Chronological
    // tiebreak = original nodes[] array index order.
    const f = franchise([node("z"), node("a"), node("m")], []);

    const result = topoSort(f, "chronological");

    expect(result.order).toEqual(["z", "a", "m"]);
  });

  it("is deterministic for the release track using releaseDate ascending, nulls last", () => {
    const f = franchise(
      [node("no-date"), node("late", "2020-01-01"), node("early", "2000-01-01")],
      [],
    );

    const result = topoSort(f, "release");

    expect(result.order).toEqual(["early", "late", "no-date"]);
  });

  it("includes isolated nodes with no edges", () => {
    const f = franchise([node("a"), node("b"), node("isolated")], [edge("e1", "a", "b")]);

    const result = topoSort(f, "chronological");

    expect(result.order).not.toBeNull();
    expect(result.order).toContain("isolated");
    expect(result.order).toHaveLength(3);
  });

  it("ignores edges not tagged for the requested track", () => {
    const f = franchise([node("a"), node("b")], [edge("e1", "a", "b", ["release"])]);

    const result = topoSort(f, "chronological");

    // No chronological edges at all -> both eligible immediately.
    expect(result.order).toHaveLength(2);
    expect(result.unconstrainedPairs).toEqual([["a", "b"]]);
  });

  it("reports residual nodes and null order when a cycle blocks completion", () => {
    const f = franchise(
      [node("a"), node("b"), node("c")],
      [edge("e1", "a", "b"), edge("e2", "b", "c"), edge("e3", "c", "a")],
    );

    const result = topoSort(f, "chronological");

    expect(result.order).toBeNull();
    expect(result.residualNodes.sort()).toEqual(["a", "b", "c"]);
  });
});
