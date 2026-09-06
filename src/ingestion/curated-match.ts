import { fateNasuverse, gundamUC, monogatari } from "../fixtures/index.js";
import type { Franchise } from "../engine/types.js";

const CURATED_FRANCHISES: Franchise[] = [fateNasuverse, monogatari, gundamUC];

let anilistIdToFranchise: Map<number, Franchise> | null = null;

function buildIndex(): Map<number, Franchise> {
  const index = new Map<number, Franchise>();
  for (const franchise of CURATED_FRANCHISES) {
    for (const node of franchise.nodes) {
      if (node.anilistId !== undefined && !index.has(node.anilistId)) {
        index.set(node.anilistId, franchise);
      }
    }
  }
  return index;
}

/**
 * Looks up the curated (hand-authored) `Franchise` that contains a node
 * with the given AniList id, if any. Used to prefer a curated fixture over
 * an AniList-generated crawl when one already exists for a title the user
 * searched for.
 */
export function findCuratedFranchiseByAnilistId(anilistId: number): Franchise | null {
  anilistIdToFranchise ??= buildIndex();
  return anilistIdToFranchise.get(anilistId) ?? null;
}
