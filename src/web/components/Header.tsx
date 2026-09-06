import { Home, Workflow, ListOrdered, ChevronRight } from "lucide-react";
import type { Franchise } from "../../engine/types.js";
import type { ViewName } from "../types.js";
import "./Header.css";

interface HeaderProps {
  franchise: Franchise | null;
  view: ViewName;
  onGoHome: () => void;
  onChangeView: (view: ViewName) => void;
}

export function Header({ franchise, view, onGoHome, onChangeView }: HeaderProps) {
  return (
    <header className="header">
      <div className="header__brand-row">
        <button type="button" className="header__brand" onClick={onGoHome}>
          <Home aria-hidden="true" size={18} />
          <span>Sequitur</span>
        </button>

        {franchise && (
          <nav aria-label="Breadcrumb" className="header__breadcrumb">
            <ChevronRight aria-hidden="true" size={16} className="header__breadcrumb-sep" />
            <span className="header__breadcrumb-current">{franchise.name}</span>
          </nav>
        )}

        {franchise && (
          <div className="header__tabs" role="tablist" aria-label="Franchise view">
            <button
              type="button"
              role="tab"
              aria-selected={view === "graph"}
              className={`header__tab${view === "graph" ? " header__tab--active" : ""}`}
              onClick={() => onChangeView("graph")}
            >
              <Workflow aria-hidden="true" size={16} />
              <span>Graph</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "order"}
              className={`header__tab${view === "order" ? " header__tab--active" : ""}`}
              onClick={() => onChangeView("order")}
            >
              <ListOrdered aria-hidden="true" size={16} />
              <span>Watch order</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
