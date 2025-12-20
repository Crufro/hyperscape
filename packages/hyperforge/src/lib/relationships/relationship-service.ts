/**
 * Relationship Service
 *
 * Parses game manifests to extract and manage relationships between assets.
 * Provides CRUD operations for the relationship graph.
 */

import { logger } from "@/lib/utils";
import {
  getAllItems,
  getAllNpcs,
  getAllResources,
  getAllStores,
  getAllAreas,
  type ItemDefinition,
  type NpcDefinition,
  type ResourceDefinition,
  type StoreDefinition,
  type WorldArea,
} from "@/lib/game/manifests";
import type { AssetCategory } from "@/types/core";
import {
  type AssetRelationship,
  type RelationshipType,
  type RelationshipMetadata,
  type GraphNode,
  type GraphEdge,
  type RelationshipGraph,
  isValidRelationship,
  RELATIONSHIP_LABELS,
} from "./relationship-types";

const log = logger.child("RelationshipService");

// =============================================================================
// RELATIONSHIP EXTRACTION
// =============================================================================

/**
 * Extract relationships from NPC drops
 */
function extractDropRelationships(
  npcs: NpcDefinition[],
  items: Map<string, ItemDefinition>,
): AssetRelationship[] {
  const relationships: AssetRelationship[] = [];

  for (const npc of npcs) {
    if (!npc.drops) continue;

    const allDrops = [
      ...(npc.drops.always || []),
      ...(npc.drops.common || []),
      ...(npc.drops.uncommon || []),
      ...(npc.drops.rare || []),
      ...(npc.drops.veryRare || []),
    ];

    for (const drop of allDrops) {
      const item = items.get(drop.itemId);
      const itemCategory = getItemCategory(item);

      relationships.push({
        id: `${npc.id}_drops_${drop.itemId}`,
        sourceId: npc.id,
        sourceType: npc.category === "mob" ? "mob" : "npc",
        sourceName: npc.name,
        targetId: drop.itemId,
        targetType: itemCategory,
        targetName: item?.name || drop.itemId,
        relationshipType: "drops",
        metadata: {
          chance: drop.chance,
          minQuantity: drop.minQuantity,
          maxQuantity: drop.maxQuantity,
          rarity: drop.rarity,
        },
      });
    }
  }

  return relationships;
}

/**
 * Extract relationships from resource yields
 */
function extractYieldRelationships(
  resources: ResourceDefinition[],
  items: Map<string, ItemDefinition>,
): AssetRelationship[] {
  const relationships: AssetRelationship[] = [];

  for (const resource of resources) {
    if (!resource.harvestYield) continue;

    for (const yield_ of resource.harvestYield) {
      const item = items.get(yield_.itemId);
      const itemCategory = getItemCategory(item);

      relationships.push({
        id: `${resource.id}_yields_${yield_.itemId}`,
        sourceId: resource.id,
        sourceType: "resource",
        sourceName: resource.name,
        targetId: yield_.itemId,
        targetType: itemCategory,
        targetName: item?.name || yield_.itemName || yield_.itemId,
        relationshipType: "yields",
        metadata: {
          chance: yield_.chance,
          minQuantity: yield_.quantity,
          maxQuantity: yield_.quantity,
        },
      });
    }
  }

  return relationships;
}

/**
 * Extract relationships from store inventories
 */
function extractStoreRelationships(
  stores: StoreDefinition[],
  npcs: NpcDefinition[],
  items: Map<string, ItemDefinition>,
): AssetRelationship[] {
  const relationships: AssetRelationship[] = [];

  // Find NPC that manages each store (by matching store ID in NPC services)
  const storeToNpc = new Map<string, NpcDefinition>();
  for (const npc of npcs) {
    if (npc.services?.enabled && npc.services.types?.includes("shop")) {
      // Try to find associated store by NPC ID pattern
      const possibleStoreIds = [
        `${npc.id}_store`,
        npc.id.replace(/_keeper$|_vendor$|_merchant$/, "_store"),
        `general_store`, // Default fallback
      ];
      for (const storeId of possibleStoreIds) {
        const store = stores.find((s) => s.id === storeId);
        if (store) {
          storeToNpc.set(store.id, npc);
          break;
        }
      }
    }
  }

  for (const store of stores) {
    const managerNpc = storeToNpc.get(store.id);

    // Create NPC -> Store relationship if we found the manager
    if (managerNpc) {
      relationships.push({
        id: `${managerNpc.id}_manages_${store.id}`,
        sourceId: managerNpc.id,
        sourceType: "npc",
        sourceName: managerNpc.name,
        targetId: store.id,
        targetType: "npc", // Stores are conceptually NPCs
        targetName: store.name,
        relationshipType: "manages",
      });
    }

    // Create Store -> Item relationships
    for (const storeItem of store.items) {
      const item = items.get(storeItem.itemId);
      const itemCategory = getItemCategory(item);
      const sellerId = managerNpc?.id || store.id;
      const sellerName = managerNpc?.name || store.name;

      relationships.push({
        id: `${sellerId}_sells_${storeItem.itemId}`,
        sourceId: sellerId,
        sourceType: "npc",
        sourceName: sellerName,
        targetId: storeItem.itemId,
        targetType: itemCategory,
        targetName: item?.name || storeItem.name,
        relationshipType: "sells",
        metadata: {
          price: storeItem.price,
          stockQuantity: storeItem.stockQuantity,
        },
      });
    }
  }

  return relationships;
}

/**
 * Extract relationships from world area spawns
 */
function extractSpawnRelationships(
  areas: WorldArea[],
  npcs: Map<string, NpcDefinition>,
  resources: Map<string, ResourceDefinition>,
): AssetRelationship[] {
  const relationships: AssetRelationship[] = [];

  for (const area of areas) {
    // NPC spawns
    if (area.npcs) {
      for (const spawn of area.npcs) {
        const npc = npcs.get(spawn.id);
        // Include position to ensure unique IDs for multiple spawns of same type
        const posKey = `${Math.round(spawn.position.x)}_${Math.round(spawn.position.z)}`;
        relationships.push({
          id: `${area.id}_spawns_${spawn.id}_${posKey}`,
          sourceId: area.id,
          sourceType: "biome",
          sourceName: area.name,
          targetId: spawn.id,
          targetType: npc?.category === "mob" ? "mob" : "npc",
          targetName: npc?.name || spawn.id,
          relationshipType: "spawns",
        });
      }
    }

    // Resource spawns
    if (area.resources) {
      for (const spawn of area.resources) {
        const resource = resources.get(spawn.resourceId);
        // Include position to ensure unique IDs for multiple spawns of same type
        const posKey = `${Math.round(spawn.position.x)}_${Math.round(spawn.position.z)}`;
        relationships.push({
          id: `${area.id}_spawns_${spawn.resourceId}_${posKey}`,
          sourceId: area.id,
          sourceType: "biome",
          sourceName: area.name,
          targetId: spawn.resourceId,
          targetType: "resource",
          targetName: resource?.name || spawn.resourceId,
          relationshipType: "spawns",
        });
      }
    }

    // Mob spawns
    if (area.mobSpawns) {
      for (const spawn of area.mobSpawns) {
        const mob = npcs.get(spawn.mobId);
        // Include position to ensure unique IDs for multiple spawns of same type
        const posKey = `${Math.round(spawn.position.x)}_${Math.round(spawn.position.z)}`;
        relationships.push({
          id: `${area.id}_spawns_${spawn.mobId}_${posKey}`,
          sourceId: area.id,
          sourceType: "biome",
          sourceName: area.name,
          targetId: spawn.mobId,
          targetType: "mob",
          targetName: mob?.name || spawn.mobId,
          relationshipType: "spawns",
          metadata: {
            spawnRadius: spawn.spawnRadius,
            maxCount: spawn.maxCount,
          },
        });
      }
    }
  }

  return relationships;
}

/**
 * Extract tool -> resource harvest relationships
 */
function extractHarvestRelationships(
  resources: ResourceDefinition[],
  items: Map<string, ItemDefinition>,
): AssetRelationship[] {
  const relationships: AssetRelationship[] = [];
  const toolToResources = new Map<string, ResourceDefinition[]>();

  // Group resources by required tool
  for (const resource of resources) {
    if (!resource.toolRequired) continue;
    const existing = toolToResources.get(resource.toolRequired) || [];
    existing.push(resource);
    toolToResources.set(resource.toolRequired, existing);
  }

  // Create relationships
  const toolEntries = Array.from(toolToResources.entries());
  for (const [toolId, resourceList] of toolEntries) {
    const tool = items.get(toolId);

    for (const resource of resourceList) {
      relationships.push({
        id: `${toolId}_harvests_${resource.id}`,
        sourceId: toolId,
        sourceType: "tool",
        sourceName: tool?.name || toolId,
        targetId: resource.id,
        targetType: "resource",
        targetName: resource.name,
        relationshipType: "harvests",
        metadata: {
          levelRequired: resource.levelRequired,
          skillName: resource.harvestSkill,
        },
      });
    }
  }

  return relationships;
}

/**
 * Extract requirement relationships from items
 */
function extractRequirementRelationships(
  items: ItemDefinition[],
  allItems: Map<string, ItemDefinition>,
): AssetRelationship[] {
  const relationships: AssetRelationship[] = [];

  for (const item of items) {
    if (!item.requirements?.skills) continue;

    // For now, we only track item requirements if they reference other items
    // Skill requirements are stored as metadata
  }

  return relationships;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Determine the AssetCategory for an item based on its type
 */
function getItemCategory(item: ItemDefinition | undefined): AssetCategory {
  if (!item) return "item";
  
  switch (item.type) {
    case "weapon":
      return "weapon";
    case "armor":
      return "armor";
    case "tool":
      return "tool";
    case "currency":
      return "currency";
    case "resource":
      return "item"; // Resource drops are items
    default:
      return "item";
  }
}

/**
 * Generate a unique relationship ID
 */
function generateRelationshipId(
  sourceId: string,
  targetId: string,
  type: RelationshipType,
): string {
  return `${sourceId}_${type}_${targetId}`;
}

// =============================================================================
// MAIN SERVICE
// =============================================================================

/**
 * Cache for the relationship graph
 */
let cachedGraph: RelationshipGraph | null = null;
let cachedRelationships: AssetRelationship[] | null = null;

/**
 * Get all relationships from the game manifests
 */
export async function getAllRelationships(): Promise<AssetRelationship[]> {
  if (cachedRelationships) {
    return cachedRelationships;
  }

  log.info("Building relationship graph from manifests...");

  try {
    // Load all manifest data
    const [itemsList, npcsList, resourcesList, storesList, areasList] = await Promise.all([
      getAllItems(),
      getAllNpcs(),
      getAllResources(),
      getAllStores(),
      getAllAreas(),
    ]);

    // Create lookup maps with explicit types
    const itemsMap = new Map<string, ItemDefinition>();
    for (const item of itemsList) {
      itemsMap.set(item.id, item);
    }
    
    const npcsMap = new Map<string, NpcDefinition>();
    for (const npc of npcsList) {
      npcsMap.set(npc.id, npc);
    }
    
    const resourcesMap = new Map<string, ResourceDefinition>();
    for (const resource of resourcesList) {
      resourcesMap.set(resource.id, resource);
    }

    // Extract all relationships
    const relationships: AssetRelationship[] = [
      ...extractDropRelationships(npcsList, itemsMap),
      ...extractYieldRelationships(resourcesList, itemsMap),
      ...extractStoreRelationships(storesList, npcsList, itemsMap),
      ...extractSpawnRelationships(areasList, npcsMap, resourcesMap),
      ...extractHarvestRelationships(resourcesList, itemsMap),
      ...extractRequirementRelationships(itemsList, itemsMap),
    ];

    // Deduplicate by ID
    const uniqueRelationships = Array.from(
      new Map(relationships.map((r) => [r.id, r])).values(),
    );

    cachedRelationships = uniqueRelationships;

    log.info("Relationship graph built", {
      totalRelationships: uniqueRelationships.length,
      drops: uniqueRelationships.filter((r) => r.relationshipType === "drops").length,
      yields: uniqueRelationships.filter((r) => r.relationshipType === "yields").length,
      sells: uniqueRelationships.filter((r) => r.relationshipType === "sells").length,
      spawns: uniqueRelationships.filter((r) => r.relationshipType === "spawns").length,
      harvests: uniqueRelationships.filter((r) => r.relationshipType === "harvests").length,
    });

    return uniqueRelationships;
  } catch (error) {
    log.error("Failed to build relationship graph", { error });
    return [];
  }
}

/**
 * Get relationships for a specific asset
 */
export async function getRelationships(assetId: string): Promise<{
  outgoing: AssetRelationship[];
  incoming: AssetRelationship[];
}> {
  const allRelationships = await getAllRelationships();

  return {
    outgoing: allRelationships.filter((r) => r.sourceId === assetId),
    incoming: allRelationships.filter((r) => r.targetId === assetId),
  };
}

/**
 * Get relationships by type
 */
export async function getRelationshipsByType(
  type: RelationshipType,
): Promise<AssetRelationship[]> {
  const allRelationships = await getAllRelationships();
  return allRelationships.filter((r) => r.relationshipType === type);
}

/**
 * Add a new relationship
 */
export async function addRelationship(
  sourceId: string,
  sourceType: AssetCategory,
  sourceName: string,
  targetId: string,
  targetType: AssetCategory,
  targetName: string,
  relationshipType: RelationshipType,
  metadata?: RelationshipMetadata,
): Promise<AssetRelationship | null> {
  // Validate the relationship
  if (!isValidRelationship(relationshipType, sourceType, targetType)) {
    log.warn("Invalid relationship", {
      sourceType,
      targetType,
      relationshipType,
    });
    return null;
  }

  const relationship: AssetRelationship = {
    id: generateRelationshipId(sourceId, targetId, relationshipType),
    sourceId,
    sourceType,
    sourceName,
    targetId,
    targetType,
    targetName,
    relationshipType,
    metadata,
  };

  // Add to cache if it exists
  if (cachedRelationships) {
    // Check for duplicates
    const existingIndex = cachedRelationships.findIndex((r) => r.id === relationship.id);
    if (existingIndex >= 0) {
      cachedRelationships[existingIndex] = relationship;
    } else {
      cachedRelationships.push(relationship);
    }
    // Invalidate graph cache
    cachedGraph = null;
  }

  log.info("Relationship added", { id: relationship.id });
  return relationship;
}

/**
 * Remove a relationship by ID
 */
export async function removeRelationship(relationshipId: string): Promise<boolean> {
  if (!cachedRelationships) {
    await getAllRelationships();
  }

  if (cachedRelationships) {
    const index = cachedRelationships.findIndex((r) => r.id === relationshipId);
    if (index >= 0) {
      cachedRelationships.splice(index, 1);
      cachedGraph = null; // Invalidate graph cache
      log.info("Relationship removed", { id: relationshipId });
      return true;
    }
  }

  return false;
}

/**
 * Get the full relationship graph for visualization
 */
export async function getRelationshipGraph(filters?: {
  assetTypes?: AssetCategory[];
  relationshipTypes?: RelationshipType[];
  assetId?: string;
}): Promise<RelationshipGraph> {
  const allRelationships = await getAllRelationships();

  // Apply filters
  let filteredRelationships = allRelationships;

  if (filters?.relationshipTypes && filters.relationshipTypes.length > 0) {
    filteredRelationships = filteredRelationships.filter((r) =>
      filters.relationshipTypes!.includes(r.relationshipType),
    );
  }

  if (filters?.assetTypes && filters.assetTypes.length > 0) {
    filteredRelationships = filteredRelationships.filter(
      (r) =>
        filters.assetTypes!.includes(r.sourceType) ||
        filters.assetTypes!.includes(r.targetType),
    );
  }

  if (filters?.assetId) {
    filteredRelationships = filteredRelationships.filter(
      (r) => r.sourceId === filters.assetId || r.targetId === filters.assetId,
    );
  }

  // Build nodes from relationships
  const nodeMap = new Map<string, GraphNode>();

  for (const rel of filteredRelationships) {
    // Source node
    if (!nodeMap.has(rel.sourceId)) {
      nodeMap.set(rel.sourceId, {
        id: rel.sourceId,
        name: rel.sourceName,
        category: rel.sourceType,
        relationshipCount: 0,
      });
    }
    const sourceNode = nodeMap.get(rel.sourceId)!;
    sourceNode.relationshipCount++;

    // Target node
    if (!nodeMap.has(rel.targetId)) {
      nodeMap.set(rel.targetId, {
        id: rel.targetId,
        name: rel.targetName,
        category: rel.targetType,
        relationshipCount: 0,
      });
    }
    const targetNode = nodeMap.get(rel.targetId)!;
    targetNode.relationshipCount++;
  }

  // Build edges
  const edges: GraphEdge[] = filteredRelationships.map((rel) => ({
    id: rel.id,
    source: rel.sourceId,
    target: rel.targetId,
    relationshipType: rel.relationshipType,
    metadata: rel.metadata,
    label: RELATIONSHIP_LABELS[rel.relationshipType].verb,
  }));

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
  };
}

/**
 * Clear the relationship cache (useful for hot-reload)
 */
export function clearRelationshipCache(): void {
  cachedRelationships = null;
  cachedGraph = null;
  log.debug("Relationship cache cleared");
}

/**
 * Get relationship statistics
 */
export async function getRelationshipStats(): Promise<{
  totalRelationships: number;
  byType: Record<RelationshipType, number>;
  uniqueAssets: number;
}> {
  const relationships = await getAllRelationships();

  const byType: Record<RelationshipType, number> = {
    drops: 0,
    yields: 0,
    sells: 0,
    spawns: 0,
    harvests: 0,
    requires: 0,
    manages: 0,
  };

  const uniqueAssetIds = new Set<string>();

  for (const rel of relationships) {
    byType[rel.relationshipType]++;
    uniqueAssetIds.add(rel.sourceId);
    uniqueAssetIds.add(rel.targetId);
  }

  return {
    totalRelationships: relationships.length,
    byType,
    uniqueAssets: uniqueAssetIds.size,
  };
}
