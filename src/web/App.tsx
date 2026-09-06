import { useMemo } from "react";
import { analyzeFranchise, normalizeFranchise } from "../engine/index.js";
import { FRANCHISE_BY_ID } from "./lib/franchises.js";
import { useAppUrlState } from "./lib/urlState.js";
import { Header } from "./components/Header.js";
import { FranchisePicker } from "./components/FranchisePicker.js";
import { GraphView } from "./components/GraphView.js";
import { WatchOrderView } from "./components/WatchOrderView.js";
import "./App.css";

export default function App() {
  const [urlState, updateUrlState] = useAppUrlState();

  const rawFranchise = urlState.franchiseId ? FRANCHISE_BY_ID.get(urlState.franchiseId) ?? null : null;

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

  return (
    <div className="app-shell">
      <Header franchise={franchise} view={urlState.view} onGoHome={goHome} onChangeView={(view) => updateUrlState({ view }, { push: true })} />
      <main className="app-shell__main">
        {!franchise || !analysis ? (
          <FranchisePicker onSelect={selectFranchise} />
        ) : urlState.view === "graph" ? (
          <GraphView franchise={franchise} analysis={analysis} urlState={urlState} updateUrlState={updateUrlState} />
        ) : (
          <WatchOrderView franchise={franchise} analysis={analysis} urlState={urlState} updateUrlState={updateUrlState} />
        )}
      </main>
    </div>
  );
}
