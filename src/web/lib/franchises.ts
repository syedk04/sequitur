import { fateNasuverse, monogatari, gundamUC } from "../../fixtures/index.js";
import { findCuratedFranchiseByAnilistId } from "../../ingestion/index.js";
import type { Franchise } from "../../engine/types.js";

export const FRANCHISES: readonly Franchise[] = [fateNasuverse, monogatari, gundamUC];

export const FRANCHISE_BY_ID: ReadonlyMap<string, Franchise> = new Map(
  FRANCHISES.map((franchise) => [franchise.id, franchise]),
);

/**
 * Given an AniList media id selected from search, decides which franchise
 * id to route to: a curated fixture's id if one already covers that id, or
 * a synthetic `anilist-<id>` id (matching `mapper.ts`'s `franchiseIdForRoot`
 * scheme) to trigger a live crawl otherwise.
 */
export function franchiseIdForSearchSelection(anilistId: number): string {
  const curated = findCuratedFranchiseByAnilistId(anilistId);
  if (curated) return curated.id;
  return `anilist-${anilistId}`;
}
