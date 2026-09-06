import type { ConsumptionEdge, ConsumptionNode, Franchise } from "../../engine/types.js";
import { getCached, setCached } from "./cache.js";
import { fetchMediaByIds } from "./client.js";
import { franchiseIdForRoot, shouldTraverse, toEdge, toNode } from "./mapper.js";
import type { AniListMedia } from "./types.js";

export interface CrawlOptions {
  maxNodes?: number;
  maxDepth?: number;
}

const DEFAULT_MAX_NODES = 60;
const DEFAULT_MAX_DEPTH = 8;

/**
 * Lower = discovered sooner when the frontier must be truncated to fit
 * `maxNodes`. Verified live (graphql.anilist.co, Mobile Suit Gundam id 80,
 * default caps): without this prioritization, a mainline SEQUEL (Char's
 * Counterattack, id 87) was silently dropped from a 60-node crawl while
 * several peripheral specials/OVAs survived, purely because of `Set`
 * insertion order across AniList's `relations.edges[]` arrays — nothing to
 * do with narrative importance. Sequels/prequels are the actual backbone of
 * a watch-order graph and must win a tight node budget over side content.
 */
const RELATION_TRAVERSAL_PRIORITY: Record<string, number> = {
  SEQUEL: 0,
  PREQUEL: 0,
  SIDE_STORY: 1,
  SPIN_OFF: 1,
};
const DEFAULT_TRAVERSAL_PRIORITY = 2;

/**
 * Fetches `AniListMedia` for a batch of ids, checking the cache first and
 * only hitting the network for cache misses. Cache writes happen for every
 * freshly-fetched entry.
 */
async function fetchWithCache(ids: number[]): Promise<Map<number, AniListMedia>> {
  const result = new Map<number, AniListMedia>();
  const misses: number[] = [];

  for (const id of ids) {
    const cached = await getCached(id);
    if (cached) {
      result.set(id, cached);
    } else {
      misses.push(id);
    }
  }

  if (misses.length > 0) {
    const fetched = await fetchMediaByIds(misses);
    for (const media of fetched) {
      result.set(media.id, media);
      await setCached(media.id, media);
    }
  }

  return result;
}

interface FrontierEntry {
  id: number;
  /** Best (lowest) relation-type priority through which this id was reached. */
  priority: number;
  /** Shortest known BFS depth from the root. */
  depth: number;
}

/**
 * Best-first-crawls the AniList relation graph starting from
 * `rootAnilistId`, mapping the result into a fully-formed, self-contained
 * `Franchise`.
 *
 * Algorithm:
 *  1. Maintain ONE global frontier (not scoped to a single BFS level) of
 *     `{id, priority, depth}` candidates. Each round, sort the whole
 *     frontier by `(priority, depth)` — sequel/prequel chains before
 *     side-story/spin-off content, closer to the root before farther — and
 *     pop as many as fit under the remaining `maxNodes` budget.
 *
 *     This is deliberately NOT strict level-by-level BFS: an earlier version
 *     sorted only within one depth level, which still let a whole shallow
 *     level of side content exhaust the node budget before a deeper mainline
 *     sequel chain ever got a turn. Verified live (graphql.anilist.co,
 *     Mobile Suit Gundam id 80, default caps 60/8): Char's Counterattack
 *     (id 87, a direct SEQUEL three hops from the root) was silently dropped
 *     from a 60-node crawl while several one-episode specials survived —
 *     purely an artifact of `Set`/array insertion order, nothing to do with
 *     narrative importance. Global best-first ordering fixes this: the
 *     entire sequel/prequel spine is exhausted before any side content is
 *     ever popped, regardless of relative depth.
 *  2. Fetch (via cache -> client) each popped batch, map to `ConsumptionNode`
 *     via `mapper.toNode`, add to the visited set (deduped by AniList id).
 *  3. Discover further candidates from "traverse" relations only
 *     (ANIME-typed targets only), respecting `maxDepth`; candidates beyond
 *     `maxDepth` are recorded as a truncation cause rather than queued.
 *  4. Collect candidate edges from "include" relations via `mapper.toEdge`
 *     for every visited node's relations.
 *  5. Post-pass: drop any edge whose `from`/`to` endpoint didn't survive
 *     the cap (i.e. isn't in the final visited node set). This uniformly
 *     handles both "always included" (traversed) and "conditionally
 *     included" (non-traversed) relation kinds — see `mapper.ts`.
 *  6. Set `truncated: true` if the node/depth cap was hit while the
 *     frontier still had unexplored items.
 */
export async function crawl(rootAnilistId: number, options: CrawlOptions = {}): Promise<Franchise> {
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES;
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;

  const franchiseId = franchiseIdForRoot(rootAnilistId);
  const visitedIds = new Set<number>();
  const visitedMedia = new Map<number, AniListMedia>();
  const nodesById = new Map<number, ConsumptionNode>();

  let truncated = false;
  // Candidates not yet fetched, keyed by id so a later-discovered better
  // (lower priority / shallower depth) path to the same id can upgrade it.
  const pending = new Map<number, FrontierEntry>([[rootAnilistId, { id: rootAnilistId, priority: 0, depth: 0 }]]);

  while (pending.size > 0) {
    const remainingCapacity = maxNodes - visitedIds.size;
    if (remainingCapacity <= 0) {
      truncated = true;
      break;
    }

    // Depth-cap candidates never get a batch turn — drop them permanently
    // rather than leaving them stuck in `pending` forever (which would spin
    // the loop indefinitely once no in-depth candidates remain).
    const outOfDepth = Array.from(pending.values()).filter((e) => e.depth > maxDepth);
    if (outOfDepth.length > 0) {
      truncated = true;
      for (const entry of outOfDepth) pending.delete(entry.id);
    }

    const inDepthCandidates = Array.from(pending.values());
    if (inDepthCandidates.length === 0) break;

    // Global best-first ordering across the ENTIRE remaining frontier, not
    // just one BFS level — see the algorithm note above for why this
    // matters. Crucially, a batch only ever contains candidates from the
    // SINGLE best priority tier present: mixing in lower-priority siblings
    // just to fill out `remainingCapacity` would let e.g. a handful of
    // shallow side-stories consume budget that an unexpanded sequel chain
    // might need once ITS next hop is discovered. Same-tier candidates can
    // still be safely batched together (they're provably not worse than
    // anything else outstanding), preserving the efficiency of AniList's
    // batched `id_in` queries.
    const minPriority = Math.min(...inDepthCandidates.map((e) => e.priority));
    const sameTier = inDepthCandidates
      .filter((e) => e.priority === minPriority)
      .sort((a, b) => a.depth - b.depth);
    const batch = sameTier.slice(0, remainingCapacity);
    // Only running out of room WITHIN this tier is truncation — having
    // further (lower-priority) tiers still queued behind it is completely
    // normal and gets processed in a later round with no data loss.
    if (sameTier.length > batch.length) truncated = true;
    if (batch.length === 0) break;

    for (const entry of batch) pending.delete(entry.id);

    const batchIds = batch.map((entry) => entry.id);
    const fetched = await fetchWithCache(batchIds);

    for (const entry of batch) {
      const media = fetched.get(entry.id);
      if (!media) continue; // media may have been deleted/unavailable upstream; skip gracefully
      if (visitedIds.has(entry.id)) continue;

      visitedIds.add(entry.id);
      visitedMedia.set(entry.id, media);

      const node = toNode(media, franchiseId);
      if (node) {
        nodesById.set(entry.id, node);
      }

      for (const relEdge of media.relations?.edges ?? []) {
        if (!shouldTraverse(relEdge) || visitedIds.has(relEdge.node.id)) continue;
        const targetId = relEdge.node.id;
        const priority =
          RELATION_TRAVERSAL_PRIORITY[relEdge.relationType] ?? DEFAULT_TRAVERSAL_PRIORITY;
        const nextDepth = entry.depth + 1;
        const existing = pending.get(targetId);
        if (
          existing === undefined ||
          priority < existing.priority ||
          (priority === existing.priority && nextDepth < existing.depth)
        ) {
          pending.set(targetId, { id: targetId, priority, depth: nextDepth });
        }
      }
    }
  }

  // Collect candidate edges from every visited node's relations, then drop
  // any whose endpoints didn't survive the cap.
  const candidateEdges: ConsumptionEdge[] = [];
  for (const [id, media] of visitedMedia) {
    for (const relEdge of media.relations?.edges ?? []) {
      const edge = toEdge(id, relEdge);
      if (edge) candidateEdges.push(edge);
    }
  }

  const survivingNodeIds = new Set(Array.from(nodesById.values()).map((n) => n.id));
  const edgesById = new Map<string, ConsumptionEdge>();
  const seenCanonicalKeys = new Set<string>();
  for (const edge of candidateEdges) {
    if (!survivingNodeIds.has(edge.from) || !survivingNodeIds.has(edge.to)) continue;

    // AniList routinely declares the same relationship from both sides
    // (e.g. media A lists B as its SEQUEL, and B separately lists A as its
    // PREQUEL) — verified live against graphql.anilist.co. Since a
    // "prequel" edge is later flipped by `normalize.ts` into the equivalent
    // "sequel" edge with from/to swapped, dedup here on that same canonical
    // form so a bidirectionally-declared relationship doesn't survive as
    // two redundant edges in the crawled graph.
    const canonicalKey =
      edge.relation === "prequel"
        ? `${edge.to}|${edge.from}|sequel`
        : `${edge.from}|${edge.to}|${edge.relation}`;
    if (seenCanonicalKeys.has(canonicalKey)) continue;
    seenCanonicalKeys.add(canonicalKey);

    edgesById.set(edge.id, edge);
  }

  return {
    id: franchiseId,
    name: nodesById.get(rootAnilistId)?.title ?? franchiseId,
    nodes: Array.from(nodesById.values()),
    edges: Array.from(edgesById.values()),
    source: "anilist-generated",
    generatedAt: new Date().toISOString(),
    truncated,
  };
}
