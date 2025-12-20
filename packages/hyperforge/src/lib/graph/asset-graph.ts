/**
 * Asset Graph Builder
 *
 * Builds a relationship graph from game manifest data.
 * Extracts relationships between assets:
 * - Mobs drop Items
 * - Resources yield Items
 * - NPCs manage Stores
 * - Stores sell Items
 * - Areas spawn Mobs/NPCs/Resources
 * - Tools harvest Resources
 */

import type { AssetCategory } from "@/types/core";
import type {
  RelationshipType,
  GraphNode,
  GraphEdge,
  RelationshipGraph,
  RelationshipMetadata,
} from "@/lib/relationships/relationship-types";
import {
  RELATIONSHIP_LABELS,
  ASSET_CATEGORY_COLORS,
} from "@/lib/relationships/relationship-types";
import type {
  ItemDefinition,
  NpcDefinition,
  ResourceDefinition,
  StoreDefinition,
  WorldArea,
} from "@/lib/game/manifests";
import { logger } from "@/lib/utils";

const log = logger.child("AssetGraph");

// =============================================================================
// MANIFEST DATA INTERFACE
// =============================================================================

/**
 * Combined manifest data for building the graph
 */
export interface ManifestData {
  items: ItemDefinition[];
  npcs: NpcDefinition[];
  resources: ResourceDefinition[];
  stores: StoreDefinition[];
  areas: WorldArea[];
}

// =============================================================================
// GRAPH BUILDING
// =============================================================================

/**
 * Build a complete relationship graph from manifest data
 */
export function buildAssetGraph(manifests: ManifestData): RelationshipGraph {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  log.debug("Building asset graph", {
    items: manifests.items.length,
    npcs: manifests.npcs.length,
    resources: manifests.resources.length,
    stores: manifests.stores.length,
    areas: manifests.areas.length,
  });

  // Add all items as nodes
  for (const item of manifests.items) {
    const category = getItemCategory(item);
    nodes.set(item.id, {
      id: item.id,
      name: item.name,
      category,
      thumbnailUrl: item.iconPath,
      modelPath: item.modelPath ?? undefined,
      relationshipCount: 0,
    });
  }

  // Add all NPCs/mobs as nodes
  for (const npc of manifests.npcs) {
    const category: AssetCategory = npc.category === "mob" ? "mob" : "npc";
    nodes.set(npc.id, {
      id: npc.id,
      name: npc.name,
      category,
      thumbnailUrl: npc.appearance?.iconPath,
      modelPath: npc.appearance?.modelPath,
      relationshipCount: 0,
    });
  }

  // Add all resources as nodes
  for (const resource of manifests.resources) {
    nodes.set(resource.id, {
      id: resource.id,
      name: resource.name,
      category: "resource",
      modelPath: resource.modelPath ?? undefined,
      relationshipCount: 0,
    });
  }

  // Add stores as nodes (using NPC category since they're managed by NPCs)
  for (const store of manifests.stores) {
    nodes.set(store.id, {
      id: store.id,
      name: store.name,
      category: "npc", // Stores are represented as NPC-like entities
      relationshipCount: 0,
    });
  }

  // Add areas as nodes
  for (const area of manifests.areas) {
    nodes.set(area.id, {
      id: area.id,
      name: area.name,
      category: "biome",
      relationshipCount: 0,
    });
  }

  // Extract relationships

  // 1. Mob/NPC drops → Items
  for (const npc of manifests.npcs) {
    if (npc.drops) {
      const allDrops = [
        ...(npc.drops.always || []),
        ...(npc.drops.common || []),
        ...(npc.drops.uncommon || []),
        ...(npc.drops.rare || []),
        ...(npc.drops.veryRare || []),
      ];

      for (const drop of allDrops) {
        if (nodes.has(drop.itemId)) {
          edges.push(createEdge(npc.id, drop.itemId, "drops", {
            chance: drop.chance,
            minQuantity: drop.minQuantity,
            maxQuantity: drop.maxQuantity,
            rarity: drop.rarity,
          }));
          incrementRelationshipCount(nodes, npc.id);
          incrementRelationshipCount(nodes, drop.itemId);
        }
      }
    }
  }

  // 2. Resources yield → Items
  for (const resource of manifests.resources) {
    if (resource.harvestYield) {
      for (const yield_ of resource.harvestYield) {
        if (nodes.has(yield_.itemId)) {
          edges.push(createEdge(resource.id, yield_.itemId, "yields", {
            chance: yield_.chance,
            minQuantity: yield_.quantity,
            maxQuantity: yield_.quantity,
          }));
          incrementRelationshipCount(nodes, resource.id);
          incrementRelationshipCount(nodes, yield_.itemId);
        }
      }
    }

    // 3. Tools harvest → Resources
    if (resource.toolRequired) {
      const toolId = resource.toolRequired;
      if (nodes.has(toolId)) {
        edges.push(createEdge(toolId, resource.id, "harvests", {
          levelRequired: resource.levelRequired,
          skillName: resource.harvestSkill,
        }));
        incrementRelationshipCount(nodes, toolId);
        incrementRelationshipCount(nodes, resource.id);
      }
    }
  }

  // 4. Stores sell → Items
  for (const store of manifests.stores) {
    for (const storeItem of store.items) {
      if (nodes.has(storeItem.itemId)) {
        edges.push(createEdge(store.id, storeItem.itemId, "sells", {
          price: storeItem.price,
          stockQuantity: storeItem.stockQuantity,
        }));
        incrementRelationshipCount(nodes, store.id);
        incrementRelationshipCount(nodes, storeItem.itemId);
      }
    }
  }

  // 5. NPCs manage → Stores (from area spawn data)
  for (const area of manifests.areas) {
    if (area.npcs) {
      for (const spawn of area.npcs) {
        if (spawn.storeId && nodes.has(spawn.id) && nodes.has(spawn.storeId)) {
          edges.push(createEdge(spawn.id, spawn.storeId, "manages"));
          incrementRelationshipCount(nodes, spawn.id);
          incrementRelationshipCount(nodes, spawn.storeId);
        }
      }
    }
  }

  // 6. Areas spawn → Mobs/NPCs/Resources
  for (const area of manifests.areas) {
    // NPCs in area
    if (area.npcs) {
      for (const spawn of area.npcs) {
        if (nodes.has(spawn.id)) {
          // Include position to ensure unique edge IDs for multiple spawns of same type
          const posKey = `${Math.round(spawn.position.x)}_${Math.round(spawn.position.z)}`;
          edges.push(createEdgeWithSuffix(area.id, spawn.id, "spawns", posKey));
          incrementRelationshipCount(nodes, area.id);
          incrementRelationshipCount(nodes, spawn.id);
        }
      }
    }

    // Resources in area
    if (area.resources) {
      for (const spawn of area.resources) {
        if (nodes.has(spawn.resourceId)) {
          // Include position to ensure unique edge IDs for multiple spawns of same type
          const posKey = `${Math.round(spawn.position.x)}_${Math.round(spawn.position.z)}`;
          edges.push(createEdgeWithSuffix(area.id, spawn.resourceId, "spawns", posKey));
          incrementRelationshipCount(nodes, area.id);
          incrementRelationshipCount(nodes, spawn.resourceId);
        }
      }
    }

    // Mobs in area
    if (area.mobSpawns) {
      for (const spawn of area.mobSpawns) {
        if (nodes.has(spawn.mobId)) {
          // Include position to ensure unique edge IDs for multiple spawns of same type
          const posKey = `${Math.round(spawn.position.x)}_${Math.round(spawn.position.z)}`;
          edges.push(createEdgeWithSuffix(area.id, spawn.mobId, "spawns", posKey, {
            spawnRadius: spawn.spawnRadius,
            maxCount: spawn.maxCount,
          }));
          incrementRelationshipCount(nodes, area.id);
          incrementRelationshipCount(nodes, spawn.mobId);
        }
      }
    }
  }

  log.info("Asset graph built", {
    nodes: nodes.size,
    edges: edges.length,
  });

  return {
    nodes: Array.from(nodes.values()),
    edges,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Determine item category from item definition
 */
function getItemCategory(item: ItemDefinition): AssetCategory {
  switch (item.type) {
    case "weapon":
      return "weapon";
    case "armor":
      return "armor";
    case "tool":
      return "tool";
    case "resource":
      return "resource";
    case "currency":
      return "currency";
    default:
      return "item";
  }
}

/**
 * Create a graph edge with proper labeling
 */
function createEdge(
  source: string,
  target: string,
  relationshipType: RelationshipType,
  metadata?: RelationshipMetadata,
): GraphEdge {
  return {
    id: `${source}-${relationshipType}-${target}`,
    source,
    target,
    relationshipType,
    metadata,
    label: RELATIONSHIP_LABELS[relationshipType].verb,
  };
}

/**
 * Create a graph edge with a suffix for uniqueness (e.g., for spawn positions)
 */
function createEdgeWithSuffix(
  source: string,
  target: string,
  relationshipType: RelationshipType,
  suffix: string,
  metadata?: RelationshipMetadata,
): GraphEdge {
  return {
    id: `${source}-${relationshipType}-${target}-${suffix}`,
    source,
    target,
    relationshipType,
    metadata,
    label: RELATIONSHIP_LABELS[relationshipType].verb,
  };
}

/**
 * Increment relationship count for a node
 */
function incrementRelationshipCount(nodes: Map<string, GraphNode>, nodeId: string): void {
  const node = nodes.get(nodeId);
  if (node) {
    node.relationshipCount++;
  }
}

// =============================================================================
// GRAPH TRAVERSAL UTILITIES
// =============================================================================

/**
 * Get all nodes connected to a given node
 */
export function getConnectedNodes(
  graph: RelationshipGraph,
  nodeId: string,
): { incoming: GraphNode[]; outgoing: GraphNode[] } {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  const incoming: GraphNode[] = [];
  const outgoing: GraphNode[] = [];

  for (const edge of graph.edges) {
    if (edge.target === nodeId) {
      const sourceNode = nodeMap.get(edge.source);
      if (sourceNode) incoming.push(sourceNode);
    }
    if (edge.source === nodeId) {
      const targetNode = nodeMap.get(edge.target);
      if (targetNode) outgoing.push(targetNode);
    }
  }

  return { incoming, outgoing };
}

/**
 * Get all edges connected to a node
 */
export function getNodeEdges(
  graph: RelationshipGraph,
  nodeId: string,
): { incoming: GraphEdge[]; outgoing: GraphEdge[] } {
  const incoming = graph.edges.filter((e) => e.target === nodeId);
  const outgoing = graph.edges.filter((e) => e.source === nodeId);
  return { incoming, outgoing };
}

/**
 * Filter graph by asset categories
 */
export function filterGraphByCategories(
  graph: RelationshipGraph,
  categories: AssetCategory[],
): RelationshipGraph {
  const filteredNodes = graph.nodes.filter((n) => categories.includes(n.category));
  const nodeIds = new Set(filteredNodes.map((n) => n.id));

  const filteredEdges = graph.edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target),
  );

  return { nodes: filteredNodes, edges: filteredEdges };
}

/**
 * Filter graph by relationship types
 */
export function filterGraphByRelationships(
  graph: RelationshipGraph,
  relationshipTypes: RelationshipType[],
): RelationshipGraph {
  const filteredEdges = graph.edges.filter((e) =>
    relationshipTypes.includes(e.relationshipType),
  );

  // Keep only nodes that have at least one edge
  const connectedNodeIds = new Set<string>();
  for (const edge of filteredEdges) {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  }

  const filteredNodes = graph.nodes.filter((n) => connectedNodeIds.has(n.id));

  return { nodes: filteredNodes, edges: filteredEdges };
}

/**
 * Search nodes by name
 */
export function searchNodes(graph: RelationshipGraph, query: string): GraphNode[] {
  const lowerQuery = query.toLowerCase();
  return graph.nodes.filter((n) => n.name.toLowerCase().includes(lowerQuery));
}

/**
 * Get subgraph centered on a node with depth limit
 */
export function getSubgraph(
  graph: RelationshipGraph,
  centerId: string,
  depth: number = 2,
): RelationshipGraph {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const visitedIds = new Set<string>();
  const includedEdges: GraphEdge[] = [];

  function traverse(nodeId: string, currentDepth: number): void {
    if (currentDepth > depth || visitedIds.has(nodeId)) return;
    visitedIds.add(nodeId);

    for (const edge of graph.edges) {
      if (edge.source === nodeId && !visitedIds.has(edge.target)) {
        includedEdges.push(edge);
        traverse(edge.target, currentDepth + 1);
      }
      if (edge.target === nodeId && !visitedIds.has(edge.source)) {
        includedEdges.push(edge);
        traverse(edge.source, currentDepth + 1);
      }
    }
  }

  traverse(centerId, 0);

  const includedNodes = Array.from(visitedIds)
    .map((id) => nodeMap.get(id))
    .filter((n): n is GraphNode => n !== undefined);

  return { nodes: includedNodes, edges: includedEdges };
}

/**
 * Calculate graph statistics
 */
export function getGraphStats(graph: RelationshipGraph): {
  totalNodes: number;
  totalEdges: number;
  nodesByCategory: Record<AssetCategory, number>;
  edgesByType: Record<RelationshipType, number>;
  mostConnected: GraphNode[];
} {
  const nodesByCategory = {} as Record<AssetCategory, number>;
  const edgesByType = {} as Record<RelationshipType, number>;

  for (const node of graph.nodes) {
    nodesByCategory[node.category] = (nodesByCategory[node.category] || 0) + 1;
  }

  for (const edge of graph.edges) {
    edgesByType[edge.relationshipType] = (edgesByType[edge.relationshipType] || 0) + 1;
  }

  const mostConnected = [...graph.nodes]
    .sort((a, b) => b.relationshipCount - a.relationshipCount)
    .slice(0, 10);

  return {
    totalNodes: graph.nodes.length,
    totalEdges: graph.edges.length,
    nodesByCategory,
    edgesByType,
    mostConnected,
  };
}

/**
 * Get color for asset category
 */
export function getCategoryColor(category: AssetCategory): string {
  return ASSET_CATEGORY_COLORS[category] || "#6b7280";
}
