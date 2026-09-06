import { AlertTriangle, GitBranch, Layers, ShieldAlert } from "lucide-react";
import type { Franchise, GraphAnalysisResult } from "../../engine/types.js";
import "./FranchiseCard.css";

interface FranchiseCardProps {
  franchise: Franchise;
  analysis: GraphAnalysisResult;
  onSelect: () => void;
}

export function FranchiseCard({ franchise, analysis, onSelect }: FranchiseCardProps) {
  const hasCycle = analysis.tracks.some((track) => !track.isValid);
  const contestedCount = analysis.contestedEdgeIds.length;

  return (
    <button type="button" className="franchise-card" onClick={onSelect}>
      <div className="franchise-card__header">
        <h2 className="franchise-card__title">{franchise.name}</h2>
        {hasCycle && (
          <span className="franchise-card__badge franchise-card__badge--danger">
            <AlertTriangle aria-hidden="true" size={14} />
            Cycle detected
          </span>
        )}
      </div>

      {franchise.description && <p className="franchise-card__description">{franchise.description}</p>}

      <dl className="franchise-card__stats">
        <div className="franchise-card__stat">
          <dt>
            <Layers aria-hidden="true" size={14} />
            <span>Nodes</span>
          </dt>
          <dd>{franchise.nodes.length}</dd>
        </div>
        <div className="franchise-card__stat">
          <dt>
            <GitBranch aria-hidden="true" size={14} />
            <span>Edges</span>
          </dt>
          <dd>{franchise.edges.length}</dd>
        </div>
        <div className="franchise-card__stat">
          <dt>
            <ShieldAlert aria-hidden="true" size={14} />
            <span>Contested</span>
          </dt>
          <dd>{contestedCount}</dd>
        </div>
      </dl>
    </button>
  );
}
