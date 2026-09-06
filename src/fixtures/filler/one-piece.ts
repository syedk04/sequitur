/**
 * One Piece (AniList id 21) filler-episode data.
 *
 * IMPORTANT CAVEATS:
 *  - One Piece is a still-airing series (1000+ episodes and counting as of
 *    this writing). This is a PARTIAL, BEST-EFFORT curation covering only
 *    through episode 800 — it is NOT a claim of completeness up to the
 *    present day. `totalEpisodes`/`asOfDate` below reflect exactly where
 *    this curated data ends, not the live episode count.
 *  - Only the major, well-documented, stable filler ARCS are listed here
 *    (the ones with broad, long-standing fan consensus on their exact
 *    episode boundaries — e.g. via community filler-tracking sites and fan
 *    wikis cross-referenced against each other). Scattered single-episode
 *    filler/recap episodes that don't belong to a named filler arc, and
 *    arcs with disputed/blurry canon-filler boundaries (e.g. "Goodbye
 *    Merry", which mixes filler material into an otherwise canon-adjacent
 *    arc), are deliberately omitted rather than guessed at.
 *  - Anything NOT covered by `fillerRanges` is implicitly canon.
 */

import type { EntryFillerInfo } from "./types.js";

export const onePieceFillerInfo: EntryFillerInfo = {
  anilistId: 21,
  totalEpisodes: 800,
  asOfDate: "2018-01-09",
  source: "community-maintained filler-tracking consensus (fan wiki cross-reference), curated 2018-01-09",
  fillerRanges: [
    { start: 54, end: 61, note: "Warship Island Arc" },
    {
      start: 131,
      end: 143,
      note:
        "Post-Alabasta Arc (encompasses the Goat Island Arc, roughly 136-138, and the Ruluka Island Arc, roughly 139-143, as named sub-arcs); exact internal sub-arc boundaries are less firmly agreed upon than the overall 131-143 span",
    },
    { start: 196, end: 206, note: "G8 Arc" },
    { start: 220, end: 224, note: "Ocean's Dream Arc" },
    { start: 225, end: 226, note: "Foxy's Return Arc" },
    { start: 317, end: 319, note: "Rice Beans Arc (aka Little East Blue Arc)" },
    {
      start: 326,
      end: 336,
      note: "Ice Hunter Arc; lower confidence on the precise start boundary (possibly 325 or 327)",
    },
    { start: 575, end: 578, note: "Z's Ambition Arc" },
    { start: 590, end: 594, note: "Marine Rookie Arc" },
    { start: 626, end: 628, note: "Caesar Retrieval Arc" },
    { start: 723, end: 726, note: "Silver Mine Arc" },
  ],
};
