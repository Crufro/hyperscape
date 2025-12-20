/**
 * Relationship Types for HyperForge Asset Graph
 *
 * Defines all relationship types between assets in the game:
 * - Mobs DROP Items
 * - Resources YIELD Items
 * - NPCs MANAGE Stores
 * - Stores SELL Items
 * - Areas SPAWN Mobs/NPCs/Resources
 * - Tools HARVEST Resources
 */

import type { AssetCategory } from "@/types/core";

// =============================================================================
// RELATIONSHIP TYPE ENUM
// =============================================================================

/**
 * All possible relationship types between assets
 */
export type RelationshipType =
  | "drops"      // Mob -> Item (mob drops this item when killed)
  | "yields"     // Resource -> Item (resource produces this item when harvested)
  | "sells"      // Store -> Item (store sells this item)
  | "spawns"     // Area -> Mob/NPC/Resource (area spawns this entity)
  | "harvests"   // Tool -> Resource (tool can harvest this resource)
  | "requires"   // Item/Resource -> Item/Skill (requires this to use/access)
  | "manages";   // NPC -> Store (NPC operates this store)

/**
 * Relationship direction for bidirectional tracking
 */
export type RelationshipDirection = "outgoing" | "incoming";

// =============================================================================
// RELATIONSHIP DEFINITION
// =============================================================================

/**
 * A single relationship between two assets
 */
export interface AssetRelationship {
  id: string;
  sourceId: string;
  sourceType: AssetCategory;
  sourceName: string;
  targetId: string;
  targetType: AssetCategory;
  targetName: string;
  relationshipType: RelationshipType;
  metadata?: RelationshipMetadata;
}

/**
 * Optional metadata for relationships
 */
export interface RelationshipMetadata {
  // For drops/yields
  chance?: number;           // 0-1 probability
  minQuantity?: number;
  maxQuantity?: number;
  rarity?: string;
  
  // For spawns
  spawnRadius?: number;
  maxCount?: number;
  
  // For sells
  price?: number;
  stockQuantity?: number;
  
  // For requires
  levelRequired?: number;
  skillName?: string;
}

// =============================================================================
// VALIDATION RULES
// =============================================================================

/**
 * Defines valid source -> target category combinations for each relationship type
 */
export const RELATIONSHIP_VALIDATION_RULES: Record<
  RelationshipType,
  { validSources: AssetCategory[]; validTargets: AssetCategory[] }
> = {
  drops: {
    validSources: ["mob", "npc"],
    validTargets: ["weapon", "armor", "tool", "item", "currency"],
  },
  yields: {
    validSources: ["resource"],
    validTargets: ["weapon", "armor", "tool", "item", "currency"],
  },
  sells: {
    validSources: ["npc"],  // Store is represented by NPC
    validTargets: ["weapon", "armor", "tool", "item"],
  },
  spawns: {
    validSources: ["biome"],
    validTargets: ["mob", "npc", "resource"],
  },
  harvests: {
    validSources: ["tool"],
    validTargets: ["resource"],
  },
  requires: {
    validSources: ["weapon", "armor", "tool", "item", "resource"],
    validTargets: ["item", "tool"],
  },
  manages: {
    validSources: ["npc"],
    validTargets: ["npc"],  // Store is conceptually under NPC category
  },
};

// =============================================================================
// RELATIONSHIP LABELS
// =============================================================================

/**
 * Human-readable labels for relationship types
 */
export const RELATIONSHIP_LABELS: Record<RelationshipType, { verb: string; inverse: string }> = {
  drops: { verb: "drops", inverse: "dropped by" },
  yields: { verb: "yields", inverse: "yielded by" },
  sells: { verb: "sells", inverse: "sold by" },
  spawns: { verb: "spawns", inverse: "spawns in" },
  harvests: { verb: "harvests", inverse: "harvested by" },
  requires: { verb: "requires", inverse: "required by" },
  manages: { verb: "manages", inverse: "managed by" },
};

/**
 * Colors for relationship type visualization
 */
export const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  drops: "#ef4444",    // red-500
  yields: "#22c55e",   // green-500
  sells: "#eab308",    // yellow-500
  spawns: "#8b5cf6",   // violet-500
  harvests: "#f97316", // orange-500
  requires: "#06b6d4", // cyan-500
  manages: "#ec4899",  // pink-500
};

// =============================================================================
// ASSET CATEGORY COLORS
// =============================================================================

/**
 * Colors for asset category visualization in graph nodes
 */
export const ASSET_CATEGORY_COLORS: Record<AssetCategory, string> = {
  weapon: "#06b6d4",   // cyan-500
  armor: "#3b82f6",    // blue-500
  tool: "#f97316",     // orange-500
  item: "#22c55e",     // green-500
  npc: "#ec4899",      // pink-500
  mob: "#8b5cf6",      // violet-500
  character: "#14b8a6", // teal-500
  resource: "#84cc16", // lime-500
  building: "#78716c", // stone-500
  prop: "#a1a1aa",     // zinc-400
  currency: "#eab308", // yellow-500
  music: "#d946ef",    // fuchsia-500
  biome: "#10b981",    // emerald-500
  environment: "#059669", // emerald-600
  audio: "#c026d3",    // fuchsia-600
  avatar: "#0d9488",   // teal-600
  emote: "#f472b6",    // pink-400
  misc: "#6b7280",     // gray-500
};

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Check if a relationship type is valid between two asset categories
 */
export function isValidRelationship(
  relationshipType: RelationshipType,
  sourceCategory: AssetCategory,
  targetCategory: AssetCategory,
): boolean {
  const rules = RELATIONSHIP_VALIDATION_RULES[relationshipType];
  return (
    rules.validSources.includes(sourceCategory) &&
    rules.validTargets.includes(targetCategory)
  );
}

/**
 * Get all valid relationship types between two asset categories
 */
export function getValidRelationshipTypes(
  sourceCategory: AssetCategory,
  targetCategory: AssetCategory,
): RelationshipType[] {
  const validTypes: RelationshipType[] = [];
  
  for (const [type, rules] of Object.entries(RELATIONSHIP_VALIDATION_RULES)) {
    if (
      rules.validSources.includes(sourceCategory) &&
      rules.validTargets.includes(targetCategory)
    ) {
      validTypes.push(type as RelationshipType);
    }
  }
  
  return validTypes;
}

/**
 * Get all valid target categories for a relationship type and source category
 */
export function getValidTargetCategories(
  relationshipType: RelationshipType,
  sourceCategory: AssetCategory,
): AssetCategory[] {
  const rules = RELATIONSHIP_VALIDATION_RULES[relationshipType];
  if (!rules.validSources.includes(sourceCategory)) {
    return [];
  }
  return rules.validTargets;
}

/**
 * Get all valid source categories for a relationship type
 */
export function getValidSourceCategories(relationshipType: RelationshipType): AssetCategory[] {
  return RELATIONSHIP_VALIDATION_RULES[relationshipType].validSources;
}

// =============================================================================
// GRAPH TYPES
// =============================================================================

/**
 * A node in the relationship graph (represents an asset)
 */
export interface GraphNode {
  id: string;
  name: string;
  category: AssetCategory;
  thumbnailUrl?: string;
  modelPath?: string;
  relationshipCount: number;
}

/**
 * An edge in the relationship graph (represents a relationship)
 */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: RelationshipType;
  metadata?: RelationshipMetadata;
  label: string;
}

/**
 * The complete relationship graph
 */
export interface RelationshipGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if a string is a valid relationship type
 */
export function isRelationshipType(value: string): value is RelationshipType {
  return ["drops", "yields", "sells", "spawns", "harvests", "requires", "manages"].includes(value);
}
