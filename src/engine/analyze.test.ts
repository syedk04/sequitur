import { describe, expect, it } from "vitest";
import { analyzeFranchise } from "./analyze.js";
import type { ConsumptionNode, Franchise } from "./types.js";
import { fateNasuverse } from "../fixtures/fate-nasuverse.js";
import { gundamUC } from "../fixtures/gundam-uc.js";
import { monogatari } from "../fixtures/monogatari.js";

function node(id: string): ConsumptionNode {
  return { id, franchiseId: "test", title: id, kind: "tv" };
}

describe("analyzeFranchise — fate-nasuverse", () => {
  const result = analyzeFranchise(fateNasuverse);

  it("produces valid, cycle-free tracks", () => {
    for (const track of result.tracks) {
      expect(track.isValid).toBe(true);
      expect(track.cycles).toEqual([]);
      expect(track.order).not.toBeNull();
    }
  });

  it("places Fate/Zero before Fate/stay night chronologically, but after it in release order", () => {
    const releaseTrack = result.tracks.find((t) => t.track === "release");
    const chronoTrack = result.tracks.find((t) => t.track === "chronological");
    expect(releaseTrack?.order).toBeTruthy();
    expect(chronoTrack?.order).toBeTruthy();

    const releaseOrder = releaseTrack?.order ?? [];
    const chronoOrder = chronoTrack?.order ?? [];

    expect(releaseOrder.indexOf("fsn-vn")).toBeLessThan(releaseOrder.indexOf("fz-anime"));
    expect(chronoOrder.indexOf("fz-anime")).toBeLessThan(chronoOrder.indexOf("fsn-vn"));
  });

  it("surfaces the fz-anime/fsn-vn flip as a concrete DivergentPair", () => {
    const pair = result.divergentPairs.find(
      (p) => new Set([p.a, p.b]).has("fz-anime") && new Set([p.a, p.b]).has("fsn-vn"),
    );
    expect(pair).toBeDefined();
    if (!pair) return;

    const releaseSaysFsnFirst =
      (pair.a === "fsn-vn" && pair.order.release === "a-before-b") ||
      (pair.b === "fsn-vn" && pair.order.release === "b-before-a");
    const chronoSaysFzFirst =
      (pair.a === "fz-anime" && pair.order.chronological === "a-before-b") ||
      (pair.b === "fz-anime" && pair.order.chronological === "b-before-a");

    expect(releaseSaysFsnFirst).toBe(true);
    expect(chronoSaysFzFirst).toBe(true);
  });
});

describe("analyzeFranchise — gundam-uc", () => {
  const result = analyzeFranchise(gundamUC);
  const mainSequence = ["msg", "zeta", "zz", "cca"];

  it("keeps the required main sequence in valid relative order on both tracks", () => {
    for (const track of result.tracks) {
      expect(track.isValid).toBe(true);
      const order = track.order ?? [];
      const indices = mainSequence.map((id) => order.indexOf(id));
      for (let i = 1; i < indices.length; i++) {
        expect(indices[i - 1]).toBeLessThan(indices[i] as number);
      }
    }
  });

  it("surfaces the Unicorn/CCA contested edge", () => {
    expect(result.contestedEdgeIds).toContain("e-cca-unicorn");
  });
});

describe("analyzeFranchise — monogatari", () => {
  const result = analyzeFranchise(monogatari);

  it("produces different total orders for release vs chronological", () => {
    const releaseOrder = result.tracks.find((t) => t.track === "release")?.order;
    const chronoOrder = result.tracks.find((t) => t.track === "chronological")?.order;

    expect(releaseOrder).toBeTruthy();
    expect(chronoOrder).toBeTruthy();
    expect(releaseOrder).not.toEqual(chronoOrder);
  });

  it("flags Kizumonogatari as a genuine release-vs-chronological divergence", () => {
    const pair = result.divergentPairs.find(
      (p) => new Set([p.a, p.b]).has("kizu") && new Set([p.a, p.b]).has("bake"),
    );
    expect(pair).toBeDefined();
  });
});

describe("analyzeFranchise — self-contradictory inline fixture", () => {
  it("produces isValid: false with a non-empty cycles array on the correct track", () => {
    const contradictory: Franchise = {
      id: "contradiction",
      name: "Self-contradictory",
      nodes: [node("x"), node("y"), node("z")],
      edges: [
        {
          id: "e-xy",
          from: "x",
          to: "y",
          relation: "sequel",
          strength: "required",
          tracks: ["chronological"],
        },
        {
          id: "e-yz",
          from: "y",
          to: "z",
          relation: "sequel",
          strength: "required",
          tracks: ["chronological"],
        },
        {
          id: "e-zx",
          from: "z",
          to: "x",
          relation: "sequel",
          strength: "required",
          tracks: ["chronological"],
        },
      ],
    };

    const result = analyzeFranchise(contradictory);
    const chronoTrack = result.tracks.find((t) => t.track === "chronological");

    expect(chronoTrack).toBeDefined();
    expect(chronoTrack?.isValid).toBe(false);
    expect(chronoTrack?.order).toBeNull();
    expect(chronoTrack?.cycles.length).toBeGreaterThan(0);

    // No release edges exist, so the release track shouldn't even appear.
    expect(result.tracks.find((t) => t.track === "release")).toBeUndefined();

    // Divergence detection is skipped entirely when a track has cycles.
    expect(result.divergentPairs).toEqual([]);
  });
});
