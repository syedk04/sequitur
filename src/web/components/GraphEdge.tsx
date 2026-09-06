import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "@xyflow/react";
import { AlertTriangle } from "lucide-react";
import "./GraphEdge.css";

export interface GraphEdgeData extends Record<string, unknown> {
  strength: "required" | "recommended";
  inCycle: boolean;
  contestedReason: string | null;
}

export function GraphEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}: EdgeProps) {
  const edgeData = data as GraphEdgeData;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const classNames = [
    "graph-edge",
    edgeData.strength === "recommended" ? "graph-edge--recommended" : "graph-edge--required",
    edgeData.inCycle ? "graph-edge--cycle" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} className={classNames} />
      {edgeData.contestedReason && (
        <EdgeLabelRenderer>
          <div
            className="graph-edge__contested-badge"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            title={`Contested: ${edgeData.contestedReason}`}
          >
            <AlertTriangle aria-hidden="true" size={11} />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
