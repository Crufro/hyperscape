/**
 * Asset Zod Schemas for HyperForge
 *
 * Type-safe validation schemas for asset-related structures.
 * These complement the type guards in @/types/guards.ts.
 *
 * Use Zod for:
 * - API boundary validation (incoming requests)
 * - JSON parsing with validation
 * - Complex nested object validation
 *
 * Use Type Guards for:
 * - Runtime type narrowing in conditionals
 * - Quick property checks
 * - Discriminated union narrowing
 */

import { z } from "zod";
import {
  AssetCategorySchema,
  RaritySchema,
  AssetSourceSchema,
  EquipSlotSchema,
  WeaponTypeSchema,
  AttackTypeSchema,
  CombatBonusesSchema,
  RequirementsSchema,
  Vector3RequiredSchema,
} from "./common";

// =============================================================================
// POSITION & GEOMETRY SCHEMAS
// =============================================================================

/**
 * 3D position schema - required fields
 */
export const Position3DSchema = Vector3RequiredSchema;

/**
 * Rotation schema (Euler angles in radians)
 */
export const Rotation3DSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

/**
 * Scale schema (uniform or per-axis)
 */
export const Scale3DSchema = z.union([
  z.number(), // Uniform scale
  z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }),
]);

/**
 * Transform schema (position, rotation, scale)
 */
export const Transform3DSchema = z.object({
  position: Position3DSchema.optional(),
  rotation: Rotation3DSchema.optional(),
  scale: Scale3DSchema.optional(),
});

// =============================================================================
// SPRITE DATA SCHEMA
// =============================================================================

/**
 * Sprite data for 2D representations
 */
export const SpriteDataSchema = z.object({
  angle: z.string(),
  imageUrl: z.string().url(),
});

// =============================================================================
// BASE ASSET SCHEMA
// =============================================================================

/**
 * Base asset schema - minimum fields for any asset
 */
export const BaseAssetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  source: AssetSourceSchema,
  category: AssetCategorySchema,
  description: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  thumbnailPath: z.string().optional(),
  modelUrl: z.string().url().optional(),
  modelPath: z.string().optional(),
  iconPath: z.string().optional(),
  rarity: RaritySchema.optional(),
  type: z.string().optional(),
  subtype: z.string().optional(),
  hasVRM: z.boolean().optional(),
  vrmUrl: z.string().url().optional(),
  vrmPath: z.string().optional(),
  hasHandRigging: z.boolean().optional(),
  hasSprites: z.boolean().optional(),
  sprites: z.array(SpriteDataSchema).optional(),
});

// =============================================================================
// CDN ASSET SCHEMA
// =============================================================================

/**
 * CDN asset schema - extends base with game-specific fields
 */
export const CDNAssetFullSchema = BaseAssetSchema.extend({
  source: z.literal("CDN"),
  modelPath: z.string(),
  examine: z.string().optional(),

  // Item metadata
  value: z.number().optional(),
  weight: z.number().optional(),
  stackable: z.boolean().optional(),
  tradeable: z.boolean().optional(),

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
});

// =============================================================================
// LOCAL ASSET SCHEMAS
// =============================================================================

/**
 * Local asset base schema
 */
const LocalAssetBaseSchema = BaseAssetSchema.extend({
  source: z.literal("LOCAL"),
  localPath: z.string().optional(),
  createdAt: z.union([z.date(), z.string()]).optional(),
  updatedAt: z.union([z.date(), z.string()]).optional(),
  prompt: z.string().optional(),
});

/**
 * Draft local asset schema
 */
export const LocalAssetDraftSchema = LocalAssetBaseSchema.extend({
  status: z.literal("draft"),
  generationParams: z.object({
    pipeline: z.string().optional(),
    quality: z.string().optional(),
    provider: z.string().optional(),
  }).optional(),
});

/**
 * Processing local asset schema
 */
export const LocalAssetProcessingSchema = LocalAssetBaseSchema.extend({
  status: z.literal("processing"),
  taskId: z.string(),
  progress: z.number().min(0).max(100),
  currentStage: z.string().optional(),
  estimatedTimeRemaining: z.number().optional(),
});

/**
 * Completed local asset schema
 */
export const LocalAssetCompletedSchema = LocalAssetBaseSchema.extend({
  status: z.literal("completed"),
  hasModel: z.literal(true),
  modelUrl: z.string().url(),
  metadata: z.object({
    prompt: z.string(),
    pipeline: z.string(),
    quality: z.string(),
    generatedAt: z.string(),
    meshyTaskId: z.string().optional(),
    polycount: z.number().optional(),
    duration: z.number().optional(),
  }),
});

/**
 * Failed local asset schema
 */
export const LocalAssetFailedSchema = LocalAssetBaseSchema.extend({
  status: z.literal("failed"),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
  }),
  partialMetadata: z.object({
    prompt: z.string().optional(),
    pipeline: z.string().optional(),
    failedAt: z.string().optional(),
  }).optional(),
});

/**
 * Local asset discriminated union schema
 */
export const LocalAssetSchema = z.discriminatedUnion("status", [
  LocalAssetDraftSchema,
  LocalAssetProcessingSchema,
  LocalAssetCompletedSchema,
  LocalAssetFailedSchema,
]);

// =============================================================================
// BASE TEMPLATE ASSET SCHEMA
// =============================================================================

/**
 * Base template asset schema
 */
export const BaseTemplateAssetSchema = BaseAssetSchema.extend({
  source: z.literal("BASE"),
  modelPath: z.string(),
});

// =============================================================================
// UNIFIED ASSET SCHEMA
// =============================================================================

/**
 * HyperForge asset schema - validates any asset type
 */
export const HyperForgeAssetSchema = z.union([
  CDNAssetFullSchema,
  LocalAssetSchema,
  BaseTemplateAssetSchema,
]);

// =============================================================================
// ASSET COLLECTION SCHEMAS
// =============================================================================

/**
 * Asset list response schema
 */
export const AssetListResponseSchema = z.object({
  assets: z.array(HyperForgeAssetSchema),
  total: z.number(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
});

/**
 * Asset creation request schema
 */
export const AssetCreateRequestSchema = z.object({
  name: z.string().min(1),
  category: AssetCategorySchema,
  description: z.string().optional(),
  rarity: RaritySchema.optional(),
  prompt: z.string().optional(),
  generationParams: z.object({
    pipeline: z.string().optional(),
    quality: z.string().optional(),
    provider: z.string().optional(),
  }).optional(),
});

/**
 * Asset update request schema (partial update)
 */
export const AssetUpdateRequestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  rarity: RaritySchema.optional(),
  category: AssetCategorySchema.optional(),
  // CDN-specific updates
  equipSlot: EquipSlotSchema.optional(),
  weaponType: WeaponTypeSchema.optional(),
  attackType: AttackTypeSchema.optional(),
  bonuses: CombatBonusesSchema.optional(),
  requirements: RequirementsSchema.optional(),
  value: z.number().optional(),
  weight: z.number().optional(),
  stackable: z.boolean().optional(),
  tradeable: z.boolean().optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Position3D = z.infer<typeof Position3DSchema>;
export type Rotation3D = z.infer<typeof Rotation3DSchema>;
export type Scale3D = z.infer<typeof Scale3DSchema>;
export type Transform3D = z.infer<typeof Transform3DSchema>;
export type SpriteDataValidated = z.infer<typeof SpriteDataSchema>;
export type BaseAssetValidated = z.infer<typeof BaseAssetSchema>;
export type CDNAssetValidated = z.infer<typeof CDNAssetFullSchema>;
export type LocalAssetValidated = z.infer<typeof LocalAssetSchema>;
export type BaseTemplateAssetValidated = z.infer<typeof BaseTemplateAssetSchema>;
export type HyperForgeAssetValidated = z.infer<typeof HyperForgeAssetSchema>;
export type AssetListResponse = z.infer<typeof AssetListResponseSchema>;
export type AssetCreateRequest = z.infer<typeof AssetCreateRequestSchema>;
export type AssetUpdateRequest = z.infer<typeof AssetUpdateRequestSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Parse and validate asset data, throwing on invalid input
 * Use at API boundaries
 */
export function parseAsset(input: unknown): HyperForgeAssetValidated {
  return HyperForgeAssetSchema.parse(input);
}

/**
 * Safe parse asset data, returning result object
 */
export function safeParseAsset(input: unknown): z.SafeParseReturnType<unknown, HyperForgeAssetValidated> {
  return HyperForgeAssetSchema.safeParse(input);
}

/**
 * Validate asset creation request
 */
export function parseAssetCreateRequest(input: unknown): AssetCreateRequest {
  return AssetCreateRequestSchema.parse(input);
}

/**
 * Validate asset update request
 */
export function parseAssetUpdateRequest(input: unknown): AssetUpdateRequest {
  return AssetUpdateRequestSchema.parse(input);
}
