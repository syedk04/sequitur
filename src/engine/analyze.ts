import type { Franchise, GraphAnalysisResult, OrderingTrack, TrackResult } from "./types.js";
import { normalizeFranchise } from "./normalize.js";
import { topoSort } from "./topo-sort.js";
import { detectCycles } from "./cycle-detect.js";
import { computeDivergence } from "./divergence.js";

const ALL_TRACKS: OrderingTrack[] = ["release", "chronological"];

/**
 * Runs the full analysis pipeline against a (possibly raw/unnormalized)
 * `Franchise`: normalize -> per-track topological sort -> cycle detection
 * for any stalled track -> divergence detection (only when both tracks
 * exist and are cycle-free) -> contested-edge collection.
 *
 * Pure function: no caching or memoization, safe to call repeatedly.
 */
export function analyzeFranchise(franchise: Franchise): GraphAnalysisResult {
  const normalized = normalizeFranchise(franchise);

  const tracksPresent = ALL_TRACKS.filter((track) =>
    normalized.edges.some((edge) => edge.tracks.includes(track)),
  );

  const tracks: TrackResult[] = tracksPresent.map((track) => {
    const { order, unconstrainedPairs, residualNodes } = topoSort(normalized, track);

    if (order === null) {
      const cycles = detectCycles(normalized, track, residualNodes);
      return {
        track,
        isValid: false,
        cycles,
        order: null,
        unconstrainedPairs,
      };
    }

    return {
      track,
      isValid: true,
      cycles: [],
      order,
      unconstrainedPairs,
    };
  });

  const releaseResult = tracks.find((t) => t.track === "release");
  const chronologicalResult = tracks.find((t) => t.track === "chronological");

  const divergentPairs =
    releaseResult && chronologicalResult && releaseResult.isValid && chronologicalResult.isValid
      ? computeDivergence(releaseResult, chronologicalResult)
      : [];

  const contestedEdgeIds = normalized.edges
    .filter((edge) => Boolean(edge.contested))
    .map((edge) => edge.id);

  return {
    franchiseId: normalized.id,
    tracks,
    divergentPairs,
    contestedEdgeIds,
    generatedAt: new Date().toISOString(),
  };
}
