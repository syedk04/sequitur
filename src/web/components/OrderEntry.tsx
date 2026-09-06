import { Check } from "lucide-react";
import type { ConsumptionNode } from "../../engine/types.js";
import { MEDIA_KIND_ICONS, MEDIA_KIND_LABELS } from "../lib/mediaKindIcons.js";
import { FILLER_BY_ANILIST_ID } from "../../fixtures/filler/index.js";
import { FillerGuide } from "./FillerGuide.js";
import "./OrderEntry.css";

interface OrderEntryProps {
  node: ConsumptionNode;
  requirement: "required" | "recommended";
  seen: boolean;
  spoilerSafe: boolean;
  onToggleSeen: () => void;
}

export function OrderEntry({ node, requirement, seen, spoilerSafe, onToggleSeen }: OrderEntryProps) {
  const Icon = MEDIA_KIND_ICONS[node.kind];
  const fillerInfo = node.anilistId !== undefined ? FILLER_BY_ANILIST_ID.get(node.anilistId) : undefined;

  return (
    <div className={`order-entry${seen ? " order-entry--seen" : ""}`}>
      <div className="order-entry__icon" title={MEDIA_KIND_LABELS[node.kind]}>
        <Icon aria-hidden="true" size={18} />
      </div>

      <div className="order-entry__body">
        <div className="order-entry__title-row">
          <span className="order-entry__title">{node.title}</span>
          <span
            className={`order-entry__badge order-entry__badge--${requirement}`}
          >
            {requirement === "required" ? "Required" : "Recommended (skippable)"}
          </span>
        </div>
        <span className="order-entry__kind mono">
          {MEDIA_KIND_LABELS[node.kind]}
          {node.releaseDate ? ` · ${node.releaseDate}` : ""}
        </span>
        {fillerInfo && <FillerGuide info={fillerInfo} />}
      </div>

      {spoilerSafe && (
        <label className="order-entry__seen-toggle">
          <input type="checkbox" checked={seen} onChange={onToggleSeen} />
          <span className="order-entry__seen-box" aria-hidden="true">
            {seen && <Check size={14} />}
          </span>
          <span className="order-entry__seen-label">Seen</span>
        </label>
      )}
    </div>
  );
}
