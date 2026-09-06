import { useEffect, useState } from "react";
import { crawl } from "../../ingestion/index.js";
import type { Franchise } from "../../engine/types.js";
import { FRANCHISE_BY_ID } from "./franchises.js";

export type FranchiseState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; franchise: Franchise }
  | { status: "error"; message: string };

/** Matches the franchise id scheme `crawl.ts`/`mapper.ts` produce: `anilist-<rootId>`. */
const ANILIST_FRANCHISE_ID_RE = /^anilist-(\d+)$/;

/**
 * Resolves `franchiseId` (either a curated fixture id or an `anilist-<id>`
 * synthetic id minted by the search flow) into a `Franchise`, exposing the
 * async lifecycle as a discriminated union so `App.tsx` can render a
 * loading/error state instead of just "no franchise yet".
 *
 * Curated ids resolve synchronously (no loading state, matches existing
 * behavior exactly). AniList ids trigger a real network crawl.
 */
export function useFranchiseState(franchiseId: string | null): {
  state: FranchiseState;
  retry: () => void;
} {
  const [state, setState] = useState<FranchiseState>({ status: "idle" });
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    if (!franchiseId) {
      setState({ status: "idle" });
      return;
    }

    const curated = FRANCHISE_BY_ID.get(franchiseId);
    if (curated) {
      setState({ status: "loaded", franchise: curated });
      return;
    }

    const match = ANILIST_FRANCHISE_ID_RE.exec(franchiseId);
    if (!match || !match[1]) {
      setState({ status: "error", message: `Unknown franchise id "${franchiseId}".` });
      return;
    }
    const rootAnilistId = Number(match[1]);

    let cancelled = false;
    setState({ status: "loading" });

    crawl(rootAnilistId)
      .then((franchise) => {
        if (!cancelled) setState({ status: "loaded", franchise });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Failed to load this franchise from AniList.";
        setState({ status: "error", message });
      });

    return () => {
      cancelled = true;
    };
  }, [franchiseId, retryNonce]);

  return { state, retry: () => setRetryNonce((n) => n + 1) };
}
