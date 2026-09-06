import { fateNasuverse, monogatari, gundamUC } from "../../fixtures/index.js";
import type { Franchise } from "../../engine/types.js";

export const FRANCHISES: readonly Franchise[] = [fateNasuverse, monogatari, gundamUC];

export const FRANCHISE_BY_ID: ReadonlyMap<string, Franchise> = new Map(
  FRANCHISES.map((franchise) => [franchise.id, franchise]),
);
