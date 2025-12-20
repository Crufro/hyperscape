"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  type NodeMouseHandler,
  MarkerType,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { GlassPanel } from "@/components/ui/glass-panel";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import {
  Search,
  Filter,
  Maximize,
  Loader2,
  Link2,
  Unlink,
  X,
  Eye,
  EyeOff,
} from "lucide-react";

import { graphNodeTypes, type AssetNodeData } from "./GraphNode";
import type { AssetCategory } from "@/types/core";
import type {
  RelationshipType,
  RelationshipGraph as RelationshipGraphType,
  GraphNode as GraphNodeType,
  GraphEdge as GraphEdgeType,
} from "@/lib/relationships/relationship-types";
import {
  ASSET_CATEGORY_COLORS,
  RELATIONSHIP_COLORS,
  RELATIONSHIP_LABELS,
} from "@/lib/relationships/relationship-types";
import {
  filterGraphByCategories,
  filterGraphByRelationships,
  searchNodes,
  getSubgraph,
  getGraphStats,
} from "@/lib/graph/asset-graph";
// Logger available if needed: import { logger } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface RelationshipGraphProps {
  graph: RelationshipGraphType;
  onNodeSelect?: (nodeId: string) => void;
  onRelationshipCreate?: (source: string, target: string, type: RelationshipType) => void;
  selectedNodeId?: string;
  className?: string;
  isLoading?: boolean;
}

// =============================================================================
// LAYOUT UTILITIES
// =============================================================================

/**
 * Simple force-directed layout positioning
 */
function calculateNodePositions(
  nodes: GraphNodeType[],
  _edges: GraphEdgeType[],
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // Group nodes by category for better organization
  const categoryGroups = new Map<AssetCategory, GraphNodeType[]>();
  for (const node of nodes) {
    const group = categoryGroups.get(node.category) || [];
    group.push(node);
    categoryGroups.set(node.category, group);
  }

  const categoryOrder: AssetCategory[] = [
    "biome",
    "mob",
    "npc",
    "resource",
    "weapon",
    "armor",
    "tool",
    "item",
    "currency",
  ];

  let currentY = 0;
  const columnWidth = 200;
  const rowHeight = 120;
  const categorySpacing = 80;

  for (const category of categoryOrder) {
    const group = categoryGroups.get(category);
    if (!group || group.length === 0) continue;

    const nodesPerRow = Math.ceil(Math.sqrt(group.length * 2));
    let col = 0;
    let row = 0;

    for (const node of group) {
      positions.set(node.id, {
        x: col * columnWidth + Math.random() * 30,
        y: currentY + row * rowHeight + Math.random() * 20,
      });

      col++;
      if (col >= nodesPerRow) {
        col = 0;
        row++;
      }
    }

    currentY += (row + 1) * rowHeight + categorySpacing;
  }

  return positions;
}

/**
 * Convert graph data to React Flow nodes/edges
 */
function graphToReactFlow(
  graph: RelationshipGraphType,
  onNodeClick?: (id: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  const positions = calculateNodePositions(graph.nodes, graph.edges);

  const nodes: Node[] = graph.nodes.map((node) => {
    const pos = positions.get(node.id) || { x: 0, y: 0 };
    const nodeType = node.category === "biome" ? "area" : "asset";

    return {
      id: node.id,
      type: nodeType,
      position: pos,
      data: {
        id: node.id,
        name: node.name,
        category: node.category,
        thumbnailUrl: node.thumbnailUrl,
        modelPath: node.modelPath,
        relationshipCount: node.relationshipCount,
        onClick: onNodeClick,
      } as AssetNodeData,
    };
  });

  const edges: Edge[] = graph.edges.map((edge) => {
    const color = RELATIONSHIP_COLORS[edge.relationshipType];
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      animated: edge.relationshipType === "spawns",
      label: edge.label,
      labelStyle: { fontSize: 10, fill: color },
      labelBgStyle: { fill: "rgba(0,0,0,0.7)", fillOpacity: 0.7 },
      labelBgPadding: [4, 2] as [number, number],
      style: { stroke: color, strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
        width: 20,
        height: 20,
      },
      data: {
        relationshipType: edge.relationshipType,
        metadata: edge.metadata,
      },
    };
  });

  return { nodes, edges };
}

// =============================================================================
// INNER COMPONENT
// =============================================================================

function RelationshipGraphInner({
  graph,
  onNodeSelect,
  onRelationshipCreate,
  selectedNodeId,
  isLoading,
}: RelationshipGraphProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView, setCenter, getNode } = useReactFlow();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<AssetCategory>>(new Set());
  const [selectedRelationships, setSelectedRelationships] = useState<Set<RelationshipType>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  // Memoized filtered graph
  const filteredGraph = useMemo(() => {
    let result = graph;

    // Apply category filter
    if (selectedCategories.size > 0) {
      result = filterGraphByCategories(result, Array.from(selectedCategories));
    }

    // Apply relationship filter
    if (selectedRelationships.size > 0) {
      result = filterGraphByRelationships(result, Array.from(selectedRelationships));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const matchingNodes = searchNodes(result, searchQuery);
      const matchingIds = new Set(matchingNodes.map((n) => n.id));
      result = {
        nodes: result.nodes.filter((n) => matchingIds.has(n.id)),
        edges: result.edges.filter(
          (e) => matchingIds.has(e.source) || matchingIds.has(e.target),
        ),
      };
    }

    // Focus on specific node
    if (focusedNodeId) {
      result = getSubgraph(result, focusedNodeId, 2);
    }

    return result;
  }, [graph, selectedCategories, selectedRelationships, searchQuery, focusedNodeId]);

  // Convert to React Flow format
  const { initialNodes, initialEdges } = useMemo(() => {
    const { nodes, edges } = graphToReactFlow(filteredGraph, onNodeSelect);
    return { initialNodes: nodes, initialEdges: edges };
  }, [filteredGraph, onNodeSelect]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes/edges when graph changes
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = graphToReactFlow(filteredGraph, onNodeSelect);
    setNodes(newNodes);
    setEdges(newEdges);
  }, [filteredGraph, onNodeSelect, setNodes, setEdges]);

  // Center on selected node
  useEffect(() => {
    if (selectedNodeId) {
      const node = getNode(selectedNodeId);
      if (node) {
        setCenter(node.position.x + 60, node.position.y + 40, { duration: 500, zoom: 1.5 });
      }
    }
  }, [selectedNodeId, getNode, setCenter]);

  // Handle new connections
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target && onRelationshipCreate) {
        // Default to "requires" for manual connections
        onRelationshipCreate(connection.source, connection.target, "requires");
      }
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            style: { stroke: RELATIONSHIP_COLORS.requires, strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: RELATIONSHIP_COLORS.requires },
          },
          eds,
        ),
      );
    },
    [onRelationshipCreate, setEdges],
  );

  // Node click handler
  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (onNodeSelect) {
        onNodeSelect(node.id);
      }
    },
    [onNodeSelect],
  );

  // Toggle category filter
  const toggleCategory = (category: AssetCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Toggle relationship filter
  const toggleRelationship = (type: RelationshipType) => {
    setSelectedRelationships((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategories(new Set());
    setSelectedRelationships(new Set());
    setFocusedNodeId(null);
  };

  // Graph stats
  const stats = useMemo(() => getGraphStats(filteredGraph), [filteredGraph]);

  // Categories present in the graph
  const presentCategories = useMemo(
    () => new Set(graph.nodes.map((n) => n.category)),
    [graph.nodes],
  );

  // Relationship types present in the graph
  const presentRelationships = useMemo(
    () => new Set(graph.edges.map((e) => e.relationshipType)),
    [graph.edges],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading graph data...</span>
        </div>
      </div>
    );
  }

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        nodeTypes={graphNodeTypes}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        minZoom={0.1}
        maxZoom={2}
        className="bg-gradient-to-br from-background to-background/80"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="oklch(var(--muted-foreground) / 0.1)"
        />

        <Controls
          className="!bg-glass-bg/90 !border-glass-border !rounded-xl overflow-hidden"
          showZoom
          showFitView
          showInteractive={false}
        />

        <MiniMap
          className="!bg-glass-bg/90 !border-glass-border !rounded-xl overflow-hidden"
          nodeColor={(node) => {
            const data = node.data as AssetNodeData;
            return ASSET_CATEGORY_COLORS[data.category] || "#6b7280";
          }}
          maskColor="oklch(var(--background) / 0.8)"
          pannable
          zoomable
        />

        {/* Top Toolbar */}
        <Panel position="top-left" className="flex gap-2 items-start">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="pl-9 pr-8 py-2 w-56 text-sm bg-glass-bg/90 backdrop-blur-md border border-glass-border rounded-lg focus:outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <SpectacularButton
            size="sm"
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-1" />
            Filters
            {(selectedCategories.size > 0 || selectedRelationships.size > 0) && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary/20 rounded">
                {selectedCategories.size + selectedRelationships.size}
              </span>
            )}
          </SpectacularButton>

          {/* Labels Toggle */}
          <SpectacularButton
            size="sm"
            variant="ghost"
            onClick={() => setShowLabels(!showLabels)}
            title={showLabels ? "Hide edge labels" : "Show edge labels"}
          >
            {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </SpectacularButton>

          {/* Layout */}
          <SpectacularButton
            size="sm"
            variant="ghost"
            onClick={() => fitView({ duration: 500, padding: 0.2 })}
            title="Fit view"
          >
            <Maximize className="w-4 h-4" />
          </SpectacularButton>

          {/* Clear Focus */}
          {focusedNodeId && (
            <SpectacularButton
              size="sm"
              variant="outline"
              onClick={() => setFocusedNodeId(null)}
            >
              <Unlink className="w-4 h-4 mr-1" />
              Clear Focus
            </SpectacularButton>
          )}
        </Panel>

        {/* Filter Panel */}
        {showFilters && (
          <Panel position="top-right">
            <GlassPanel className="p-4 w-72 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Filters</h3>
                {(selectedCategories.size > 0 || selectedRelationships.size > 0) && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-primary hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* Category Filters */}
              <div className="mb-4">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Asset Types
                </h4>
                <div className="flex flex-wrap gap-1">
                  {Array.from(presentCategories).map((category) => {
                    const isSelected = selectedCategories.has(category);
                    const color = ASSET_CATEGORY_COLORS[category];
                    return (
                      <button
                        key={category}
                        onClick={() => toggleCategory(category)}
                        className={`
                          px-2 py-1 text-xs rounded-md transition-all
                          ${
                            isSelected
                              ? "text-white"
                              : "bg-glass-bg hover:opacity-80 border border-glass-border"
                          }
                        `}
                        style={{
                          backgroundColor: isSelected ? color : undefined,
                          borderColor: isSelected ? color : undefined,
                          color: isSelected ? "white" : color,
                        }}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Relationship Filters */}
              <div className="mb-4">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Relationship Types
                </h4>
                <div className="flex flex-wrap gap-1">
                  {Array.from(presentRelationships).map((type) => {
                    const isSelected = selectedRelationships.has(type);
                    const color = RELATIONSHIP_COLORS[type];
                    const label = RELATIONSHIP_LABELS[type].verb;
                    return (
                      <button
                        key={type}
                        onClick={() => toggleRelationship(type)}
                        className={`
                          px-2 py-1 text-xs rounded-md transition-all flex items-center gap-1
                          ${
                            isSelected
                              ? "text-white"
                              : "bg-glass-bg hover:opacity-80 border border-glass-border"
                          }
                        `}
                        style={{
                          backgroundColor: isSelected ? color : undefined,
                          borderColor: isSelected ? color : undefined,
                          color: isSelected ? "white" : color,
                        }}
                      >
                        <Link2 className="w-3 h-3" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stats */}
              <div className="pt-3 border-t border-glass-border">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Graph Stats
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-glass-bg/50 p-2 rounded">
                    <div className="text-lg font-bold text-primary">{stats.totalNodes}</div>
                    <div className="text-muted-foreground">Nodes</div>
                  </div>
                  <div className="bg-glass-bg/50 p-2 rounded">
                    <div className="text-lg font-bold text-cyan-400">{stats.totalEdges}</div>
                    <div className="text-muted-foreground">Edges</div>
                  </div>
                </div>
              </div>
            </GlassPanel>
          </Panel>
        )}

        {/* Stats Panel (bottom) */}
        <Panel position="bottom-left">
          <div className="flex items-center gap-4 px-3 py-2 bg-glass-bg/80 backdrop-blur-md rounded-lg border border-glass-border text-xs">
            <span className="text-muted-foreground">
              {stats.totalNodes} nodes • {stats.totalEdges} relationships
            </span>
            {focusedNodeId && (
              <span className="text-primary">
                Focused on: {focusedNodeId}
              </span>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT WITH PROVIDER
// =============================================================================

export function RelationshipGraph(props: RelationshipGraphProps) {
  return (
    <ReactFlowProvider>
      <RelationshipGraphInner {...props} />
    </ReactFlowProvider>
  );
}
