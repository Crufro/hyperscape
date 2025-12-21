"use client";

import { useCallback, useMemo } from "react";
import { useReactFlow, type Node, type Edge } from "@xyflow/react";
import dagre from "@dagrejs/dagre";

export type LayoutDirection = "TB" | "LR" | "BT" | "RL";

interface UseAutoLayoutOptions {
  direction?: LayoutDirection;
  nodeWidth?: number;
  nodeHeight?: number;
  nodeSpacing?: number;
  rankSpacing?: number;
}

const DEFAULT_OPTIONS: Required<UseAutoLayoutOptions> = {
  direction: "TB",
  nodeWidth: 280,
  nodeHeight: 150,
  nodeSpacing: 50,
  rankSpacing: 100,
};

/**
 * Hook for auto-layouting dialogue trees using Dagre
 */
export function useAutoLayout(options: UseAutoLayoutOptions = {}) {
  const { getNodes, getEdges, setNodes, fitView } = useReactFlow();

  // Memoize config to prevent recreating on every render
  const config = useMemo(
    () => ({ ...DEFAULT_OPTIONS, ...options }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally depend on specific properties to avoid object identity issues
    [options.direction, options.nodeWidth, options.nodeHeight, options.nodeSpacing, options.rankSpacing]
  );

  const applyLayout = useCallback(
    (
      nodes: Node[],
      edges: Edge[],
      entryNodeId?: string,
      direction: LayoutDirection = config.direction,
    ) => {
      if (nodes.length === 0) return nodes;

      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));
      dagreGraph.setGraph({
        rankdir: direction,
        nodesep: config.nodeSpacing,
        ranksep: config.rankSpacing,
        marginx: 50,
        marginy: 50,
      });

      // Add nodes to dagre graph
      nodes.forEach((node) => {
        dagreGraph.setNode(node.id, {
          width: config.nodeWidth,
          height: config.nodeHeight,
        });
      });

      // Add edges to dagre graph
      edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
      });

      // Run layout algorithm
      dagre.layout(dagreGraph);

      // Apply new positions to nodes
      const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        if (!nodeWithPosition) return node;

        return {
          ...node,
          position: {
            x: nodeWithPosition.x - config.nodeWidth / 2,
            y: nodeWithPosition.y - config.nodeHeight / 2,
          },
        };
      });

      // If we have an entry node, ensure it's at the top/left
      if (entryNodeId) {
        const entryNode = layoutedNodes.find((n) => n.id === entryNodeId);
        if (entryNode) {
          const minX = Math.min(...layoutedNodes.map((n) => n.position.x));
          const minY = Math.min(...layoutedNodes.map((n) => n.position.y));

          // Adjust all nodes relative to entry node position
          const offsetX = entryNode.position.x - minX;
          const offsetY = entryNode.position.y - minY;

          if (offsetX !== 0 || offsetY !== 0) {
            layoutedNodes.forEach((node) => {
              if (direction === "TB" || direction === "BT") {
                node.position.x -= offsetX;
              } else {
                node.position.y -= offsetY;
              }
            });
          }
        }
      }

      return layoutedNodes;
    },
    [config],
  );

  const runLayout = useCallback(
    (entryNodeId?: string, direction?: LayoutDirection) => {
      const nodes = getNodes();
      const edges = getEdges();
      const layoutedNodes = applyLayout(nodes, edges, entryNodeId, direction);
      setNodes(layoutedNodes);

      // Fit view after layout with animation
      setTimeout(() => {
        fitView({ duration: 500, padding: 0.2 });
      }, 50);
    },
    [getNodes, getEdges, setNodes, fitView, applyLayout],
  );

  const getLayoutedElements = useCallback(
    (
      nodes: Node[],
      edges: Edge[],
      entryNodeId?: string,
      direction?: LayoutDirection,
    ) => {
      return {
        nodes: applyLayout(nodes, edges, entryNodeId, direction),
        edges,
      };
    },
    [applyLayout],
  );

  return {
    runLayout,
    getLayoutedElements,
    applyLayout,
  };
}
