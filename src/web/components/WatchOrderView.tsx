import { useMemo } from "react";
import { Eye, EyeOff, Layers } from "lucide-react";
import { filterSpoilers } from "../../engine/index.js";
import type { Franchise, GraphAnalysisResult, NodeId, OrderingTrack } from "../../engine/types.js";
import type { AppUrlState } from "../types.js";
import type { UpdateOptions } from "../lib/urlState.js";
import { OrderEntry } from "./OrderEntry.js";
import { CycleBanner } from "./CycleBanner.js";
import "./WatchOrderView.css";

interface WatchOrderViewProps {
  franchise: Franchise;
  analysis: GraphAnalysisResult;
  urlState: AppUrlState;
  updateUrlState: (patch: Partial<AppUrlState>, options?: UpdateOptions) => void;
}

const TRACK_LABELS: Record<OrderingTrack, string> = {
  release: "Release order",
  chronological: "Chronological order",
};

export type OrderGroup = NodeId[];

/**
 * Greedily partitions a valid topological order into consecutive runs where
 * every pair of nodes in the run is flagged as mutually unconstrained
 * (order-independent) by the engine. This is a presentation-layer heuristic
 * — the engine only exposes pairwise "unconstrained" flags, not pre-built
 * parallel groups — but it produces readable, order-preserving brackets.
 */
function buildGroups(order: NodeId[], unconstrainedPairs: [NodeId, NodeId][]): OrderGroup[] {
  const unconstrainedSet = new Set<string>();
  for (const [a, b] of unconstrainedPairs) {
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    unconstrainedSet.add(key);
  }
  const isUnconstrained = (a: NodeId, b: NodeId): boolean => {
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    return unconstrainedSet.has(key);
  };

  const groups: OrderGroup[] = [];
  let i = 0;
  while (i < order.length) {
    const current = order[i];
    if (current === undefined) break;
    const group: OrderGroup = [current];
    let j = i + 1;
    while (j < order.length) {
      const candidate = order[j];
      if (candidate === undefined) break;
      const fitsGroup = group.every((member) => isUnconstrained(member, candidate));
      if (!fitsGroup) break;
      group.push(candidate);
      j++;
    }
    groups.push(group);
    i = j;
  }
  return groups;
}

function requirementForNode(franchise: Franchise, track: OrderingTrack, nodeId: NodeId): "required" | "recommended" {
  const incoming = franchise.edges.filter((edge) => edge.tracks.includes(track) && edge.to === nodeId);
  if (incoming.length === 0) return "required";
  return incoming.some((edge) => edge.strength === "required") ? "required" : "recommended";
}

export function WatchOrderView({ franchise, analysis, urlState, updateUrlState }: WatchOrderViewProps) {
  const track = urlState.track;
  const trackResult = analysis.tracks.find((t) => t.track === track) ?? null;
  const nodeById = useMemo(() => new Map(franchise.nodes.map((n) => [n.id, n])), [franchise.nodes]);

  const seenSet = useMemo(() => new Set(urlState.seen), [urlState.seen]);

  const fullOrder = useMemo(() => trackResult?.order ?? [], [trackResult]);

  const visibleOrder = useMemo(() => {
    if (!urlState.spoilerSafe) return fullOrder;
    return filterSpoilers(franchise, track, fullOrder, seenSet);
  }, [urlState.spoilerSafe, franchise, track, fullOrder, seenSet]);

  const visibleSet = useMemo(() => new Set(visibleOrder), [visibleOrder]);

  const groups = useMemo(
    () => buildGroups(fullOrder, trackResult?.unconstrainedPairs ?? []),
    [fullOrder, trackResult],
  );

  const hiddenCount = fullOrder.length - visibleOrder.length;

  const toggleSeen = (nodeId: NodeId): void => {
    const next = new Set(urlState.seen);
    if (next.has(nodeId)) {
      next.delete(nodeId);
    } else {
      next.add(nodeId);
    }
    updateUrlState({ seen: [...next] });
  };

  return (
    <div className="watch-order-view">
      <div className="watch-order-view__toolbar">
        <div className="watch-order-view__track-tabs" role="tablist" aria-label="Ordering track">
          {(["release", "chronological"] as OrderingTrack[]).map((t) => {
            const isAvailable = analysis.tracks.some((tr) => tr.track === t);
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={track === t}
                disabled={!isAvailable}
                className={`watch-order-view__track-tab${track === t ? " watch-order-view__track-tab--active" : ""}`}
                onClick={() => updateUrlState({ track: t })}
              >
                {TRACK_LABELS[t]}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={`watch-order-view__spoiler-toggle${urlState.spoilerSafe ? " watch-order-view__spoiler-toggle--active" : ""}`}
          onClick={() => updateUrlState({ spoilerSafe: !urlState.spoilerSafe })}
          aria-pressed={urlState.spoilerSafe}
        >
          {urlState.spoilerSafe ? <Eye aria-hidden="true" size={15} /> : <EyeOff aria-hidden="true" size={15} />}
          Spoiler-safe mode {urlState.spoilerSafe ? "on" : "off"}
        </button>
      </div>

      {urlState.spoilerSafe && (
        <p className="watch-order-view__hidden-note" role="status">
          Showing {visibleOrder.length} of {fullOrder.length} entries.{" "}
          {hiddenCount > 0
            ? `${hiddenCount} entr${hiddenCount === 1 ? "y is" : "ies are"} hidden until their prerequisites are marked seen.`
            : "Nothing is hidden right now."}
        </p>
      )}

      {trackResult && !trackResult.isValid && (
        <CycleBanner cycles={trackResult.cycles} resetKey={`order:${franchise.id}:${track}`} />
      )}

      {trackResult && !trackResult.isValid ? (
        <p className="watch-order-view__no-order">
          No linear watch order can be generated for this track until the cycle above is resolved.
        </p>
      ) : (
        <ol className="watch-order-view__list">
          {groups.map((group, groupIndex) => {
            const visibleMembers = group.filter((id) => visibleSet.has(id));
            if (visibleMembers.length === 0) return null;

            if (visibleMembers.length === 1) {
              const nodeId = visibleMembers[0];
              const node = nodeId ? nodeById.get(nodeId) : undefined;
              if (!node) return null;
              return (
                <li key={groupIndex} className="watch-order-view__item">
                  <OrderEntry
                    node={node}
                    requirement={requirementForNode(franchise, track, node.id)}
                    seen={seenSet.has(node.id)}
                    spoilerSafe={urlState.spoilerSafe}
                    onToggleSeen={() => toggleSeen(node.id)}
                  />
                </li>
              );
            }

            return (
              <li key={groupIndex} className="watch-order-view__group">
                <div className="watch-order-view__group-label">
                  <Layers aria-hidden="true" size={14} />
                  Watch in any order relative to each other
                </div>
                <ul className="watch-order-view__group-list">
                  {visibleMembers.map((nodeId) => {
                    const node = nodeById.get(nodeId);
                    if (!node) return null;
                    return (
                      <li key={nodeId}>
                        <OrderEntry
                          node={node}
                          requirement={requirementForNode(franchise, track, node.id)}
                          seen={seenSet.has(node.id)}
                          spoilerSafe={urlState.spoilerSafe}
                          onToggleSeen={() => toggleSeen(node.id)}
                        />
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
