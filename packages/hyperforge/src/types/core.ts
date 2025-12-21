/**
 * Core Type Definitions
 *
 * Foundational types used throughout HyperForge.
 * These are the base building blocks for all asset and game types.
 */

// =============================================================================
// ASSET SOURCE TYPES
// =============================================================================

/**
 * Asset source/origin types:
 * - CDN: Official game assets from hyperscapeAI/assets repo (served via Cloudflare CDN)
 * - FORGE: HyperForge-generated assets stored in Supabase (also CDN-accessible)
 * - LOCAL: Local filesystem (development fallback only)
 * - BASE: Base template assets for generation
 *
 * Note: Both CDN and FORGE assets are production-ready and served via CDN infrastructure.
 * The source indicates ORIGIN (where assets came from), not delivery method.
 */
export type AssetSource = "CDN" | "FORGE" | "LOCAL" | "BASE";

// =============================================================================
// ASSET CATEGORY TYPES
// =============================================================================

/**
 * Asset categories for filtering and organization
 */
export type AssetCategory =
  | "weapon"
  | "armor"
  | "tool"
  | "item"
  | "npc"
  | "mob"
  | "character"
  | "resource"
  | "building"
  | "prop"
  | "currency"
  | "music"
  | "biome"
  | "environment"
  | "audio"
  | "avatar"
  | "emote"
  | "misc";

/**
 * Model-specific categories (subset of AssetCategory)
 */
export type ModelCategory =
  | "weapon"
  | "armor"
  | "tool"
  | "item"
  | "npc"
  | "mob"
  | "character"
  | "resource"
  | "building"
  | "prop";

// =============================================================================
// MANIFEST TYPES
// =============================================================================

/**
 * Types of manifests that can be exported/imported
 */
export type ManifestType = "items" | "npcs" | "resources" | "stores" | "music" | "buildings";

// =============================================================================
// RARITY TYPES
// =============================================================================

/**
 * Item/asset rarity tiers
 */
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "unique";

/**
 * Color mapping for rarity display
 * Uses `as const satisfies` for literal type inference while ensuring complete coverage
 */
export const RARITY_COLORS = {
  common: "#9CA3AF", // gray
  uncommon: "#22C55E", // green
  rare: "#3B82F6", // blue
  epic: "#A855F7", // purple
  legendary: "#F59E0B", // orange
  unique: "#EF4444", // red
} as const satisfies Record<Rarity, string>;

// =============================================================================
// EQUIPMENT TYPES
// =============================================================================

/**
 * Equipment slot types
 */
export type EquipSlot =
  | "head"
  | "chest"
  | "legs"
  | "feet"
  | "hands"
  | "cape"
  | "neck"
  | "ring"
  | "mainhand"
  | "offhand"
  | "ammo";

/**
 * Weapon type categories
 */
export type WeaponType =
  | "sword"
  | "axe"
  | "mace"
  | "dagger"
  | "spear"
  | "bow"
  | "crossbow"
  | "staff"
  | "wand";

/**
 * Attack style types
 */
export type AttackType = "melee" | "ranged" | "magic";

// =============================================================================
// SKILL TYPES
// =============================================================================

/**
 * Known skill types in the game
 */
export type SkillType =
  | "attack"
  | "strength"
  | "defense"
  | "ranged"
  | "prayer"
  | "magic"
  | "runecrafting"
  | "hitpoints"
  | "crafting"
  | "mining"
  | "smithing"
  | "fishing"
  | "cooking"
  | "firemaking"
  | "woodcutting"
  | "agility"
  | "herblore"
  | "thieving"
  | "fletching"
  | "slayer"
  | "farming"
  | "construction"
  | "hunter"
  | "summoning";

/**
 * Skill requirements - explicit keys only
 */
export type SkillRequirements = Partial<Record<SkillType, number>>;

// =============================================================================
// COMBAT TYPES
// =============================================================================

/**
 * Combat stat bonuses for equipment (all optional for partial updates)
 */
export interface CombatBonuses {
  attack?: number;
  strength?: number;
  defense?: number;
  ranged?: number;
  magic?: number;
  prayer?: number;
}

/**
 * Full combat bonuses with defaults (for display/calculation)
 */
export interface CombatBonusesFull {
  attack: number;
  strength: number;
  defense: number;
  ranged: number;
  magic: number;
  prayer: number;
}

/**
 * Create full bonuses with defaults
 */
export function fillCombatBonuses(partial?: CombatBonuses): CombatBonusesFull {
  return {
    attack: partial?.attack ?? 0,
    strength: partial?.strength ?? 0,
    defense: partial?.defense ?? 0,
    ranged: partial?.ranged ?? 0,
    magic: partial?.magic ?? 0,
    prayer: partial?.prayer ?? 0,
  };
}

/**
 * Requirements for equipping/using items
 */
export interface Requirements {
  level?: number;
  skills?: SkillRequirements;
}

// =============================================================================
// NPC TYPES
// =============================================================================

/**
 * NPC category types
 */
export type NPCCategory =
  | "humanoid"
  | "monster"
  | "animal"
  | "undead"
  | "demon"
  | "dragon"
  | "elemental"
  | "merchant"
  | "quest";

// =============================================================================
// ITEM TYPES
// =============================================================================

/**
 * Item type categories
 */
export type ItemType =
  | "weapon"
  | "armor"
  | "tool"
  | "consumable"
  | "quest"
  | "resource"
  | "material"
  | "currency";

// =============================================================================
// COMMON TYPES
// =============================================================================

/**
 * 3D position
 */
export interface Position3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Metadata for generated assets
 */
export interface GeneratedMetadata {
  prompt?: string;
  pipeline?: string;
  quality?: string;
  generatedAt?: string;
  meshyTaskId?: string;
}

// =============================================================================
// CATEGORY MAPPING
// =============================================================================

/**
 * Map asset categories to manifest types for export
 */
export const CATEGORY_TO_MANIFEST: Record<AssetCategory, ManifestType | null> = {
  weapon: "items",
  armor: "items",
  tool: "items",
  item: "items",
  npc: "npcs",
  mob: "npcs",
  character: "npcs",
  resource: "resources",
  building: "buildings",
  prop: null, // Props don't have a manifest yet
  currency: "items",
  music: "music",
  biome: null, // Biomes handled separately
  environment: null, // Environment assets don't export to manifest
  audio: null, // Audio handled separately
  avatar: "npcs", // Avatars can be treated as NPCs for manifest purposes
  emote: null, // Emotes don't have a manifest yet
  misc: null,
};
