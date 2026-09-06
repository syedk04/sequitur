import { beforeEach, describe, expect, it, vi } from "vitest";
import { crawl } from "./crawl.js";
import type { AniListMedia, AniListRelationEdge } from "./types.js";

const state = vi.hoisted(() => {
  const graph: Record<number, AniListMedia> = {};
  return { graph };
});

vi.mock("./client.js", () => ({
  fetchMediaByIds: vi.fn((ids: number[]) =>
    Promise.resolve(
      ids
        .map((id) => state.graph[id])
        .filter((m): m is AniListMedia => m !== undefined),
    ),
  ),
}));

vi.mock("./cache.js", () => ({
  getCached: vi.fn(() => Promise.resolve(null)),
  setCached: vi.fn(() => Promise.resolve()),
}));

function relTo(relationType: AniListRelationEdge["relationType"], id: number): AniListRelationEdge {
  return {
    relationType,
    node: {
      id,
      type: "ANIME",
      format: "TV",
      title: { romaji: `Media ${id}`, english: null, native: null },
      startDate: { year: 2020, month: 1, day: 1 },
      episodes: 12,
    },
  };
}

function media(id: number, relations: AniListRelationEdge[] = []): AniListMedia {
  return {
    id,
    type: "ANIME",
    format: "TV",
    title: { romaji: `Media ${id}`, english: `Media ${id} EN`, native: null },
    startDate: { year: 2020, month: 1, day: 1 },
    episodes: 12,
    relations: { edges: relations },
  };
}

beforeEach(() => {
  state.graph = {};
});

describe("crawl", () => {
  it("crawls a small linear chain completely, with no truncation", async () => {
    state.graph = {
      1: media(1, [relTo("SEQUEL", 2)]),
      2: media(2, []),
    };

    const franchise = await crawl(1);

    expect(franchise.truncated).toBe(false);
    expect(franchise.nodes.map((n) => n.anilistId).sort()).toEqual([1, 2]);
    expect(franchise.edges).toHaveLength(1);
    expect(franchise.edges[0]).toMatchObject({
      from: "anilist-1",
      to: "anilist-2",
      relation: "sequel",
    });
    expect(franchise.source).toBe("anilist-generated");
    expect(franchise.id).toBe("anilist-1");
    expect(typeof franchise.generatedAt).toBe("string");
  });

  it("sets truncated: true when a graph exceeds maxNodes, and drops dangling edges", async () => {
    state.graph = {
      1: media(1, [relTo("SEQUEL", 2)]),
      2: media(2, [relTo("SEQUEL", 3)]),
      3: media(3, [relTo("SEQUEL", 4)]),
      4: media(4, [relTo("SEQUEL", 5)]),
      5: media(5, []),
    };

    const franchise = await crawl(1, { maxNodes: 3 });

    expect(franchise.truncated).toBe(true);
    expect(franchise.nodes).toHaveLength(3);
    const survivingIds = new Set(franchise.nodes.map((n) => n.anilistId));
    expect(survivingIds).toEqual(new Set([1, 2, 3]));

    // Every edge's endpoints must exist among the surviving nodes — no
    // dangling edge into the un-crawled id 4.
    const nodeIds = new Set(franchise.nodes.map((n) => n.id));
    for (const edge of franchise.edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
    expect(franchise.edges.some((e) => e.to === "anilist-4")).toBe(false);
  });

  it("prioritizes a mainline SEQUEL chain over side-story content globally, even across BFS depth levels (regression: verified live against real AniList data — Mobile Suit Gundam id 80's SEQUEL chain to Char's Counterattack, id 87, three hops deep, was previously dropped by a tight node cap in favor of several shallower SIDE_STORY entries)", async () => {
    // Shape: root has 1 SEQUEL (a 3-hop chain: 1 -> 2 -> 3 -> 4) plus 5
    // SIDE_STORY branches, each one hop deep. A naive level-by-level BFS
    // with only per-level sorting would admit node 2 (priority 0) first,
    // but then fill the rest of a tight budget with the depth-1 side
    // stories (10-14) before ever reaching node 3/4 deeper in the sequel
    // chain — global best-first ordering must still finish the sequel
    // spine first regardless of relative depth.
    state.graph = {
      1: media(1, [
        relTo("SEQUEL", 2),
        relTo("SIDE_STORY", 10),
        relTo("SIDE_STORY", 11),
        relTo("SIDE_STORY", 12),
        relTo("SIDE_STORY", 13),
        relTo("SIDE_STORY", 14),
      ]),
      2: media(2, [relTo("SEQUEL", 3)]),
      3: media(3, [relTo("SEQUEL", 4)]),
      4: media(4, []),
      10: media(10, []),
      11: media(11, []),
      12: media(12, []),
      13: media(13, []),
      14: media(14, []),
    };

    const franchise = await crawl(1, { maxNodes: 4, maxDepth: 8 });

    const survivingIds = new Set(franchise.nodes.map((n) => n.anilistId));
    // The full sequel spine (1 -> 2 -> 3 -> 4) must survive a 4-node cap
    // even though it spans depths 0-3 and five shallower side stories at
    // depth 1 were also candidates.
    expect(survivingIds).toEqual(new Set([1, 2, 3, 4]));
    expect(franchise.truncated).toBe(true);
  });

  it("dedups diamond-shaped relations (two paths converging on the same id)", async () => {
    state.graph = {
      1: media(1, [relTo("SEQUEL", 2), relTo("SIDE_STORY", 3)]),
      2: media(2, [relTo("SEQUEL", 4)]),
      3: media(3, [relTo("SIDE_STORY", 4)]),
      4: media(4, []),
    };

    const franchise = await crawl(1);

    expect(franchise.truncated).toBe(false);
    const anilistIds = franchise.nodes.map((n) => n.anilistId).sort();
    expect(anilistIds).toEqual([1, 2, 3, 4]);
    // Node 4 must appear exactly once despite being reachable via two paths.
    expect(franchise.nodes.filter((n) => n.anilistId === 4)).toHaveLength(1);

    expect(franchise.edges).toHaveLength(4);
    expect(franchise.edges.map((e) => `${e.from}->${e.to}`).sort()).toEqual(
      ["anilist-1->anilist-2", "anilist-1->anilist-3", "anilist-2->anilist-4", "anilist-3->anilist-4"].sort(),
    );
  });

  it("returns a single-node franchise for a root with zero relations", async () => {
    state.graph = {
      1: media(1, []),
    };

    const franchise = await crawl(1);

    expect(franchise.nodes).toHaveLength(1);
    expect(franchise.nodes[0]?.anilistId).toBe(1);
    expect(franchise.edges).toHaveLength(0);
    expect(franchise.truncated).toBe(false);
  });

  it("dedups a relationship declared from both ends (SEQUEL from A + reciprocal PREQUEL from B) into a single edge (regression: verified live against real AniList data, e.g. Bakemonogatari/Nisemonogatari)", async () => {
    state.graph = {
      1: media(1, [relTo("SEQUEL", 2)]),
      2: media(2, [relTo("PREQUEL", 1)]),
    };

    const franchise = await crawl(1);

    expect(franchise.nodes).toHaveLength(2);
    // Without dedup this would be 2 edges: "1 -sequel-> 2" and, after
    // normalize.ts's later prequel-flip, an equivalent-but-redundant
    // "2 -prequel-> 1" -> flipped to "1 -sequel-> 2" again.
    expect(franchise.edges).toHaveLength(1);
    expect(franchise.edges[0]).toMatchObject({
      from: "anilist-1",
      to: "anilist-2",
      relation: "sequel",
    });
  });

  it("sets truncated: true when the depth cap is hit while relations remain unexplored", async () => {
    state.graph = {
      1: media(1, [relTo("SEQUEL", 2)]),
      2: media(2, [relTo("SEQUEL", 3)]),
      3: media(3, []),
    };

    const franchise = await crawl(1, { maxDepth: 1 });

    expect(franchise.truncated).toBe(true);
    // Depth 0 = node 1, depth 1 = node 2; node 3 is beyond the depth cap.
    expect(franchise.nodes.map((n) => n.anilistId).sort()).toEqual([1, 2]);
  });
});
