import { X, ArrowLeftRight, AlertTriangle } from "lucide-react";
import type { ConsumptionNode, DivergentPair, NodeId, OrderingTrack } from "../../engine/types.js";
import { MEDIA_KIND_ICONS, MEDIA_KIND_LABELS } from "../lib/mediaKindIcons.js";
import "./NodeDetailPanel.css";

interface NodeDetailPanelProps {
  node: ConsumptionNode;
  divergentPairs: DivergentPair[];
  currentTrack: OrderingTrack;
  nodeTitleById: Map<NodeId, string>;
  inCycle: boolean;
  onClose: () => void;
}

export function NodeDetailPanel({
  node,
  divergentPairs,
  currentTrack,
  nodeTitleById,
  inCycle,
  onClose,
}: NodeDetailPanelProps) {
  const Icon = MEDIA_KIND_ICONS[node.kind];

  return (
    <aside className="node-detail-panel" aria-label={`Details for ${node.title}`}>
      <button type="button" className="node-detail-panel__close" onClick={onClose} aria-label="Close details">
        <X aria-hidden="true" size={18} />
      </button>

      <div className="node-detail-panel__header">
        <div className="node-detail-panel__icon">
          <Icon aria-hidden="true" size={20} />
        </div>
        <div>
          <h2 className="node-detail-panel__title">{node.title}</h2>
          <span className="node-detail-panel__kind mono">{MEDIA_KIND_LABELS[node.kind]}</span>
        </div>
      </div>

      {inCycle && (
        <p className="node-detail-panel__cycle-note">
          <AlertTriangle aria-hidden="true" size={14} />
          This node is part of a detected cycle on the {currentTrack} track.
        </p>
      )}

      {node.altTitles && node.altTitles.length > 0 && (
        <section className="node-detail-panel__section">
          <h3>Alternate titles</h3>
          <ul>
            {node.altTitles.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        </section>
      )}

      {node.releaseDate && (
        <section className="node-detail-panel__section">
          <h3>Release date</h3>
          <p className="mono">{node.releaseDate}</p>
        </section>
      )}

      {node.inUniverseNote && (
        <section className="node-detail-panel__section">
          <h3>In-universe note</h3>
          <p>{node.inUniverseNote}</p>
        </section>
      )}

      {node.notes && (
        <section className="node-detail-panel__section">
          <h3>Notes</h3>
          <p>{node.notes}</p>
        </section>
      )}

      {divergentPairs.length > 0 && (
        <section className="node-detail-panel__section">
          <h3>
            <ArrowLeftRight aria-hidden="true" size={14} />
            Order diverges from
          </h3>
          <ul className="node-detail-panel__divergence-list">
            {divergentPairs.map((pair, index) => {
              const otherId = pair.a === node.id ? pair.b : pair.a;
              const otherTitle = nodeTitleById.get(otherId) ?? otherId;
              const isA = pair.a === node.id;
              const releaseOrder = pair.order.release;
              const chronoOrder = pair.order.chronological;
              const describeOrder = (order: DivergentPair["order"]["release"]): string => {
                if (order === "unconstrained") return "unconstrained";
                const thisFirst = isA ? order === "a-before-b" : order === "b-before-a";
                return thisFirst ? "before" : "after";
              };
              return (
                <li key={index}>
                  <span className="node-detail-panel__divergence-title">{otherTitle}</span>
                  <span className="node-detail-panel__divergence-detail">
                    release: {describeOrder(releaseOrder)} &middot; chronological: {describeOrder(chronoOrder)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </aside>
  );
}
