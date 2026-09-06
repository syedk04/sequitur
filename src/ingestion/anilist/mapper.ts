import type {
  ConsumptionEdge,
  ConsumptionNode,
  EdgeRelation,
  FranchiseId,
  MediaKind,
  NodeId,
  OrderingTrack,
  RequirementStrength,
} from "../../engine/types.js";
import type {
  AniListFuzzyDate,
  AniListMedia,
  AniListMediaFormat,
  AniListMediaRelation,
  AniListRelatedMediaNode,
  AniListRelationEdge,
} from "./types.js";

/**
 * Pure mapping functions from raw AniList GraphQL shapes to this project's
 * `ConsumptionNode` / `ConsumptionEdge` model. No network, no IO, no BFS
 * orchestration — see `crawl.ts` for that. Keeping this pure makes it cheap
 * to unit test exhaustively against static inline fixtures.
 */

/** Stable, collision-free node id scheme for AniList-sourced nodes. */
export function nodeIdForAnilistId(anilistId: number): NodeId {
  return `anilist-${anilistId}`;
}

/** Stable franchise id scheme for a whole crawl, keyed by its root media id. */
export function franchiseIdForRoot(rootAnilistId: number): FranchiseId {
  return `anilist-${rootAnilistId}`;
}

const FORMAT_TO_KIND: Partial<Record<AniListMediaFormat, MediaKind>> = {
  TV: "tv",
  TV_SHORT: "tv",
  MOVIE: "movie",
  OVA: "ova",
  ONA: "ona",
  SPECIAL: "special",
  // MUSIC is deliberately omitted — mapped to `null` (skipped) below, since
  // AniList "music video" entries aren't real watch-order content.
};

/**
 * Maps an AniList `format` to our `MediaKind`. Returns `null` for formats
 * that should be skipped entirely (currently just `MUSIC`) or for formats
 * this project doesn't model as anime content (`MANGA`/`NOVEL`/`ONE_SHOT`
 * shouldn't reach here in practice since callers already filter by
 * `type === "ANIME"`, but are handled defensively).
 */
export function mapFormatToKind(format: AniListMediaFormat | null): MediaKind | null {
  if (format === null) return null;
  return FORMAT_TO_KIND[format] ?? null;
}

/**
 * Maps an AniList fuzzy `startDate` ({year, month, day}, any nullable) to
 * an ISO 8601 date string, or `undefined` if the year itself is unknown.
 *
 * DOCUMENTED CONVENTION: for partial dates we fill missing month/day with
 * `01` rather than leaving the whole field undefined. This is a deliberate
 * choice — a year-only date still sorts/compares usefully against other
 * `releaseDate`s (e.g. for release-order edge inference elsewhere in the
 * engine), whereas discarding it entirely would silently lose real
 * information. Never throws on missing/partial/null input.
 */
export function mapStartDate(date: AniListFuzzyDate | null | undefined): string | undefined {
  if (!date || date.year === null) return undefined;
  const year = String(date.year).padStart(4, "0");
  const month = String(date.month ?? 1).padStart(2, "0");
  const day = String(date.day ?? 1).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Maps a full/related AniList media node into our `ConsumptionNode` shape.
 * Returns `null` for media this project never represents as a node:
 *  - non-`ANIME`-typed media (v1 scope is anime-only; see file header of
 *    the ingestion task plan)
 *  - `MUSIC`-format entries (music videos, not real watch-order content)
 *  - any other format this project has no `MediaKind` mapping for
 */
export function toNode(
  media: AniListMedia | AniListRelatedMediaNode,
  franchiseId: FranchiseId,
): ConsumptionNode | null {
  if (media.type !== "ANIME") return null;
  const kind = mapFormatToKind(media.format);
  if (kind === null) return null;

  const title = media.title.english ?? media.title.romaji ?? media.title.native ?? "Untitled";
  const altTitles = [media.title.romaji, media.title.native, media.title.english].filter(
    (t): t is string => typeof t === "string" && t !== title,
  );

  const node: ConsumptionNode = {
    id: nodeIdForAnilistId(media.id),
    franchiseId,
    title,
    kind,
    anilistId: media.id,
  };
  if (altTitles.length > 0) node.altTitles = Array.from(new Set(altTitles));
  const releaseDate = mapStartDate(media.startDate);
  if (releaseDate !== undefined) node.releaseDate = releaseDate;
  if (media.episodes !== null && media.episodes !== undefined) {
    node.episodeCount = media.episodes;
  }
  return node;
}

interface RelationRule {
  /** Should BFS crawl into this related entry to discover further nodes? */
  traverse: boolean;
  /**
   * Should this relation ever produce an edge? Relations excluded entirely
   * (ADAPTATION, PARENT, CHARACTER, COMPILATION, CONTAINS) are `false`.
   * Everything else is `true` here — the distinction between "always
   * included" (traversed relations, whose endpoints are therefore always
   * eventually discovered) and "conditionally included" (non-traversed
   * relations, included only if both endpoints happen to already be
   * discovered) is enforced by `crawl.ts`'s post-pass, not by this pure
   * mapper, since that decision depends on BFS-wide state this function
   * doesn't have visibility into.
   */
  include: boolean;
  relation?: EdgeRelation;
  strength?: RequirementStrength;
  tracks?: OrderingTrack[];
}

/**
 * The AniList relation -> our edge-model mapping table. See the ingestion
 * task plan for the authoritative spec; this is a direct implementation of
 * it.
 */
export const RELATION_RULES: Record<AniListMediaRelation, RelationRule> = {
  SEQUEL: { traverse: true, include: true, relation: "sequel", strength: "required", tracks: ["release"] },
  PREQUEL: { traverse: true, include: true, relation: "prequel", strength: "required", tracks: ["release"] },
  SIDE_STORY: {
    traverse: true,
    include: true,
    relation: "side-story",
    strength: "recommended",
    tracks: ["release"],
  },
  SPIN_OFF: {
    traverse: true,
    include: true,
    relation: "spinoff",
    strength: "recommended",
    tracks: ["release"],
  },
  ALTERNATIVE: {
    traverse: false,
    include: true,
    relation: "shared-universe",
    strength: "recommended",
    tracks: ["release"],
  },
  SUMMARY: {
    traverse: false,
    include: true,
    relation: "shared-universe",
    strength: "recommended",
    tracks: ["release"],
  },
  ADAPTATION: { traverse: false, include: false },
  PARENT: { traverse: false, include: false },
  CHARACTER: { traverse: false, include: false },
  OTHER: {
    traverse: false,
    include: true,
    relation: "shared-universe",
    strength: "recommended",
    tracks: ["release"],
  },
  COMPILATION: { traverse: false, include: false },
  CONTAINS: { traverse: false, include: false },
  // Points from an adaptation back to its original manga/novel/game source;
  // same posture as ADAPTATION (cross-media, excluded from v1's anime-only
  // watch-order graph). Confirmed present in real AniList responses even
  // though it isn't documented alongside the other relation types.
  SOURCE: { traverse: false, include: false },
};

/**
 * Fallback for any AniList relation type not present in `RELATION_RULES` —
 * AniList's schema can add new enum values over time, and a live GraphQL
 * response is not guaranteed to only ever contain the values this project
 * knows about today. Defaults to "exclude entirely" (never traverse, never
 * include as an edge) rather than throwing, so an unrecognized relation type
 * degrades to being silently ignored instead of crashing the whole crawl.
 */
const UNKNOWN_RELATION_RULE: RelationRule = { traverse: false, include: false };

function ruleFor(relationType: AniListMediaRelation): RelationRule {
  return RELATION_RULES[relationType] ?? UNKNOWN_RELATION_RULE;
}

/**
 * Should the BFS crawl traverse into this related entry (i.e. treat it as
 * a frontier candidate for further discovery)? Only `ANIME`-typed,
 * non-`MUSIC`-format targets with a "traverse" relation are ever crawled
 * into — anything else is a dead end for discovery purposes (it may still
 * produce an edge, see `toEdge`, but the BFS won't fetch its own relations).
 */
export function shouldTraverse(relEdge: AniListRelationEdge): boolean {
  const { node, relationType } = relEdge;
  if (node.type !== "ANIME") return false;
  if (node.format === "MUSIC") return false;
  return ruleFor(relationType).traverse;
}

/**
 * Maps a single AniList relation edge (as seen from `fromAnilistId`'s
 * `relations.edges[]`) into our `ConsumptionEdge` shape, or `null` if this
 * relation should never be represented as an edge in this project's model
 * (excluded relation kinds, non-ANIME targets, or MUSIC-format targets).
 *
 * NOTE: this does not check whether the target endpoint actually survives
 * the BFS's node/depth cap — that "both endpoints must exist in the final
 * node set" condition is enforced by `crawl.ts` via a post-pass over all
 * produced edges, since it depends on BFS-wide state this pure function
 * has no visibility into.
 */
export function toEdge(fromAnilistId: number, relEdge: AniListRelationEdge): ConsumptionEdge | null {
  const { node: target, relationType } = relEdge;
  if (target.type !== "ANIME") return null;
  if (target.format === "MUSIC") return null;

  const rule = ruleFor(relationType);
  if (!rule.include || !rule.relation || !rule.strength || !rule.tracks) return null;

  return {
    id: `e-anilist-${relationType.toLowerCase()}-${fromAnilistId}-${target.id}`,
    from: nodeIdForAnilistId(fromAnilistId),
    to: nodeIdForAnilistId(target.id),
    relation: rule.relation,
    strength: rule.strength,
    tracks: rule.tracks,
  };
}
