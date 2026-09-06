import { describe, expect, it } from "vitest";
import { normalizeFranchise } from "./normalize.js";
import type { ConsumptionNode, Franchise } from "./types.js";

function node(id: string): ConsumptionNode {
  return { id, franchiseId: "test", title: id, kind: "tv" };
}

describe("normalizeFranchise", () => {
  it("flips prequel edges into sequel edges with from/to swapped", () => {
    const f: Franchise = {
      id: "test",
      name: "Test",
      nodes: [node("a"), node("b")],
      edges: [
        {
          id: "e1",
          from: "b",
          to: "a",
          relation: "prequel",
          strength: "required",
          tracks: ["chronological"],
        },
      ],
    };

    const normalized = normalizeFranchise(f);

    expect(normalized.edges).toHaveLength(1);
    const flipped = normalized.edges[0];
    expect(flipped).toBeDefined();
    if (!flipped) return;
    expect(flipped.relation).toBe("sequel");
    expect(flipped.from).toBe("a");
    expect(flipped.to).toBe("b");
    expect(flipped.id).toBe("e1");
    expect(flipped.strength).toBe("required");
    expect(flipped.tracks).toEqual(["chronological"]);
  });

  it("throws a clear, actionable error for a dangling edge reference", () => {
    const f: Franchise = {
      id: "test",
      name: "Test",
      nodes: [node("a")],
      edges: [
        {
          id: "bad-edge",
          from: "a",
          to: "missing-node",
          relation: "sequel",
          strength: "required",
          tracks: ["release"],
        },
      ],
    };

    expect(() => normalizeFranchise(f)).toThrowError(/bad-edge/);
    expect(() => normalizeFranchise(f)).toThrowError(/missing-node/);
  });

  it("throws a clear error for duplicate edge ids", () => {
    const f: Franchise = {
      id: "test",
      name: "Test",
      nodes: [node("a"), node("b"), node("c")],
      edges: [
        {
          id: "dupe",
          from: "a",
          to: "b",
          relation: "sequel",
          strength: "required",
          tracks: ["release"],
        },
        {
          id: "dupe",
          from: "b",
          to: "c",
          relation: "sequel",
          strength: "required",
          tracks: ["release"],
        },
      ],
    };

    expect(() => normalizeFranchise(f)).toThrowError(/dupe/);
  });

  it("passes through disjoint-track opposite-direction edges unmodified", () => {
    const f: Franchise = {
      id: "test",
      name: "Test",
      nodes: [node("a"), node("b")],
      edges: [
        {
          id: "e-ab-release",
          from: "a",
          to: "b",
          relation: "sequel",
          strength: "recommended",
          tracks: ["release"],
        },
        {
          id: "e-ba-chrono",
          from: "b",
          to: "a",
          relation: "sequel",
          strength: "recommended",
          tracks: ["chronological"],
        },
      ],
    };

    const normalized = normalizeFranchise(f);

    expect(normalized.edges).toEqual(f.edges);
  });
});
