/**
 * Raw AniList GraphQL response shapes.
 *
 * These are intentionally narrow — they only declare the fields this
 * project's queries actually request (see `client.ts` / `search.ts`), not
 * AniList's full schema. Field names/casing mirror AniList's GraphQL API
 * exactly (camelCase, enum-like string unions in SCREAMING_SNAKE_CASE)
 * since these types are meant to be a 1:1 mirror of the wire shape.
 *
 * NOTE: this project has no live network access during development, so
 * these shapes are based on documented/publicly known AniList schema
 * fields, not a captured real response. A live integration check against
 * https://graphql.anilist.co is recommended before relying on this in
 * production — see the ingestion task report for specifics.
 */

/** AniList's `MediaType` enum. Only ANIME is ever traversed/mapped by this project (v1 scope). */
export type AniListMediaType = "ANIME" | "MANGA";

/** AniList's `MediaFormat` enum (subset actually observed on ANIME-typed media). */
export type AniListMediaFormat =
  | "TV"
  | "TV_SHORT"
  | "MOVIE"
  | "SPECIAL"
  | "OVA"
  | "ONA"
  | "MUSIC"
  | "MANGA"
  | "NOVEL"
  | "ONE_SHOT";

/**
 * AniList's `MediaRelation` enum. Verified live against graphql.anilist.co
 * (2026-09-06) — the documented set was missing `SOURCE` (the edge pointing
 * from an adaptation back to its original manga/novel/game), which the real
 * API returns routinely. `RELATION_RULES` in `mapper.ts` handles this value
 * (excluded, same posture as `ADAPTATION`) and also has a defensive fallback
 * for any future relation type AniList adds that isn't listed here yet.
 */
export type AniListMediaRelation =
  | "ADAPTATION"
  | "PREQUEL"
  | "SEQUEL"
  | "PARENT"
  | "SIDE_STORY"
  | "CHARACTER"
  | "SUMMARY"
  | "ALTERNATIVE"
  | "SPIN_OFF"
  | "OTHER"
  | "COMPILATION"
  | "CONTAINS"
  | "SOURCE";

export interface AniListFuzzyDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

export interface AniListTitle {
  romaji: string | null;
  english: string | null;
  native: string | null;
}

export interface AniListCoverImage {
  large: string | null;
  medium: string | null;
}

/**
 * A related-media edge as returned inside `Media.relations.edges[]`. The
 * related media node itself is nested under `node`.
 */
export interface AniListRelationEdge {
  relationType: AniListMediaRelation;
  node: AniListRelatedMediaNode;
}

/**
 * The subset of `Media` fields needed to decide whether/how to traverse a
 * related entry, WITHOUT necessarily having that entry's own relations
 * fetched yet (that only happens once it becomes part of the BFS frontier).
 */
export interface AniListRelatedMediaNode {
  id: number;
  type: AniListMediaType;
  format: AniListMediaFormat | null;
  title: AniListTitle;
  startDate: AniListFuzzyDate | null;
  episodes: number | null;
}

/** A full `Media` object, as fetched for every node the BFS crawl visits. */
export interface AniListMedia {
  id: number;
  type: AniListMediaType;
  format: AniListMediaFormat | null;
  title: AniListTitle;
  startDate: AniListFuzzyDate | null;
  episodes: number | null;
  coverImage?: AniListCoverImage | null;
  relations?: {
    edges: AniListRelationEdge[];
  } | null;
}

export interface AniListPageInfo {
  total: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
  perPage: number;
}

export interface AniListMediaPageResponse {
  Page: {
    pageInfo?: AniListPageInfo;
    media: AniListMedia[];
  };
}

export interface AniListSearchMediaPageResponse {
  Page: {
    pageInfo?: AniListPageInfo;
    media: AniListRelatedMediaNode[];
  };
}

/** Top-level GraphQL envelope shape as returned by graphql.anilist.co. */
export interface AniListGraphQLResponse<T> {
  data?: T;
  errors?: { message: string; status?: number }[];
}
