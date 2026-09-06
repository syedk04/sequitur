import { describe, expect, it } from "vitest";
import {
  franchiseIdForRoot,
  mapFormatToKind,
  mapStartDate,
  nodeIdForAnilistId,
  RELATION_RULES,
  shouldTraverse,
  toEdge,
  toNode,
} from "./mapper.js";
import type { AniListMedia, AniListMediaRelation, AniListRelatedMediaNode } from "./types.js";

function relatedNode(overrides: Partial<AniListRelatedMediaNode> = {}): AniListRelatedMediaNode {
  return {
    id: 999,
    type: "ANIME",
    format: "TV",
    title: { romaji: "Related Romaji", english: "Related English", native: "Related Native" },
    startDate: { year: 2020, month: 1, day: 1 },
    episodes: 12,
    ...overrides,
  };
}

function media(overrides: Partial<AniListMedia> = {}): AniListMedia {
  return {
    id: 1,
    type: "ANIME",
    format: "TV",
    title: { romaji: "Root Romaji", english: "Root English", native: "Root Native" },
    startDate: { year: 2010, month: 4, day: 7 },
    episodes: 25,
    ...overrides,
  };
}

describe("mapStartDate", () => {
  it("maps a full date to ISO", () => {
    expect(mapStartDate({ year: 2013, month: 6, day: 27 })).toBe("2013-06-27");
  });

  it("pads a year+month-only date to day 01", () => {
    expect(mapStartDate({ year: 2013, month: 6, day: null })).toBe("2013-06-01");
  });

  it("pads a year-only date to month/day 01", () => {
    expect(mapStartDate({ year: 2013, month: null, day: null })).toBe("2013-01-01");
  });

  it("returns undefined for a null year (unaired/unknown)", () => {
    expect(mapStartDate({ year: null, month: null, day: null })).toBeUndefined();
  });

  it("returns undefined for a null/undefined date object without throwing", () => {
    expect(mapStartDate(null)).toBeUndefined();
    expect(mapStartDate(undefined)).toBeUndefined();
  });
});

describe("mapFormatToKind", () => {
  it("maps standard formats", () => {
    expect(mapFormatToKind("TV")).toBe("tv");
    expect(mapFormatToKind("MOVIE")).toBe("movie");
    expect(mapFormatToKind("OVA")).toBe("ova");
    expect(mapFormatToKind("ONA")).toBe("ona");
    expect(mapFormatToKind("SPECIAL")).toBe("special");
  });

  it("maps TV_SHORT to tv", () => {
    expect(mapFormatToKind("TV_SHORT")).toBe("tv");
  });

  it("returns null for MUSIC (skipped, not real content)", () => {
    expect(mapFormatToKind("MUSIC")).toBeNull();
  });

  it("returns null for a null format", () => {
    expect(mapFormatToKind(null)).toBeNull();
  });
});

describe("toNode", () => {
  it("maps a standard ANIME/TV media to a ConsumptionNode with anilistId and episodeCount", () => {
    const node = toNode(media(), "anilist-1");
    expect(node).not.toBeNull();
    expect(node?.id).toBe("anilist-1");
    expect(node?.franchiseId).toBe("anilist-1");
    expect(node?.anilistId).toBe(1);
    expect(node?.kind).toBe("tv");
    expect(node?.title).toBe("Root English");
    expect(node?.releaseDate).toBe("2010-04-07");
    expect(node?.episodeCount).toBe(25);
  });

  it("falls back through title variants when english is missing", () => {
    const node = toNode(
      media({ title: { romaji: "Only Romaji", english: null, native: "Only Native" } }),
      "anilist-1",
    );
    expect(node?.title).toBe("Only Romaji");
  });

  it("returns null for non-ANIME-typed media", () => {
    expect(toNode(media({ type: "MANGA" }), "anilist-1")).toBeNull();
  });

  it("returns null for MUSIC-format entries", () => {
    expect(toNode(media({ format: "MUSIC" }), "anilist-1")).toBeNull();
  });

  it("leaves releaseDate undefined for a null start date without throwing", () => {
    const node = toNode(media({ startDate: null }), "anilist-1");
    expect(node?.releaseDate).toBeUndefined();
  });

  it("leaves releaseDate undefined for a null-year start date", () => {
    const node = toNode(media({ startDate: { year: null, month: null, day: null } }), "anilist-1");
    expect(node?.releaseDate).toBeUndefined();
  });

  it("omits episodeCount when episodes is null", () => {
    const node = toNode(media({ episodes: null }), "anilist-1");
    expect(node?.episodeCount).toBeUndefined();
  });

  it("works on the lighter AniListRelatedMediaNode shape too", () => {
    const node = toNode(relatedNode(), "anilist-1");
    expect(node?.id).toBe("anilist-999");
    expect(node?.anilistId).toBe(999);
  });
});

describe("nodeIdForAnilistId / franchiseIdForRoot", () => {
  it("produces a stable, collision-free node id scheme", () => {
    expect(nodeIdForAnilistId(12345)).toBe("anilist-12345");
  });

  it("produces a stable franchise id keyed by root media id", () => {
    expect(franchiseIdForRoot(1)).toBe("anilist-1");
  });
});

describe("relation table: traverse/include behavior per relation type", () => {
  const cases: {
    relation: AniListMediaRelation;
    traverse: boolean;
    included: boolean;
    mapped?: string;
  }[] = [
    { relation: "SEQUEL", traverse: true, included: true, mapped: "sequel" },
    { relation: "PREQUEL", traverse: true, included: true, mapped: "prequel" },
    { relation: "SIDE_STORY", traverse: true, included: true, mapped: "side-story" },
    { relation: "SPIN_OFF", traverse: true, included: true, mapped: "spinoff" },
    { relation: "ALTERNATIVE", traverse: false, included: true, mapped: "shared-universe" },
    { relation: "SUMMARY", traverse: false, included: true, mapped: "shared-universe" },
    { relation: "ADAPTATION", traverse: false, included: false },
    { relation: "PARENT", traverse: false, included: false },
    { relation: "CHARACTER", traverse: false, included: false },
    { relation: "OTHER", traverse: false, included: true, mapped: "shared-universe" },
    { relation: "COMPILATION", traverse: false, included: false },
    { relation: "CONTAINS", traverse: false, included: false },
  ];

  for (const c of cases) {
    it(`${c.relation}: traverse=${c.traverse}, included=${c.included}`, () => {
      const relEdge = { relationType: c.relation, node: relatedNode() };
      expect(shouldTraverse(relEdge)).toBe(c.traverse);
      const edge = toEdge(1, relEdge);
      if (c.included) {
        expect(edge).not.toBeNull();
        expect(edge?.relation).toBe(c.mapped);
        expect(edge?.from).toBe("anilist-1");
        expect(edge?.to).toBe("anilist-999");
      } else {
        expect(edge).toBeNull();
      }
    });
  }

  it("SEQUEL/PREQUEL/required relations use strength 'required'", () => {
    expect(RELATION_RULES.SEQUEL.strength).toBe("required");
    expect(RELATION_RULES.PREQUEL.strength).toBe("required");
  });

  it("SIDE_STORY/SPIN_OFF/ALTERNATIVE/SUMMARY/OTHER use strength 'recommended'", () => {
    expect(RELATION_RULES.SIDE_STORY.strength).toBe("recommended");
    expect(RELATION_RULES.SPIN_OFF.strength).toBe("recommended");
    expect(RELATION_RULES.ALTERNATIVE.strength).toBe("recommended");
    expect(RELATION_RULES.SUMMARY.strength).toBe("recommended");
    expect(RELATION_RULES.OTHER.strength).toBe("recommended");
  });

  it("every included relation tracks only 'release'", () => {
    for (const rule of Object.values(RELATION_RULES)) {
      if (rule.include) {
        expect(rule.tracks).toEqual(["release"]);
      }
    }
  });
});

describe("SOURCE relation and other unrecognized relation types (regression: real AniList responses include SOURCE, which the initial spec omitted)", () => {
  it("SOURCE never crashes shouldTraverse/toEdge and is excluded like ADAPTATION", () => {
    const relEdge = { relationType: "SOURCE" as AniListMediaRelation, node: relatedNode() };
    expect(() => shouldTraverse(relEdge)).not.toThrow();
    expect(shouldTraverse(relEdge)).toBe(false);
    expect(toEdge(1, relEdge)).toBeNull();
  });

  it("a relation type entirely absent from RELATION_RULES falls back to excluded rather than throwing", () => {
    const relEdge = {
      relationType: "SOME_FUTURE_RELATION_TYPE" as AniListMediaRelation,
      node: relatedNode(),
    };
    expect(() => shouldTraverse(relEdge)).not.toThrow();
    expect(shouldTraverse(relEdge)).toBe(false);
    expect(() => toEdge(1, relEdge)).not.toThrow();
    expect(toEdge(1, relEdge)).toBeNull();
  });
});

describe("non-ANIME-typed related entries", () => {
  it("are never traversed, regardless of relation type", () => {
    const relEdge = { relationType: "SEQUEL" as const, node: relatedNode({ type: "MANGA" }) };
    expect(shouldTraverse(relEdge)).toBe(false);
  });

  it("never produce an edge, regardless of relation type", () => {
    const relEdge = { relationType: "SEQUEL" as const, node: relatedNode({ type: "MANGA" }) };
    expect(toEdge(1, relEdge)).toBeNull();
  });
});

describe("MUSIC-format related entries", () => {
  it("are never traversed even for a traverse-eligible relation", () => {
    const relEdge = { relationType: "SEQUEL" as const, node: relatedNode({ format: "MUSIC" }) };
    expect(shouldTraverse(relEdge)).toBe(false);
  });

  it("never produce an edge", () => {
    const relEdge = { relationType: "SEQUEL" as const, node: relatedNode({ format: "MUSIC" }) };
    expect(toEdge(1, relEdge)).toBeNull();
  });
});

describe("dedup logic (mapper-level determinism)", () => {
  it("mapping the same media id twice produces identical nodes (safe to dedupe by id)", () => {
    const m = media();
    const nodeA = toNode(m, "anilist-1");
    const nodeB = toNode(m, "anilist-1");
    expect(nodeA).toEqual(nodeB);
    expect(nodeA?.id).toBe(nodeB?.id);
  });

  it("mapping the same relation edge twice produces an edge with an identical, stable id", () => {
    const relEdge = { relationType: "SEQUEL" as const, node: relatedNode() };
    const edgeA = toEdge(1, relEdge);
    const edgeB = toEdge(1, relEdge);
    expect(edgeA).toEqual(edgeB);
  });
});
