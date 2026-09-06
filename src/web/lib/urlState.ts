import { useCallback, useEffect, useState } from "react";
import type { AppUrlState, ViewName } from "../types.js";
import type { OrderingTrack } from "../../engine/types.js";

function readStateFromUrl(): AppUrlState {
  const params = new URLSearchParams(window.location.search);
  const franchiseId = params.get("f");
  const view: ViewName = params.get("v") === "order" ? "order" : "graph";
  const track: OrderingTrack = params.get("t") === "chronological" ? "chronological" : "release";
  const seenParam = params.get("seen");
  const seen = seenParam ? seenParam.split(",").filter(Boolean) : [];
  const spoilerSafe = params.get("safe") === "1";
  const highlightDivergence = params.get("div") === "1";
  const focusNodeId = params.get("node");

  return { franchiseId, view, track, seen, spoilerSafe, highlightDivergence, focusNodeId };
}

function writeStateToUrl(state: AppUrlState, mode: "push" | "replace"): void {
  const params = new URLSearchParams();
  if (state.franchiseId) params.set("f", state.franchiseId);
  if (state.view !== "graph") params.set("v", state.view);
  if (state.track !== "release") params.set("t", state.track);
  if (state.seen.length > 0) params.set("seen", state.seen.join(","));
  if (state.spoilerSafe) params.set("safe", "1");
  if (state.highlightDivergence) params.set("div", "1");
  if (state.focusNodeId) params.set("node", state.focusNodeId);

  const query = params.toString();
  const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;

  if (mode === "push") {
    window.history.pushState(state, "", url);
  } else {
    window.history.replaceState(state, "", url);
  }
}

export interface UpdateOptions {
  /** Push a new history entry instead of replacing the current one. */
  push?: boolean;
}

/**
 * Hook exposing shareable app state synced to the URL's query string, so a
 * link to a specific franchise/track/seen-set/view can be copy-pasted.
 * Intentionally not a full router — just URLSearchParams + state.
 */
export function useAppUrlState(): [AppUrlState, (patch: Partial<AppUrlState>, options?: UpdateOptions) => void] {
  const [state, setState] = useState<AppUrlState>(() => readStateFromUrl());

  useEffect(() => {
    const onPopState = (): void => setState(readStateFromUrl());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const update = useCallback((patch: Partial<AppUrlState>, options?: UpdateOptions): void => {
    setState((prev) => {
      const next: AppUrlState = { ...prev, ...patch };
      writeStateToUrl(next, options?.push ? "push" : "replace");
      return next;
    });
  }, []);

  return [state, update];
}
