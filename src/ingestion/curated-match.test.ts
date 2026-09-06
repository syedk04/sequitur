import { describe, expect, it } from "vitest";
import { findCuratedFranchiseByAnilistId } from "./curated-match.js";
import { gundamUC } from "../fixtures/index.js";

describe("findCuratedFranchiseByAnilistId", () => {
  it("resolves a known curated node's AniList id to its franchise", () => {
    // "msg" (Mobile Suit Gundam) in gundam-uc.ts is backfilled with anilistId: 80.
    const found = findCuratedFranchiseByAnilistId(80);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(gundamUC.id);
  });

  it("returns null for an arbitrary/unknown AniList id", () => {
    expect(findCuratedFranchiseByAnilistId(-1)).toBeNull();
  });
});
