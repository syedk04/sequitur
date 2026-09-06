import { describe, expect, it } from "vitest";
import { analyzeFranchise } from "./analyze.js";
import { normalizeFranchise } from "./normalize.js";
import { topoSort } from "./topo-sort.js";
import { detectCycles } from "./cycle-detect.js";
import { filterSpoilers } from "./spoiler-filter.js";
import type { ConsumptionEdge, ConsumptionNode, Franchise } from "./types.js";

function node(id: string, extra: Partial<ConsumptionNode> = {}): ConsumptionNode {
  return { id, franchiseId: "test", title: id, kind: "tv", ...extra };
}

function edge(
  id: string,
  from: string,
  to: string,
  extra: Partial<ConsumptionEdge> = {},
): ConsumptionEdge {
  return {
    id,
    from,
    to,
    relation: "sequel",
    strength: "required",
    tracks: ["chronological"],
    ...extra,
  };
}

describe("empty / degenerate franchises", () => {
  it("empty franchise (no nodes, no edges) does not crash", () => {
    const f: Franchise = { id: "empty", name: "Empty", nodes: [], edges: [] };
    const result = analyzeFranchise(f);
    expect(result.tracks).toEqual([]);
    expect(result.divergentPairs).toEqual([]);
    expect(result.contestedEdgeIds).toEqual([]);
  });

  it("single isolated node, no edges at all -> tracks array is EMPTY (node vanishes from analysis)", () => {
    const f: Franchise = { id: "solo", name: "Solo", nodes: [node("a")], edges: [] };
    const result = analyzeFranchise(f);
    // This documents current (possibly surprising) behavior: because no edge
    // exists on either track, tracksPresent is empty, so neither track's
    // order (which per topo-sort.ts SHOULD just be [a]) is ever produced.
    expect(result.tracks).toEqual([]);
  });

  it("franchise with only recommended edges still produces a valid, ordered track", () => {
    const f: Franchise = {
      id: "rec-only",
      name: "RecOnly",
      nodes: [node("a"), node("b")],
      edges: [edge("e1", "a", "b", { strength: "recommended" })],
    };
    const result = analyzeFranchise(f);
    const chrono = result.tracks.find((t) => t.track === "chronological");
    expect(chrono?.isValid).toBe(true);
    expect(chrono?.order).toEqual(["a", "b"]);
  });

  it("edge with EMPTY tracks array is rejected at normalize time, not silently dropped", () => {
    const f: Franchise = {
      id: "no-track",
      name: "NoTrack",
      nodes: [node("a"), node("b")],
      edges: [edge("e1", "a", "b", { tracks: [] })],
    };
    // Previously this silently excluded the edge from every ordering with
    // no signal to the curator; normalize.ts now fails closed and throws.
    expect(() => analyzeFranchise(f)).toThrow(/empty "tracks" array/);
  });
});

describe("self-loops", () => {
  it("self-loop edge produces a cycle report and does not crash/hang", () => {
    const f: Franchise = {
      id: "self-loop",
      name: "SelfLoop",
      nodes: [node("a"), node("b")],
      edges: [edge("e1", "a", "a"), edge("e2", "a", "b")],
    };
    const result = analyzeFranchise(f);
    const chrono = result.tracks.find((t) => t.track === "chronological");
    expect(chrono?.isValid).toBe(false);
    expect(chrono?.cycles.length).toBeGreaterThanOrEqual(1);
    expect(chrono?.cycles[0]?.cycleNodes).toEqual(["a", "a"]);
  });

  it("spoiler-filter: a self-loop node can never be revealed unless pre-seeded", () => {
    const f: Franchise = {
      id: "self-loop-spoiler",
      name: "SelfLoopSpoiler",
      nodes: [node("a"), node("b")],
      edges: [edge("e1", "a", "a"), edge("e2", "a", "b")],
    };
    const revealed = filterSpoilers(f, "chronological", ["a", "b"], new Set());
    // "a" has itself in its own predecessor closure, so it can never satisfy
    // "every ancestor in seenNodeIds" unless it's already seen.
    expect(revealed).toEqual([]);
  });
});

describe("duplicate edges between same pair", () => {
  it("duplicate edges with different strengths/tracks between same pair do not break topo sort", () => {
    const f: Franchise = {
      id: "dup-edges",
      name: "DupEdges",
      nodes: [node("a"), node("b")],
      edges: [
        edge("e1", "a", "b", { strength: "required", tracks: ["chronological"] }),
        edge("e2", "a", "b", { strength: "recommended", tracks: ["release"] }),
        edge("e3", "a", "b", { relation: "side-story", tracks: ["chronological", "release"] }),
      ],
    };
    const result = analyzeFranchise(f);
    for (const t of result.tracks) {
      expect(t.isValid).toBe(true);
      expect(t.order).toEqual(["a", "b"]);
    }
  });

  it("contradictory duplicate edges (A->B and B->A on same track) correctly form a 2-cycle", () => {
    const f: Franchise = {
      id: "contra-dup",
      name: "ContraDup",
      nodes: [node("a"), node("b")],
      edges: [edge("e1", "a", "b"), edge("e2", "b", "a")],
    };
    const result = analyzeFranchise(f);
    const chrono = result.tracks.find((t) => t.track === "chronological");
    expect(chrono?.isValid).toBe(false);
    expect(chrono?.cycles.length).toBe(1);
    expect(new Set(chrono?.cycles[0]?.cycleNodes)).toEqual(new Set(["a", "b"]));
  });
});

describe("deep chains (stack safety)", () => {
  it("500-node linear chain topo-sorts without stack overflow", () => {
    const N = 500;
    const nodes = Array.from({ length: N }, (_, i) => node(`n${i}`));
    const edges = Array.from({ length: N - 1 }, (_, i) => edge(`e${i}`, `n${i}`, `n${i + 1}`));
    const f: Franchise = { id: "chain", name: "Chain", nodes, edges };
    const result = topoSort(f, "chronological");
    expect(result.order).not.toBeNull();
    expect(result.order?.length).toBe(N);
  });

  it("500-node cyclic chain (last points back to first) doesn't crash detectCycles", () => {
    const N = 500;
    const nodes = Array.from({ length: N }, (_, i) => node(`n${i}`));
    const edges = Array.from({ length: N - 1 }, (_, i) => edge(`e${i}`, `n${i}`, `n${i + 1}`));
    edges.push(edge("e-close", `n${N - 1}`, "n0"));
    const f: Franchise = { id: "chain-cycle", name: "ChainCycle", nodes, edges };
    const sortResult = topoSort(f, "chronological");
    expect(sortResult.order).toBeNull();
    const cycles = detectCycles(f, "chronological", sortResult.residualNodes);
    expect(cycles.length).toBe(1);
    expect(cycles[0]?.cycleNodes.length).toBe(N + 1);
  });

  it("deep predecessor chain for spoiler-filter closure (500 nodes) does not stack overflow", () => {
    const N = 500;
    const nodes = Array.from({ length: N }, (_, i) => node(`n${i}`));
    const edges = Array.from({ length: N - 1 }, (_, i) => edge(`e${i}`, `n${i}`, `n${i + 1}`));
    const f: Franchise = { id: "chain-spoiler", name: "ChainSpoiler", nodes, edges };
    const order = nodes.map((n) => n.id);
    const revealed = filterSpoilers(f, "chronological", order, new Set(["n0"]));
    // Only n0 and n1 should be revealed (n1's only predecessor is n0, which is seen).
    expect(revealed).toEqual(["n0", "n1"]);
  });
});

describe("diamond dependency spoiler-filter safety", () => {
  it("does not reveal a merge node when only ONE of two disjoint predecessor paths is seen", () => {
    // a -> c, b -> c  (c depends on BOTH a and b)
    const f: Franchise = {
      id: "diamond",
      name: "Diamond",
      nodes: [node("a"), node("b"), node("c")],
      edges: [edge("e1", "a", "c"), edge("e2", "b", "c")],
    };
    const revealed = filterSpoilers(f, "chronological", ["a", "b", "c"], new Set(["a"]));
    expect(revealed).toEqual(["a", "b"]);
    expect(revealed).not.toContain("c");
  });

  it("reveals the merge node only once BOTH disjoint paths are fully seen", () => {
    const f: Franchise = {
      id: "diamond2",
      name: "Diamond2",
      nodes: [node("a"), node("b"), node("c")],
      edges: [edge("e1", "a", "c"), edge("e2", "b", "c")],
    };
    const revealed = filterSpoilers(f, "chronological", ["a", "b", "c"], new Set(["a", "b"]));
    expect(revealed).toEqual(["a", "b", "c"]);
  });

  it("seen set containing ids not in the franchise does not crash and has no unintended effect", () => {
    const f: Franchise = {
      id: "bogus-seen",
      name: "BogusSeen",
      nodes: [node("a"), node("b")],
      edges: [edge("e1", "a", "b")],
    };
    const revealed = filterSpoilers(
      f,
      "chronological",
      ["a", "b"],
      new Set(["ghost-node-id", "another-bogus-id"]),
    );
    // "a" has no predecessors so it is trivially revealed regardless of
    // seen set; "b" depends on "a" which is not seen, so it stays hidden.
    expect(revealed).toEqual(["a"]);
  });

  it("empty seen set + franchise with no edges reveals everything (nothing has unsatisfied ancestors)", () => {
    const f: Franchise = {
      id: "no-edges",
      name: "NoEdges",
      nodes: [node("a"), node("b"), node("c")],
      edges: [],
    };
    const revealed = filterSpoilers(f, "chronological", ["a", "b", "c"], new Set());
    expect(revealed).toEqual(["a", "b", "c"]);
  });

  it("order array containing an id not present in franchise.nodes at all does not crash", () => {
    const f: Franchise = {
      id: "ghost-order",
      name: "GhostOrder",
      nodes: [node("a")],
      edges: [],
    };
    // "a" seen, plus a bogus id injected into the order list (e.g. stale data)
    const revealed = filterSpoilers(f, "chronological", ["a", "ghost"], new Set());
    // A node absent from the franchise has no verifiable predecessor
    // closure, so it now fails closed (excluded) rather than being
    // revealed by default via an empty closure.
    expect(revealed).toEqual(["a"]);
  });
});

describe("contested-only edges", () => {
  it("node connected only via a contested edge is still ordered correctly and edge id surfaced", () => {
    const f: Franchise = {
      id: "contested-only",
      name: "ContestedOnly",
      nodes: [node("a"), node("b")],
      edges: [
        edge("e1", "a", "b", {
          contested: { reason: "fans disagree" },
        }),
      ],
    };
    const result = analyzeFranchise(f);
    expect(result.contestedEdgeIds).toEqual(["e1"]);
    const chrono = result.tracks.find((t) => t.track === "chronological");
    expect(chrono?.order).toEqual(["a", "b"]);
  });
});

describe("normalize.ts validation", () => {
  it("throws on dangling 'from' reference", () => {
    const f: Franchise = {
      id: "dangling-from",
      name: "DanglingFrom",
      nodes: [node("b")],
      edges: [edge("e1", "ghost", "b")],
    };
    expect(() => normalizeFranchise(f)).toThrow(/unknown "from"/);
  });

  it("throws on dangling 'to' reference", () => {
    const f: Franchise = {
      id: "dangling-to",
      name: "DanglingTo",
      nodes: [node("a")],
      edges: [edge("e1", "a", "ghost")],
    };
    expect(() => normalizeFranchise(f)).toThrow(/unknown "to"/);
  });

  it("throws on duplicate edge id", () => {
    const f: Franchise = {
      id: "dup-id",
      name: "DupId",
      nodes: [node("a"), node("b"), node("c")],
      edges: [edge("e1", "a", "b"), edge("e1", "b", "c")],
    };
    expect(() => normalizeFranchise(f)).toThrow(/duplicate edge id/);
  });

  it("flips prequel edges correctly (from/to swap + relation change)", () => {
    const f: Franchise = {
      id: "prequel-flip",
      name: "PrequelFlip",
      nodes: [node("later"), node("earlier")],
      edges: [edge("e1", "later", "earlier", { relation: "prequel" })],
    };
    const normalized = normalizeFranchise(f);
    const flipped = normalized.edges[0];
    expect(flipped?.relation).toBe("sequel");
    expect(flipped?.from).toBe("earlier");
    expect(flipped?.to).toBe("later");
  });

  it("self-loop prequel edge flips to a self-loop sequel edge (still a=a, not rejected)", () => {
    const f: Franchise = {
      id: "prequel-self",
      name: "PrequelSelf",
      nodes: [node("a")],
      edges: [edge("e1", "a", "a", { relation: "prequel" })],
    };
    const normalized = normalizeFranchise(f);
    expect(normalized.edges[0]?.from).toBe("a");
    expect(normalized.edges[0]?.to).toBe("a");
  });
});

describe("divergence: unconstrained-pair interaction", () => {
  it("nodes unconstrained on ONE track but ordered on the other are not spuriously flagged divergent", () => {
    // a,b unconstrained on release (isolated, no release edges between them)
    // but ordered a->b on chronological.
    const f: Franchise = {
      id: "partial-unconstrained",
      name: "PartialUnconstrained",
      nodes: [node("a"), node("b")],
      edges: [
        edge("e1", "a", "b", { tracks: ["chronological"] }),
        // give both tracks at least one edge so both appear
        edge("e2", "a", "b", { tracks: ["release"], relation: "side-story" }),
      ],
    };
    const result = analyzeFranchise(f);
    expect(result.divergentPairs).toEqual([]);
  });
});

describe("large-scale unconstrained pairs (quadratic blowup check)", () => {
  it("100 fully-isolated nodes on one track do not crash/hang (10000 unconstrained pairs)", () => {
    const N = 100;
    const nodes = Array.from({ length: N }, (_, i) => node(`n${i}`));
    const oneEdge = [edge("e0", "n0", "n1")];
    const f: Franchise = { id: "wide", name: "Wide", nodes, edges: oneEdge };
    const result = topoSort(f, "chronological");
    expect(result.order?.length).toBe(N);
    expect(result.unconstrainedPairs.length).toBeGreaterThan(0);
  });
});

describe("release-track date tie-break vs required edge ordering", () => {
  it("required edge ordering wins over release-date tie/reverse-date ties", () => {
    // b has an EARLIER release date than a, but a required edge says a must
    // come before b. The topo sort must respect the edge, not the date.
    const f: Franchise = {
      id: "date-vs-edge",
      name: "DateVsEdge",
      nodes: [
        node("a", { releaseDate: "2020-01-01" }),
        node("b", { releaseDate: "2010-01-01" }),
      ],
      edges: [edge("e1", "a", "b", { tracks: ["release"] })],
    };
    const result = topoSort(f, "release");
    expect(result.order).toEqual(["a", "b"]);
  });

  it("identical release dates + no edge between them are reported unconstrained, not silently ordered by date-tiebreak", () => {
    const f: Franchise = {
      id: "same-date",
      name: "SameDate",
      nodes: [
        node("a", { releaseDate: "2020-01-01" }),
        node("b", { releaseDate: "2020-01-01" }),
        node("c"),
      ],
      edges: [edge("e1", "c", "a", { tracks: ["release"] }), edge("e2", "c", "b", { tracks: ["release"] })],
    };
    const result = topoSort(f, "release");
    const flagged = result.unconstrainedPairs.some(
      ([x, y]) => (x === "a" && y === "b") || (x === "b" && y === "a"),
    );
    expect(flagged).toBe(true);
  });
});
