/**
 * Core data model for the Sequitur continuity graph engine.
 *
 * A `Franchise` is a hand-authored directed graph: nodes are consumable
 * pieces of media, edges are typed relationships between them ("this is a
 * sequel of that", "this is a side story of that", etc.) tagged with which
 * ordering track(s) (release-date order vs. in-universe/chronological
 * order) the relationship applies to.
 *
 * Nothing in this file contains logic — it is pure structural typing so
 * that engine modules and fixtures share a single source of truth.
 */

export type NodeId = string;
export type FranchiseId = string;

export type MediaKind =
  | "tv"
  | "movie"
  | "ova"
  | "ona"
  | "special"
  | "novel"
  | "light-novel"
  | "visual-novel"
  | "manga"
  | "game";

export interface ConsumptionNode {
  id: NodeId;
  franchiseId: FranchiseId;
  title: string;
  altTitles?: string[];
  kind: MediaKind;
  /** ISO 8601 */
  releaseDate?: string;
  /** display-only, never used by algorithms */
  inUniverseNote?: string;
  notes?: string;
  lengthMinutes?: number;
  /** AniList numeric media id, used as a stable cross-reference key. */
  anilistId?: number;
  /** Total episode count for tv/ona entries, sourced from AniList. */
  episodeCount?: number;
}

export type EdgeRelation =
  "sequel" | "prequel" | "side-story" | "adaptation" | "shared-universe" | "spinoff";

export type OrderingTrack = "release" | "chronological";
export type RequirementStrength = "required" | "recommended";

/**
 * Edge direction convention (canonical, i.e. after `normalize.ts` has run):
 * `from` must be consumed BEFORE `to` on every track listed in `tracks`.
 * `to` is the dependent/later node; `from` is its prerequisite/predecessor.
 * This holds for every relation kind ("sequel", "side-story", "adaptation",
 * "shared-universe", "spinoff") in normalized data.
 *
 * `"prequel"` is the one relation that is authored in the *opposite*
 * direction as a convenience: it lets a fixture author attach a prequel
 * reference to the *later* work, mirroring how AniList/MAL-style relation
 * data is typically sourced (an entry lists "Prequel: X" pointing
 * backward at the earlier entry X). `normalize.ts` flips these into
 * canonical `"sequel"` edges (swapping `from`/`to`) so every other module
 * only ever has to reason about one direction.
 */
export interface ConsumptionEdge {
  id: string;
  from: NodeId;
  to: NodeId;
  relation: EdgeRelation;
  strength: RequirementStrength;
  tracks: OrderingTrack[];
  contested?: {
    reason: string;
    alternativeView?: string;
    sourceUrls?: string[];
  };
}

/**
 * Where a `Franchise` came from. Absent/undefined is treated as `"curated"`
 * — the hand-authored fixtures in `src/fixtures/` predate this field and do
 * not need to set it explicitly.
 */
export type FranchiseSource = "curated" | "anilist-generated";

export interface Franchise {
  id: FranchiseId;
  name: string;
  description?: string;
  nodes: ConsumptionNode[];
  edges: ConsumptionEdge[];
  /** Absent/undefined means "curated" (hand-authored). */
  source?: FranchiseSource;
  /** ISO timestamp; only set for `"anilist-generated"` franchises. */
  generatedAt?: string;
  /** True if a crawl hit its node/depth cap before exhausting relations. */
  truncated?: boolean;
}

export interface CycleReport {
  cycleNodes: NodeId[];
  implicatedEdgeIds: string[];
  track: OrderingTrack;
  description: string;
}

export interface DivergentPair {
  a: NodeId;
  b: NodeId;
  order: Record<OrderingTrack, "a-before-b" | "b-before-a" | "unconstrained">;
}

export interface TrackResult {
  track: OrderingTrack;
  isValid: boolean;
  cycles: CycleReport[];
  order: NodeId[] | null;
  unconstrainedPairs: [NodeId, NodeId][];
}

export interface GraphAnalysisResult {
  franchiseId: FranchiseId;
  tracks: TrackResult[];
  divergentPairs: DivergentPair[];
  contestedEdgeIds: string[];
  generatedAt: string;
}
