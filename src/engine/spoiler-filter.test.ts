import { describe, expect, it } from "vitest";
import { filterSpoilers } from "./spoiler-filter.js";
import type { ConsumptionEdge, ConsumptionNode, Franchise, NodeId } from "./types.js";

function node(id: string): ConsumptionNode {
  return { id, franchiseId: "test", title: id, kind: "tv" };
}

function edge(
  id: string,
  from: string,
  to: string,
  strength: ConsumptionEdge["strength"] = "required",
): ConsumptionEdge {
  return { id, from, to, relation: "sequel", strength, tracks: ["chronological"] };
}

/**
 * Computes the full transitive predecessor closure of `nodeId` (via ALL
 * edges on `track`, regardless of strength) for use in the invariant
 * assertion below.
 */
function predecessorClosure(franchise: Franchise, nodeId: NodeId): Set<NodeId> {
  const preds = new Map<NodeId, NodeId[]>();
  for (const n of franchise.nodes) preds.set(n.id, []);
  for (const e of franchise.edges) preds.get(e.to)?.push(e.from);

  const closure = new Set<NodeId>();
  const stack = [...(preds.get(nodeId) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined || closure.has(current)) continue;
    closure.add(current);
    stack.push(...(preds.get(current) ?? []));
  }
  return closure;
}

describe("filterSpoilers", () => {
  // Deep prerequisite chain: a -> b -> c -> d -> e, with one extra
  // "recommended" branch f -> c to prove recommended edges gate too.
  const franchise: Franchise = {
    id: "test",
    name: "Test",
    nodes: ["a", "b", "c", "d", "e", "f"].map(node),
    edges: [
      edge("e-ab", "a", "b"),
      edge("e-bc", "b", "c"),
      edge("e-cd", "c", "d"),
      edge("e-de", "d", "e"),
      edge("e-fc", "f", "c", "recommended"),
    ],
  };
  const order = ["a", "b", "c", "d", "e", "f"];

  it("satisfies the reveal invariant: no returned node has an unseen predecessor", () => {
    const seen = new Set(["a", "b"]);
    const revealed = filterSpoilers(franchise, "chronological", order, seen);

    for (const revealedNode of revealed) {
      const closure = predecessorClosure(franchise, revealedNode);
      for (const ancestor of closure) {
        expect(seen.has(ancestor) || revealed.includes(ancestor) || seen.has(revealedNode)).toBe(
          true,
        );
        // Stronger: every ancestor must actually be in the seen set.
        expect(seen.has(ancestor)).toBe(true);
      }
    }
  });

  it("gates reveal on recommended-edge predecessors too, not just required", () => {
    // a, b seen; f (recommended predecessor of c) NOT seen -> c must stay hidden.
    const seen = new Set(["a", "b"]);
    const revealed = filterSpoilers(franchise, "chronological", order, seen);

    expect(revealed).not.toContain("c");
    expect(revealed).not.toContain("d");
    expect(revealed).not.toContain("e");
    expect(revealed).toContain("a");
    expect(revealed).toContain("b");

    // Once f is also seen, c becomes revealable (its full ancestor closure
    // {a, b, f} is now a subset of seen) — but d/e still require c itself
    // to be SEEN (not merely "revealed"), since the closure check is
    // against the literal seenNodeIds set, not an accumulated reveal set.
    const seenWithF = new Set(["a", "b", "f"]);
    const revealedWithF = filterSpoilers(franchise, "chronological", order, seenWithF);
    expect(revealedWithF).toContain("c");
    expect(revealedWithF).not.toContain("d");
    expect(revealedWithF).not.toContain("e");

    // Once c is also actually seen, d (and then e) become revealable too.
    const seenWithC = new Set(["a", "b", "f", "c"]);
    const revealedWithC = filterSpoilers(franchise, "chronological", order, seenWithC);
    expect(revealedWithC).toContain("d");
    expect(revealedWithC).not.toContain("e");
  });

  it("reveals everything when the whole franchise has been seen", () => {
    const seen = new Set(order);
    const revealed = filterSpoilers(franchise, "chronological", order, seen);
    expect(revealed.sort()).toEqual([...order].sort());
  });

  it("omits unrevealed nodes entirely rather than using a placeholder", () => {
    const seen = new Set<string>();
    const revealed = filterSpoilers(franchise, "chronological", order, seen);
    // Nothing seen: "a" and "f" both have no predecessors at all, so both
    // are vacuously safe to reveal; everything downstream of either is not.
    expect(revealed).toEqual(["a", "f"]);
  });
});
