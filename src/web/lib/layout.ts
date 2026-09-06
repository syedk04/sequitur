import dagre from "dagre";
import type { Node, Edge } from "@xyflow/react";

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 72;

/**
 * Runs a left-to-right dagre layered layout over a set of reactflow nodes
 * and edges, returning new nodes with `position` set. Left-to-right reads
 * better than top-to-bottom for a "watch order" DAG (mirrors reading
 * direction / timeline metaphors).
 */
export function layoutWithDagre<NodeData extends Record<string, unknown>>(
  nodes: Node<NodeData>[],
  edges: Edge[],
): Node<NodeData>[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "LR", nodesep: 32, ranksep: 96, marginx: 24, marginy: 24 });

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const position = graph.node(node.id) as { x: number; y: number } | undefined;
    if (!position) return node;
    return {
      ...node,
      position: {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2,
      },
    };
  });
}
