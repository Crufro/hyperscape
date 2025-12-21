/**
 * Common Zod Schemas for HyperForge API
 *
 * Shared schemas and helpers used across all API routes.
 */

import { z } from "zod";

// =============================================================================
// GEOMETRIC SCHEMAS
// =============================================================================

/**
 * 3D Vector schema (x, y, z)
 * All fields optional to support partial updates
 */
export const Vector3Schema = z.object({
  x: z.number().optional(),
  y: z.number().optional(),
  z: z.number().optional(),
});

/**
 * Required 3D Vector schema
 */
export const Vector3RequiredSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

// =============================================================================
// ASSET CATEGORY SCHEMAS
// =============================================================================

/**
 * Asset category enum - matches core.ts AssetCategory type
 */
export const AssetCategorySchema = z.enum([
  "weapon",
  "armor",
  "tool",
  "item",
  "npc",
  "mob",
  "character",
  "resource",
  "building",
  "prop",
  "currency",
  "music",
  "biome",
  "environment",
  "audio",
  "avatar",
  "emote",
  "misc",
]);

/**
 * Model-specific categories (subset of AssetCategory)
 */
export const ModelCategorySchema = z.enum([
  "weapon",
  "armor",
  "tool",
  "item",
  "npc",
  "mob",
  "character",
  "resource",
  "building",
  "prop",
]);

/**
 * Rarity tiers - matches core.ts Rarity type
 */
export const RaritySchema = z.enum([
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "unique",
]);

/**
 * Asset source types - matches core.ts AssetSource type
 */
export const AssetSourceSchema = z.enum(["CDN", "FORGE", "LOCAL", "BASE"]);

/**
 * Manifest types
 */
export const ManifestTypeSchema = z.enum([
  "items",
  "npcs",
  "resources",
  "stores",
  "music",
  "buildings",
]);

// =============================================================================
// EQUIPMENT SCHEMAS
// =============================================================================

/**
 * Equipment slot types
 */
export const EquipSlotSchema = z.enum([
  "head",
  "chest",
  "legs",
  "feet",
  "hands",
  "cape",
  "neck",
  "ring",
  "mainhand",
  "offhand",
  "ammo",
]);

/**
 * Weapon type categories
 */
export const WeaponTypeSchema = z.enum([
  "sword",
  "axe",
  "mace",
  "dagger",
  "spear",
  "bow",
  "crossbow",
  "staff",
  "wand",
]);

/**
 * Attack style types
 */
export const AttackTypeSchema = z.enum(["melee", "ranged", "magic"]);

// =============================================================================
// QUALITY & STYLE SCHEMAS
// =============================================================================

/**
 * Generation quality levels
 */
export const GenerationQualitySchema = z.enum(["preview", "medium", "high"]);

/**
 * Art style options
 */
export const ArtStyleSchema = z.enum([
  "realistic",
  "stylized",
  "cartoon",
  "anime",
  "pixel",
  "low-poly",
]);

// =============================================================================
// COMBAT SCHEMAS
// =============================================================================

/**
 * Combat stat bonuses
 */
export const CombatBonusesSchema = z.object({
  attack: z.number().optional(),
  strength: z.number().optional(),
  defense: z.number().optional(),
  ranged: z.number().optional(),
  magic: z.number().optional(),
  prayer: z.number().optional(),
});

/**
 * Requirements for equipping/using items
 */
export const RequirementsSchema = z.object({
  level: z.number().optional(),
  skills: z.record(z.string(), z.number()).optional(),
});

// =============================================================================
// ASSET SCHEMAS
// =============================================================================

/**
 * Base CDN asset schema - minimum required fields for a valid asset
 */
export const CDNAssetBaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: AssetSourceSchema.optional().default("CDN"),
  category: AssetCategorySchema,
  modelPath: z.string().optional(),
  modelUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  thumbnailPath: z.string().optional(),
  iconPath: z.string().optional(),
  description: z.string().optional(),
  rarity: RaritySchema.optional(),
  type: z.string().optional(),
  subtype: z.string().optional(),
});

/**
 * Full CDN asset schema with all optional game-specific fields
 */
export const CDNAssetSchema = CDNAssetBaseSchema.extend({
  // Item metadata
  value: z.number().optional(),
  weight: z.number().optional(),
  stackable: z.boolean().optional(),
  tradeable: z.boolean().optional(),
  examine: z.string().optional(),
  
  // Equipment
  equipSlot: EquipSlotSchema.optional(),
  weaponType: WeaponTypeSchema.optional(),
  attackType: AttackTypeSchema.optional(),
  equippedModelPath: z.string().optional(),
  bonuses: CombatBonusesSchema.optional(),
  requirements: RequirementsSchema.optional(),
  
  // NPC-specific
  npcCategory: z.string().optional(),
  faction: z.string().optional(),
  level: z.number().optional(),
  combatLevel: z.number().optional(),
  attackable: z.boolean().optional(),
  
  // Resource-specific
  harvestSkill: z.string().optional(),
  toolRequired: z.string().optional(),
  levelRequired: z.number().optional(),
  
  // VRM-specific
  hasVRM: z.boolean().optional(),
  vrmUrl: z.string().optional(),
  vrmPath: z.string().optional(),
  hasHandRigging: z.boolean().optional(),
  hasSprites: z.boolean().optional(),
});

export type CDNAssetParsed = z.infer<typeof CDNAssetSchema>;

// =============================================================================
// API RESPONSE HELPERS
// =============================================================================

/**
 * Create a successful API response
 */
export function createApiResponse<T>(data: T) {
  return { success: true as const, data };
}

/**
 * Create an error API response
 */
export function createApiError(
  code: string,
  message: string,
  details?: unknown,
) {
  return { success: false as const, error: { code, message, details } };
}

/**
 * Standard validation error response for API routes
 */
export function validationErrorResponse(error: z.ZodError) {
  return {
    error: "Invalid request",
    details: error.flatten(),
  };
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Vector3 = z.infer<typeof Vector3Schema>;
export type Vector3Required = z.infer<typeof Vector3RequiredSchema>;
export type AssetCategory = z.infer<typeof AssetCategorySchema>;
export type ModelCategory = z.infer<typeof ModelCategorySchema>;
export type Rarity = z.infer<typeof RaritySchema>;
export type AssetSource = z.infer<typeof AssetSourceSchema>;
export type ManifestType = z.infer<typeof ManifestTypeSchema>;
export type EquipSlot = z.infer<typeof EquipSlotSchema>;
export type WeaponType = z.infer<typeof WeaponTypeSchema>;
export type AttackType = z.infer<typeof AttackTypeSchema>;
export type GenerationQuality = z.infer<typeof GenerationQualitySchema>;
export type ArtStyle = z.infer<typeof ArtStyleSchema>;
export type CombatBonuses = z.infer<typeof CombatBonusesSchema>;
export type Requirements = z.infer<typeof RequirementsSchema>;
