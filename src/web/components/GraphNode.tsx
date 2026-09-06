import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ArrowLeftRight, AlertTriangle } from "lucide-react";
import { MEDIA_KIND_ICONS, MEDIA_KIND_LABELS } from "../lib/mediaKindIcons.js";
import type { MediaKind } from "../../engine/types.js";
import "./GraphNode.css";

export interface GraphNodeData extends Record<string, unknown> {
  title: string;
  kind: MediaKind;
  inCycle: boolean;
  isDivergent: boolean;
}

export function GraphNode({ data, selected }: NodeProps) {
  const nodeData = data as GraphNodeData;
  const Icon = MEDIA_KIND_ICONS[nodeData.kind];
  const kindLabel = MEDIA_KIND_LABELS[nodeData.kind];

  const classNames = [
    "graph-node",
    nodeData.inCycle ? "graph-node--cycle" : "",
    selected ? "graph-node--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames}>
      <Handle type="target" position={Position.Left} className="graph-node__handle" />
      {nodeData.inCycle && (
        <span className="graph-node__cycle-flag" title="Part of a detected cycle">
          <AlertTriangle aria-hidden="true" size={12} />
        </span>
      )}
      {nodeData.isDivergent && (
        <span
          className="graph-node__divergent-flag"
          title="Order relative to at least one other node differs between release and chronological tracks"
        >
          <ArrowLeftRight aria-hidden="true" size={12} />
        </span>
      )}
      <div className="graph-node__icon" title={kindLabel}>
        <Icon aria-hidden="true" size={16} />
      </div>
      <div className="graph-node__body">
        <span className="graph-node__title">{nodeData.title}</span>
        <span className="graph-node__kind mono">{kindLabel}</span>
      </div>
      <Handle type="source" position={Position.Right} className="graph-node__handle" />
    </div>
  );
}
