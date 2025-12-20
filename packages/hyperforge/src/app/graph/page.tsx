"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Package,
  Sword,
  Shield,
  Hammer,
  Users,
  Skull,
  TreeDeciduous,
  MapPin,
  Coins,
  Link2,
  Home,
  Network,
} from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { RelationshipGraph } from "@/components/graph/RelationshipGraph";
import {
  buildAssetGraph,
  getConnectedNodes,
  getGraphStats,
  type ManifestData,
} from "@/lib/graph/asset-graph";
import type { AssetCategory } from "@/types/core";
import type { RelationshipGraph as RelationshipGraphType, GraphNode } from "@/lib/relationships/relationship-types";
import { ASSET_CATEGORY_COLORS } from "@/lib/relationships/relationship-types";
import { logger } from "@/lib/utils";

const log = logger.child("Page:graph");

// =============================================================================
// CATEGORY ICON COMPONENT
// =============================================================================

function CategoryIcon({
  category,
  className = "w-4 h-4",
  style,
}: {
  category: AssetCategory;
  className?: string;
  style?: React.CSSProperties;
}) {
  switch (category) {
    case "weapon":
      return <Sword className={className} style={style} />;
    case "armor":
      return <Shield className={className} style={style} />;
    case "tool":
      return <Hammer className={className} style={style} />;
    case "item":
      return <Package className={className} style={style} />;
    case "npc":
      return <Users className={className} style={style} />;
    case "mob":
      return <Skull className={className} style={style} />;
    case "resource":
      return <TreeDeciduous className={className} style={style} />;
    case "currency":
      return <Coins className={className} style={style} />;
    case "biome":
      return <MapPin className={className} style={style} />;
    default:
      return <Package className={className} style={style} />;
  }
}

// =============================================================================
// ASSET LIST ITEM
// =============================================================================

function AssetListItem({
  node,
  isSelected,
  onClick,
}: {
  node: GraphNode;
  isSelected: boolean;
  onClick: () => void;
}) {
  const color = ASSET_CATEGORY_COLORS[node.category];

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left
        transition-all duration-150
        ${
          isSelected
            ? "bg-primary/20 border-primary"
            : "hover:bg-glass-bg/50 border-transparent"
        }
        border
      `}
    >
      <div
        className="flex items-center justify-center w-7 h-7 rounded-md shrink-0"
        style={{ backgroundColor: `${color}20` }}
      >
        <CategoryIcon category={node.category} className="w-4 h-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{node.name}</div>
        <div className="text-[10px] uppercase tracking-wider opacity-60" style={{ color }}>
          {node.category}
        </div>
      </div>
      {node.relationshipCount > 0 && (
        <div
          className="text-[10px] font-bold rounded-full px-1.5 py-0.5 shrink-0"
          style={{ backgroundColor: `${color}30`, color }}
        >
          {node.relationshipCount}
        </div>
      )}
    </button>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function GraphPage() {
  // Mount state to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  
  // State
  const [graph, setGraph] = useState<RelationshipGraphType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filterCategory, setFilterCategory] = useState<AssetCategory | "all">("all");
  
  // Set mounted after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load graph data
  const loadGraph = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all manifest data
      const response = await fetch("/api/game/manifests?type=all");
      if (!response.ok) {
        throw new Error("Failed to fetch manifest data");
      }

      const result = await response.json();
      const data = result.data || {};

      // Build the graph from manifest data
      const manifestData: ManifestData = {
        items: data.items || [],
        npcs: data.npcs || [],
        resources: data.resources || [],
        stores: data.stores || [],
        areas: data.areas || [],
      };

      const assetGraph = buildAssetGraph(manifestData);
      setGraph(assetGraph);

      log.info("Graph loaded", {
        nodes: assetGraph.nodes.length,
        edges: assetGraph.edges.length,
      });
    } catch (err) {
      log.error("Failed to load graph", { error: err });
      setError(err instanceof Error ? err.message : "Failed to load graph");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  // Filter and search nodes
  const filteredNodes = useMemo(() => {
    if (!graph) return [];

    let nodes = graph.nodes;

    // Filter by category
    if (filterCategory !== "all") {
      nodes = nodes.filter((n) => n.category === filterCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      nodes = nodes.filter((n) => n.name.toLowerCase().includes(query));
    }

    // Sort by relationship count, then name
    return nodes.sort((a, b) => {
      if (b.relationshipCount !== a.relationshipCount) {
        return b.relationshipCount - a.relationshipCount;
      }
      return a.name.localeCompare(b.name);
    });
  }, [graph, filterCategory, searchQuery]);

  // Get selected node details
  const selectedNode = useMemo(() => {
    if (!graph || !selectedNodeId) return null;
    return graph.nodes.find((n) => n.id === selectedNodeId);
  }, [graph, selectedNodeId]);

  // Get connected nodes for selected
  const connectedNodes = useMemo(() => {
    if (!graph || !selectedNodeId) return null;
    return getConnectedNodes(graph, selectedNodeId);
  }, [graph, selectedNodeId]);

  // Available categories
  const availableCategories = useMemo(() => {
    if (!graph) return [];
    const categories = new Set(graph.nodes.map((n) => n.category));
    return Array.from(categories).sort();
  }, [graph]);

  // Graph stats
  const stats = useMemo(() => {
    if (!graph) return null;
    return getGraphStats(graph);
  }, [graph]);

  // Handle node selection
  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  // Show loading skeleton before hydration to prevent mismatch
  if (!mounted) {
    return (
      <div className="flex h-screen bg-background">
        <div className="w-80 border-r border-glass-border bg-glass-bg/50" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <GlassPanel className="p-8 text-center max-w-md">
          <div className="text-red-400 text-lg mb-2">Failed to Load Graph</div>
          <div className="text-muted-foreground text-sm mb-4">{error}</div>
          <SpectacularButton onClick={loadGraph}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </SpectacularButton>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div
        className={`
          relative transition-all duration-300 ease-in-out border-r border-glass-border
          ${sidebarOpen ? "w-80" : "w-0"}
        `}
      >
        {sidebarOpen && (
          <div className="absolute inset-0 flex flex-col bg-glass-bg/50 backdrop-blur-md overflow-hidden">
            {/* Navigation Header */}
            <div className="px-4 py-3 border-b border-glass-border bg-glass-bg/30">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <Home className="w-3.5 h-3.5" />
                <span>Back to Studio</span>
              </Link>
            </div>

            {/* Header */}
            <div className="p-4 border-b border-glass-border">
              <div className="flex items-center gap-2 mb-1">
                <Network className="w-5 h-5 text-primary" />
                <h1 className="text-lg font-bold">Asset Relationships</h1>
              </div>
              <p className="text-xs text-muted-foreground">
                Visual graph of game asset connections
              </p>
            </div>

            {/* Stats */}
            {stats && (
              <div className="p-4 border-b border-glass-border">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-glass-bg/50 p-2 rounded-lg text-center">
                    <div className="text-xl font-bold text-primary">{stats.totalNodes}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Assets</div>
                  </div>
                  <div className="bg-glass-bg/50 p-2 rounded-lg text-center">
                    <div className="text-xl font-bold text-cyan-400">{stats.totalEdges}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Relations</div>
                  </div>
                </div>
              </div>
            )}

            {/* Search & Filter */}
            <div className="p-4 border-b border-glass-border space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search assets..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-glass-bg border border-glass-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setFilterCategory("all")}
                  className={`
                    px-2 py-1 text-xs rounded-md transition-colors
                    ${filterCategory === "all" ? "bg-primary text-white" : "bg-glass-bg hover:bg-glass-bg/80"}
                  `}
                >
                  All
                </button>
                {availableCategories.map((cat) => {
                  const color = ASSET_CATEGORY_COLORS[cat];
                  const isSelected = filterCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className="px-2 py-1 text-xs rounded-md transition-colors"
                      style={{
                        backgroundColor: isSelected ? color : `${color}20`,
                        color: isSelected ? "white" : color,
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Asset List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredNodes.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  No assets found
                </div>
              ) : (
                filteredNodes.map((node) => (
                  <AssetListItem
                    key={node.id}
                    node={node}
                    isSelected={selectedNodeId === node.id}
                    onClick={() => handleNodeSelect(node.id)}
                  />
                ))
              )}
            </div>

            {/* Selected Node Details */}
            {selectedNode && connectedNodes && (
              <div className="p-4 border-t border-glass-border bg-glass-bg/30">
                <div className="flex items-center gap-2 mb-3">
                  <CategoryIcon
                    category={selectedNode.category}
                    className="w-5 h-5"
                    style={{ color: ASSET_CATEGORY_COLORS[selectedNode.category] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{selectedNode.name}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">
                      {selectedNode.category}
                    </div>
                  </div>
                </div>

                {/* Incoming connections */}
                {connectedNodes.incoming.length > 0 && (
                  <div className="mb-2">
                    <div className="text-[10px] uppercase text-muted-foreground mb-1">
                      Incoming ({connectedNodes.incoming.length})
                    </div>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {connectedNodes.incoming.slice(0, 5).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleNodeSelect(n.id)}
                          className="text-xs text-left w-full px-2 py-1 rounded hover:bg-glass-bg/50 flex items-center gap-1"
                        >
                          <Link2 className="w-3 h-3 text-primary" />
                          <span className="truncate">{n.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outgoing connections */}
                {connectedNodes.outgoing.length > 0 && (
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground mb-1">
                      Outgoing ({connectedNodes.outgoing.length})
                    </div>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {connectedNodes.outgoing.slice(0, 5).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => handleNodeSelect(n.id)}
                          className="text-xs text-left w-full px-2 py-1 rounded hover:bg-glass-bg/50 flex items-center gap-1"
                        >
                          <Link2 className="w-3 h-3 text-cyan-400" />
                          <span className="truncate">{n.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sidebar Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-4 -right-4 z-10 w-8 h-8 flex items-center justify-center bg-glass-bg border border-glass-border rounded-full shadow-lg hover:bg-primary/10 transition-colors"
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Main Graph Area */}
      <div className="flex-1 relative">
        {graph ? (
          <RelationshipGraph
            graph={graph}
            onNodeSelect={handleNodeSelect}
            selectedNodeId={selectedNodeId || undefined}
            isLoading={isLoading}
          />
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <span className="text-muted-foreground">Loading relationship graph...</span>
            </div>
          </div>
        ) : null}

        {/* Top Navigation Bar (visible when sidebar is collapsed) */}
        {!sidebarOpen && (
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 text-sm bg-glass-bg/80 backdrop-blur-md border border-glass-border rounded-lg hover:bg-glass-bg transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Studio</span>
            </Link>
            <div className="flex items-center gap-2 px-3 py-2 text-sm bg-glass-bg/80 backdrop-blur-md border border-glass-border rounded-lg">
              <Network className="w-4 h-4 text-primary" />
              <span className="font-medium">Relationships</span>
            </div>
          </div>
        )}

        {/* Reload Button */}
        <div className="absolute bottom-4 right-4">
          <SpectacularButton size="sm" variant="outline" onClick={loadGraph} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Reload
          </SpectacularButton>
        </div>
      </div>
    </div>
  );
}
