import { useEffect, useState } from "react";
import { Search, Loader2, AlertCircle } from "lucide-react";
import { searchAnime } from "../../ingestion/index.js";
import type { AniListSearchResult } from "../../ingestion/index.js";
import "./FranchiseSearch.css";

interface FranchiseSearchProps {
  onSelect: (anilistId: number) => void;
}

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; results: AniListSearchResult[] }
  | { status: "error"; message: string };

const DEBOUNCE_MS = 400;

/**
 * Debounced title search against the live AniList API, used as the entry
 * point for franchises that don't have a hand-curated fixture. Selecting a
 * result hands its AniList id back to the caller, which decides (via
 * `findCuratedFranchiseByAnilistId`) whether to show a curated franchise or
 * fall back to a live crawl — this component only knows about search.
 */
export function FranchiseSearch({ onSelect }: FranchiseSearchProps) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === "") {
      // Nothing to fetch; render logic below hides results based on `query`
      // itself, so there's no need to reset `state` back to "idle" here.
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setState({ status: "loading" });
      searchAnime(trimmed)
        .then((results) => {
          if (!cancelled) setState({ status: "success", results });
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          const message = error instanceof Error ? error.message : "Search failed. Please try again.";
          setState({ status: "error", message });
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const hasQuery = query.trim() !== "";

  return (
    <div className="franchise-search">
      <div className="franchise-search__input-row">
        <Search aria-hidden="true" size={18} className="franchise-search__icon" />
        <input
          type="search"
          className="franchise-search__input"
          placeholder="Search AniList for a title (e.g. Naruto, One Piece)…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search AniList for a franchise"
        />
        {hasQuery && state.status === "loading" && (
          <Loader2 aria-hidden="true" size={16} className="franchise-search__spinner" />
        )}
      </div>

      {hasQuery && state.status === "error" && (
        <p className="franchise-search__message franchise-search__message--error" role="alert">
          <AlertCircle aria-hidden="true" size={14} />
          Couldn&apos;t reach AniList: {state.message}
        </p>
      )}

      {hasQuery && state.status === "success" && state.results.length === 0 && (
        <p className="franchise-search__message" role="status">
          No results for “{query.trim()}”. Try a different title.
        </p>
      )}

      {hasQuery && state.status === "success" && state.results.length > 0 && (
        <ul className="franchise-search__results">
          {state.results.map((result) => {
            const title = result.titleEnglish ?? result.titleRomaji ?? result.titleNative ?? "Untitled";
            const meta = [result.format, result.year].filter((part): part is string | number => Boolean(part));
            return (
              <li key={result.id}>
                <button
                  type="button"
                  className="franchise-search__result"
                  onClick={() => onSelect(result.id)}
                >
                  {result.coverImageUrl ? (
                    <img src={result.coverImageUrl} alt="" className="franchise-search__cover" />
                  ) : (
                    <div
                      className="franchise-search__cover franchise-search__cover--placeholder"
                      aria-hidden="true"
                    />
                  )}
                  <span className="franchise-search__result-info">
                    <span className="franchise-search__result-title">{title}</span>
                    <span className="franchise-search__result-meta mono">
                      {meta.length > 0 ? meta.join(" · ") : "Unknown format/year"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
