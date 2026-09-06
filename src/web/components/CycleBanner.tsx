import { useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { CycleReport } from "../../engine/types.js";
import "./CycleBanner.css";

interface CycleBannerProps {
  cycles: CycleReport[];
  /** Distinguishes state across franchise/track changes without remounting. */
  resetKey: string;
}

export function CycleBanner({ cycles, resetKey }: CycleBannerProps) {
  const [acknowledgedKey, setAcknowledgedKey] = useState<string | null>(null);
  const acknowledged = acknowledgedKey === resetKey;

  if (cycles.length === 0) return null;

  if (acknowledged) {
    return (
      <div className="cycle-banner cycle-banner--collapsed" role="status">
        <ShieldAlert aria-hidden="true" size={16} />
        <span>
          This track is invalid: {cycles.length} contradiction{cycles.length === 1 ? "" : "s"} found. No
          full watch order can be generated.
        </span>
        <button type="button" className="cycle-banner__expand" onClick={() => setAcknowledgedKey(null)}>
          Show details
        </button>
      </div>
    );
  }

  return (
    <div className="cycle-banner" role="alert">
      <div className="cycle-banner__heading">
        <AlertTriangle aria-hidden="true" size={20} />
        <h2>Contradiction detected — this track has no valid order</h2>
      </div>
      <p className="cycle-banner__intro">
        The following {cycles.length === 1 ? "cycle creates" : "cycles create"} a contradiction: the
        edges below require some node to be watched before itself. No complete watch order can be
        generated for this track until the underlying data is fixed.
      </p>
      <ul className="cycle-banner__list">
        {cycles.map((cycle, index) => (
          <li key={index} className="cycle-banner__item">
            <span className="mono cycle-banner__path">{cycle.cycleNodes.join(" -> ")}</span>
            <span className="cycle-banner__description">{cycle.description}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="cycle-banner__acknowledge" onClick={() => setAcknowledgedKey(resetKey)}>
        I understand — show me the graph anyway
      </button>
    </div>
  );
}
