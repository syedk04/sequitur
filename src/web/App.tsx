import { useMemo, type ReactNode } from "react";
import { Loader2, AlertTriangle, RotateCw } from "lucide-react";
import { analyzeFranchise, normalizeFranchise } from "../engine/index.js";
import { franchiseIdForSearchSelection } from "./lib/franchises.js";
import { useFranchiseState } from "./lib/useFranchiseState.js";
import { useAppUrlState } from "./lib/urlState.js";
import { Header } from "./components/Header.js";
import { FranchisePicker } from "./components/FranchisePicker.js";
import { GraphView } from "./components/GraphView.js";
import { WatchOrderView } from "./components/WatchOrderView.js";
import { TruncatedBanner } from "./components/TruncatedBanner.js";
import "./App.css";

export default function App() {
  const [urlState, updateUrlState] = useAppUrlState();

  const { state: franchiseState, retry } = useFranchiseState(urlState.franchiseId);

  const rawFranchise = franchiseState.status === "loaded" ? franchiseState.franchise : null;

  // The engine normalizes edge direction internally (flipping "prequel"
  // edges into canonical "sequel" edges) but `GraphAnalysisResult` does not
  // expose the normalized franchise back to callers, so the UI normalizes
  // again here to guarantee it renders the same canonical edge directions
  // the analysis pipeline reasoned about.
  const franchise = useMemo(() => (rawFranchise ? normalizeFranchise(rawFranchise) : null), [rawFranchise]);

  const analysis = useMemo(() => (franchise ? analyzeFranchise(franchise) : null), [franchise]);

  const goHome = (): void => {
    updateUrlState(
      {
        franchiseId: null,
        view: "graph",
        track: "release",
        seen: [],
        spoilerSafe: false,
        highlightDivergence: false,
        focusNodeId: null,
      },
      { push: true },
    );
  };

  const selectFranchise = (franchiseId: string): void => {
    updateUrlState(
      {
        franchiseId,
        view: "graph",
        track: "release",
        seen: [],
        spoilerSafe: false,
        highlightDivergence: false,
        focusNodeId: null,
      },
      { push: true },
    );
  };

  const selectAnilistId = (anilistId: number): void => {
    selectFranchise(franchiseIdForSearchSelection(anilistId));
  };

  const renderMain = (): ReactNode => {
    if (!urlState.franchiseId || franchiseState.status === "idle") {
      return <FranchisePicker onSelect={selectFranchise} onSelectAnilistId={selectAnilistId} />;
    }

    if (franchiseState.status === "loading") {
      return (
        <div className="app-shell__status" role="status">
          <Loader2 aria-hidden="true" size={28} className="app-shell__status-spinner" />
          <p>Loading franchise from AniList…</p>
        </div>
      );
    }

    if (franchiseState.status === "error") {
      return (
        <div className="app-shell__status app-shell__status--error" role="alert">
          <AlertTriangle aria-hidden="true" size={28} />
          <p>Couldn&apos;t load this franchise.</p>
          <p className="app-shell__status-detail mono">{franchiseState.message}</p>
          <button type="button" className="app-shell__retry" onClick={retry}>
            <RotateCw aria-hidden="true" size={15} />
            Retry
          </button>
        </div>
      );
    }

    if (!franchise || !analysis) {
      return <FranchisePicker onSelect={selectFranchise} onSelectAnilistId={selectAnilistId} />;
    }

    return (
      <>
        {franchise.truncated && <TruncatedBanner nodeCount={franchise.nodes.length} />}
        {urlState.view === "graph" ? (
          <GraphView franchise={franchise} analysis={analysis} urlState={urlState} updateUrlState={updateUrlState} />
        ) : (
          <WatchOrderView
            franchise={franchise}
            analysis={analysis}
            urlState={urlState}
            updateUrlState={updateUrlState}
          />
        )}
      </>
    );
  };

  return (
    <div className="app-shell">
      <Header
        franchise={franchise}
        view={urlState.view}
        onGoHome={goHome}
        onChangeView={(view) => updateUrlState({ view }, { push: true })}
      />
      <main className="app-shell__main">{renderMain()}</main>
    </div>
  );
}
