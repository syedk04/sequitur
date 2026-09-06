import { describe, expect, it } from "vitest";
import { computeDivergence } from "./divergence.js";
import type { TrackResult } from "./types.js";

function trackResult(
  track: "release" | "chronological",
  order: string[],
  unconstrainedPairs: [string, string][] = [],
): TrackResult {
  return { track, isValid: true, cycles: [], order, unconstrainedPairs };
}

describe("computeDivergence", () => {
  it("produces exactly one DivergentPair for a single flipped pair", () => {
    const release = trackResult("release", ["a", "b", "c"]);
    const chronological = trackResult("chronological", ["b", "a", "c"]);

    const pairs = computeDivergence(release, chronological);

    expect(pairs).toHaveLength(1);
    const pair = pairs[0];
    expect(pair).toBeDefined();
    if (!pair) return;
    expect([pair.a, pair.b].sort()).toEqual(["a", "b"]);

    // Whichever of a/b was labeled "a" in the pair, the two tracks must
    // disagree about direction.
    expect(pair.order.release).not.toBe(pair.order.chronological);
    expect(pair.order.release === "a-before-b" || pair.order.release === "b-before-a").toBe(true);
  });

  it("produces zero divergent pairs for identical orders", () => {
    const release = trackResult("release", ["a", "b", "c"]);
    const chronological = trackResult("chronological", ["a", "b", "c"]);

    expect(computeDivergence(release, chronological)).toEqual([]);
  });

  it("marks unconstrained-in-one-track pairs as 'unconstrained' rather than guessing", () => {
    const release = trackResult("release", ["a", "b", "c"]);
    // a and b are unconstrained on the chronological track even though
    // array position would otherwise suggest a-before-b.
    const chronological = trackResult("chronological", ["a", "b", "c"], [["a", "b"]]);

    const pairs = computeDivergence(release, chronological);

    const abPair = pairs.find((p) => new Set([p.a, p.b]).has("a") && new Set([p.a, p.b]).has("b"));
    expect(abPair).toBeDefined();
    if (!abPair) return;

    const chronoSlot = abPair.a === "a" ? abPair.order.chronological : abPair.order.chronological;
    expect(chronoSlot).toBe("unconstrained");
    const releaseSlot = abPair.order.release;
    expect(releaseSlot).not.toBe("unconstrained");
  });
});
