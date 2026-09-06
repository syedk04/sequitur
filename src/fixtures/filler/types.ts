/**
 * Data model for per-entry filler-episode tracking. This is deliberately
 * decoupled from `src/engine/` — filler ranges are a presentation-layer
 * concern (a "should I skip this episode" guide), not part of the
 * continuity graph the engine reasons about. Nothing here participates in
 * topo-sort, cycle detection, or spoiler filtering.
 */

export interface FillerRangeEntry {
  /** Inclusive episode number. */
  start: number;
  /** Inclusive episode number. */
  end: number;
  /** For partially-filler/"mixed" episodes, low-confidence boundaries, or other context. */
  note?: string;
}

export interface EntryFillerInfo {
  /** AniList numeric media id — cross-referenced against `ConsumptionNode.anilistId`. */
  anilistId: number;
  /** Episode count as of `asOfDate`. For still-airing series this trails the live total. */
  totalEpisodes: number;
  /** ISO date — "data current as of" marker, since new episodes air continuously. */
  asOfDate: string;
  /** ONLY filler ranges; anything not covered is implicitly canon. */
  fillerRanges: FillerRangeEntry[];
  /** Citation, e.g. "community-maintained filler-tracking consensus (fan wiki cross-reference), curated 2026-09-05". */
  source?: string;
}

/**
 * Throws a clear, descriptive error if `info` is internally inconsistent:
 *   - any range has `start > end`
 *   - any range's `end` exceeds `totalEpisodes`
 *   - any two ranges overlap
 *
 * Intended to be called once at module-init time for each curated dataset,
 * so a broken dataset fails loudly at build/test time rather than silently
 * producing a wrong "skip these episodes" recommendation at render time.
 */
export function validateFillerInfo(info: EntryFillerInfo): void {
  const label = `EntryFillerInfo(anilistId=${info.anilistId})`;

  for (const range of info.fillerRanges) {
    if (range.start > range.end) {
      throw new Error(
        `${label}: invalid range [${range.start}, ${range.end}] — start must be <= end.`,
      );
    }
    if (range.end > info.totalEpisodes) {
      throw new Error(
        `${label}: range [${range.start}, ${range.end}] exceeds totalEpisodes (${info.totalEpisodes}).`,
      );
    }
  }

  const sorted = [...info.fillerRanges].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (!prev || !curr) continue;
    if (curr.start <= prev.end) {
      throw new Error(
        `${label}: overlapping ranges [${prev.start}, ${prev.end}] and [${curr.start}, ${curr.end}].`,
      );
    }
  }
}
