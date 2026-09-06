import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetMemoryCacheForTests, getCached, setCached } from "./cache.js";
import type { AniListMedia } from "./types.js";

function media(id: number): AniListMedia {
  return {
    id,
    type: "ANIME",
    format: "TV",
    title: { romaji: `Media ${id}`, english: null, native: null },
    startDate: { year: 2020, month: 1, day: 1 },
    episodes: 12,
  };
}

describe("cache (in-memory fallback, since Node/Vitest has no real IndexedDB)", () => {
  beforeEach(() => {
    __resetMemoryCacheForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null on a cache miss", async () => {
    expect(await getCached(1)).toBeNull();
  });

  it("returns the cached media on a hit", async () => {
    await setCached(1, media(1));
    const cached = await getCached(1);
    expect(cached?.id).toBe(1);
  });

  it("treats entries older than the 7-day TTL as cache misses", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    await setCached(1, media(1));

    // Just under 7 days later: still a hit.
    vi.setSystemTime(new Date("2026-01-07T23:00:00Z"));
    expect(await getCached(1)).not.toBeNull();

    // Just over 7 days later: now a miss.
    vi.setSystemTime(new Date("2026-01-08T01:00:00Z"));
    expect(await getCached(1)).toBeNull();
  });

  it("evicts the oldest entries beyond the ~500 item size cap", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    for (let i = 1; i <= 500; i++) {
      await setCached(i, media(i));
      vi.advanceTimersByTime(1);
    }
    expect(await getCached(1)).not.toBeNull();

    // Adding one more past the cap should evict the oldest (id 1).
    await setCached(501, media(501));

    expect(await getCached(1)).toBeNull();
    expect(await getCached(501)).not.toBeNull();
    expect(await getCached(500)).not.toBeNull();
  });
});
