import { validateFillerInfo, type EntryFillerInfo } from "./types.js";
import { onePieceFillerInfo } from "./one-piece.js";

export type { EntryFillerInfo, FillerRangeEntry } from "./types.js";
export { validateFillerInfo } from "./types.js";

/**
 * Every curated filler dataset. Adding a second franchise's filler data
 * later is just adding another entry here.
 */
const FILLER_DATASETS: EntryFillerInfo[] = [onePieceFillerInfo];

for (const info of FILLER_DATASETS) {
  validateFillerInfo(info);
}

/**
 * Maps AniList media id -> filler info, for any entry that has curated
 * filler-episode data. Absence from this map means no filler data is
 * available for that entry (not that it has no filler).
 */
export const FILLER_BY_ANILIST_ID: ReadonlyMap<number, EntryFillerInfo> = new Map(
  FILLER_DATASETS.map((info) => [info.anilistId, info]),
);
