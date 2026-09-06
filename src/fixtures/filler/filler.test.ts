import { describe, expect, it } from "vitest";
import { validateFillerInfo, type EntryFillerInfo } from "./types.js";
import { onePieceFillerInfo } from "./one-piece.js";
import { FILLER_BY_ANILIST_ID } from "./index.js";

describe("validateFillerInfo", () => {
  it("accepts the real one-piece.ts data cleanly", () => {
    expect(() => validateFillerInfo(onePieceFillerInfo)).not.toThrow();
  });

  it("is reachable via FILLER_BY_ANILIST_ID keyed by anilistId", () => {
    expect(FILLER_BY_ANILIST_ID.get(21)).toBe(onePieceFillerInfo);
  });

  it("throws when a range has start > end", () => {
    const bad: EntryFillerInfo = {
      anilistId: 999,
      totalEpisodes: 100,
      asOfDate: "2020-01-01",
      fillerRanges: [{ start: 10, end: 5 }],
    };
    expect(() => validateFillerInfo(bad)).toThrow(/start must be <= end/);
  });

  it("throws when a range's end exceeds totalEpisodes", () => {
    const bad: EntryFillerInfo = {
      anilistId: 999,
      totalEpisodes: 50,
      asOfDate: "2020-01-01",
      fillerRanges: [{ start: 40, end: 60 }],
    };
    expect(() => validateFillerInfo(bad)).toThrow(/exceeds totalEpisodes/);
  });

  it("throws when two ranges overlap", () => {
    const bad: EntryFillerInfo = {
      anilistId: 999,
      totalEpisodes: 100,
      asOfDate: "2020-01-01",
      fillerRanges: [
        { start: 10, end: 20 },
        { start: 15, end: 25 },
      ],
    };
    expect(() => validateFillerInfo(bad)).toThrow(/[Oo]verlapping ranges/);
  });
});
