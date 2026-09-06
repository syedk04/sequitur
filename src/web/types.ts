import type { OrderingTrack } from "../engine/types.js";

/** UI-only view state — not engine domain types. */
export type ViewName = "graph" | "order";

export interface AppUrlState {
  franchiseId: string | null;
  view: ViewName;
  track: OrderingTrack;
  seen: string[];
  spoilerSafe: boolean;
  highlightDivergence: boolean;
  focusNodeId: string | null;
}
