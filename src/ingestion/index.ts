/**
 * Public barrel export for the ingestion module. Pure IO/mapping layer for
 * live AniList GraphQL integration — see individual files for details.
 * Nothing in `src/ingestion/` imports from `src/web/`.
 */

export { crawl } from "./anilist/crawl.js";
export type { CrawlOptions } from "./anilist/crawl.js";
export { searchAnime } from "./anilist/search.js";
export type { AniListSearchResult } from "./anilist/search.js";
export { fetchMediaByIds, AniListRequestError } from "./anilist/client.js";
export { getCached, setCached } from "./anilist/cache.js";
export {
  franchiseIdForRoot,
  mapFormatToKind,
  mapStartDate,
  nodeIdForAnilistId,
  RELATION_RULES,
  shouldTraverse,
  toEdge,
  toNode,
} from "./anilist/mapper.js";
export type {
  AniListFuzzyDate,
  AniListMedia,
  AniListMediaFormat,
  AniListMediaRelation,
  AniListMediaType,
  AniListRelatedMediaNode,
  AniListRelationEdge,
} from "./anilist/types.js";
export { findCuratedFranchiseByAnilistId } from "./curated-match.js";
