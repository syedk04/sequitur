import { useMemo } from "react";
import { ReactFlow, Background, Controls, MiniMap, MarkerType, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeftRight } from "lucide-react";
import type { DivergentPair, Franchise, GraphAnalysisResult, OrderingTrack, NodeId } from "../../engine/types.js";
import { trackEdgesFor } from "../../engine/index.js";
import type { AppUrlState } from "../types.js";
import type { UpdateOptions } from "../lib/urlState.js";
import { layoutWithDagre } from "../lib/layout.js";
import { GraphNode, type GraphNodeData } from "./GraphNode.js";
import { GraphEdge, type GraphEdgeData } from "./GraphEdge.js";
import { CycleBanner } from "./CycleBanner.js";
import { NodeDetailPanel } from "./NodeDetailPanel.js";
import "./GraphView.css";

interface GraphViewProps {
  franchise: Franchise;
  analysis: GraphAnalysisResult;
  urlState: AppUrlState;
  updateUrlState: (patch: Partial<AppUrlState>, options?: UpdateOptions) => void;
}

const TRACK_LABELS: Record<OrderingTrack, string> = {
  release: "Release order",
  chronological: "Chronological order",
};

const nodeTypes = { mediaNode: GraphNode };
const edgeTypes = { sequiturEdge: GraphEdge };

export function GraphView({ franchise, analysis, urlState, updateUrlState }: GraphViewProps) {
  const track = urlState.track;
  const trackResult = analysis.tracks.find((t) => t.track === track) ?? null;
  const availableTracks = analysis.tracks.map((t) => t.track);

  const cycleNodeIds = useMemo(
    () => new Set(trackResult?.cycles.flatMap((c) => c.cycleNodes) ?? []),
    [trackResult],
  );
  const cycleEdgeIds = useMemo(
    () => new Set(trackResult?.cycles.flatMap((c) => c.implicatedEdgeIds) ?? []),
    [trackResult],
  );

  const divergentPairsByNode = useMemo(() => {
    const map = new Map<NodeId, DivergentPair[]>();
    for (const pair of analysis.divergentPairs) {
      map.set(pair.a, [...(map.get(pair.a) ?? []), pair]);
      map.set(pair.b, [...(map.get(pair.b) ?? []), pair]);
    }
    return map;
  }, [analysis.divergentPairs]);

  const nodeTitleById = useMemo(() => new Map(franchise.nodes.map((n) => [n.id, n.title])), [franchise.nodes]);

  const { nodes, edges } = useMemo(() => {
    const trackEdges = trackEdgesFor(franchise, track);

    const rawNodes: Node<GraphNodeData>[] = franchise.nodes.map((node) => ({
      id: node.id,
      type: "mediaNode",
      position: { x: 0, y: 0 },
      data: {
        title: node.title,
        kind: node.kind,
        inCycle: cycleNodeIds.has(node.id),
        isDivergent: urlState.highlightDivergence && divergentPairsByNode.has(node.id),
      },
    }));

    const rawEdges: Edge<GraphEdgeData>[] = trackEdges.map((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: "sequiturEdge",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: cycleEdgeIds.has(edge.id) ? "#ef4444" : "#94a3b8",
      },
      data: {
        strength: edge.strength,
        inCycle: cycleEdgeIds.has(edge.id),
        contestedReason: edge.contested?.reason ?? null,
      },
    }));

    const laidOutNodes = layoutWithDagre(rawNodes, rawEdges);
    return { nodes: laidOutNodes, edges: rawEdges };
  }, [franchise, track, cycleNodeIds, cycleEdgeIds, urlState.highlightDivergence, divergentPairsByNode]);

  const selectedNode = urlState.focusNodeId
    ? franchise.nodes.find((n) => n.id === urlState.focusNodeId) ?? null
    : null;

  const flowNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        selected: node.id === urlState.focusNodeId,
      })),
    [nodes, urlState.focusNodeId],
  );

  return (
    <div className="graph-view">
      <div className="graph-view__toolbar">
        <div className="graph-view__track-tabs" role="tablist" aria-label="Ordering track">
          {(["release", "chronological"] as OrderingTrack[]).map((t) => {
            const isAvailable = availableTracks.includes(t);
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={track === t}
                disabled={!isAvailable}
                className={`graph-view__track-tab${track === t ? " graph-view__track-tab--active" : ""}`}
                onClick={() => updateUrlState({ track: t, focusNodeId: null })}
                title={isAvailable ? undefined : "No data for this track"}
              >
                {TRACK_LABELS[t]}
              </button>
            );
          })}
        </div>

        {analysis.divergentPairs.length > 0 && (
          <button
            type="button"
            className={`graph-view__divergence-toggle${urlState.highlightDivergence ? " graph-view__divergence-toggle--active" : ""}`}
            onClick={() => updateUrlState({ highlightDivergence: !urlState.highlightDivergence })}
            aria-pressed={urlState.highlightDivergence}
          >
            <ArrowLeftRight aria-hidden="true" size={15} />
            Highlight divergent order ({analysis.divergentPairs.length})
          </button>
        )}
      </div>

      {trackResult && !trackResult.isValid && (
        <CycleBanner cycles={trackResult.cycles} resetKey={`${franchise.id}:${track}`} />
      )}

      <div className="graph-view__canvas-row">
        <div className="graph-view__canvas">
          <ReactFlow
            nodes={flowNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            onNodeClick={(_, node) => updateUrlState({ focusNodeId: node.id })}
            onPaneClick={() => updateUrlState({ focusNodeId: null })}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={24} color="#334155" />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              nodeColor="#334155"
              maskColor="rgba(15, 23, 42, 0.75)"
              style={{ background: "#1b2336" }}
            />
          </ReactFlow>
          <div className="graph-view__legend">
            <span className="graph-view__legend-item">
              <span className="graph-view__legend-line graph-view__legend-line--required" /> Required
            </span>
            <span className="graph-view__legend-item">
              <span className="graph-view__legend-line graph-view__legend-line--recommended" /> Recommended
            </span>
            <span className="graph-view__legend-item">
              <span className="graph-view__legend-badge graph-view__legend-badge--contested" /> Contested
            </span>
            <span className="graph-view__legend-item">
              <span className="graph-view__legend-badge graph-view__legend-badge--cycle" /> In cycle
            </span>
          </div>
        </div>

        {selectedNode && (
          <NodeDetailPanel
            node={selectedNode}
            divergentPairs={divergentPairsByNode.get(selectedNode.id) ?? []}
            currentTrack={track}
            nodeTitleById={nodeTitleById}
            inCycle={cycleNodeIds.has(selectedNode.id)}
            onClose={() => updateUrlState({ focusNodeId: null })}
          />
        )}
      </div>
    </div>
  );
}
