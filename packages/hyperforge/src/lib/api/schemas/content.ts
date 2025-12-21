/**
 * Content Generation Schemas
 *
 * Zod schemas for /api/content/generate endpoint
 * Supports quest, area, item, store generation
 */

import { z } from "zod";
import {
  RaritySchema,
  EquipSlotSchema,
} from "./common";

// =============================================================================
// QUEST GENERATION SCHEMA
// =============================================================================

/**
 * Quest difficulty levels
 */
export const QuestDifficultySchema = z.enum([
  "easy",
  "medium",
  "hard",
  "legendary",
]);

/**
 * Quest category types
 */
export const QuestCategorySchema = z.enum(["main", "side", "daily", "event"]);

/**
 * NPC reference for quest start/complete
 */
export const NPCRefSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

/**
 * Quest generation request
 */
export const QuestGenerationSchema = z.object({
  type: z.literal("quest"),
  name: z.string().optional(),
  category: QuestCategorySchema.optional(),
  difficulty: QuestDifficultySchema.optional(),
  theme: z.string().optional(),
  startNpc: NPCRefSchema.optional(),
  targetLevel: z.number().positive().optional(),
  objectives: z.string().optional(),
  lore: z.string().optional(),
  saveToStorage: z.boolean().optional(),
});

// =============================================================================
// AREA GENERATION SCHEMA
// =============================================================================

/**
 * Area size options
 */
export const AreaSizeSchema = z.enum(["small", "medium", "large"]);

/**
 * Area generation request
 */
export const AreaGenerationSchema = z.object({
  type: z.literal("area"),
  name: z.string().optional(),
  biome: z.string().optional(),
  difficultyLevel: z.number().min(0).max(5).optional(),
  size: AreaSizeSchema.optional(),
  safeZone: z.boolean().optional(),
  theme: z.string().optional(),
  includeNpcs: z.boolean().optional(),
  includeResources: z.boolean().optional(),
  includeMobs: z.boolean().optional(),
  saveToStorage: z.boolean().optional(),
});

// =============================================================================
// ITEM GENERATION SCHEMA
// =============================================================================

/**
 * Item type categories
 */
export const ItemTypeSchema = z.enum([
  "weapon",
  "armor",
  "tool",
  "consumable",
  "quest",
  "resource",
  "material",
  "currency",
]);

/**
 * Item generation request
 */
export const ItemGenerationSchema = z.object({
  type: z.literal("item"),
  name: z.string().optional(),
  itemType: ItemTypeSchema.optional(),
  rarity: RaritySchema.optional(),
  level: z.number().positive().optional(),
  theme: z.string().optional(),
  equipSlot: EquipSlotSchema.optional(),
  saveToStorage: z.boolean().optional(),
});

// =============================================================================
// STORE GENERATION SCHEMA
// =============================================================================

/**
 * Store type options
 */
export const StoreTypeSchema = z.enum([
  "general",
  "weapon",
  "armor",
  "magic",
  "food",
  "specialty",
]);

/**
 * Price range options
 */
export const PriceRangeSchema = z.enum(["cheap", "normal", "expensive"]);

/**
 * Store owner reference
 */
export const StoreOwnerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

/**
 * Store generation request
 */
export const StoreGenerationSchema = z.object({
  type: z.literal("store"),
  name: z.string().optional(),
  storeType: StoreTypeSchema.optional(),
  owner: StoreOwnerSchema.optional(),
  location: z.string().optional(),
  itemCount: z.number().positive().optional(),
  priceRange: PriceRangeSchema.optional(),
  saveToStorage: z.boolean().optional(),
});

// =============================================================================
// NPC GENERATION SCHEMA
// =============================================================================

/**
 * NPC category types
 */
export const NPCCategorySchema = z.enum([
  "humanoid",
  "monster",
  "animal",
  "undead",
  "demon",
  "dragon",
  "elemental",
  "merchant",
  "quest",
]);

/**
 * NPC generation request
 */
export const NPCGenerationSchema = z.object({
  type: z.literal("npc"),
  name: z.string().optional(),
  npcCategory: NPCCategorySchema.optional(),
  level: z.number().positive().optional(),
  faction: z.string().optional(),
  personality: z.string().optional(),
  occupation: z.string().optional(),
  hasStore: z.boolean().optional(),
  saveToStorage: z.boolean().optional(),
});

// =============================================================================
// COMBINED CONTENT GENERATION SCHEMA
// =============================================================================

/**
 * Combined content generation request using discriminated union
 */
export const ContentGenerationSchema = z.discriminatedUnion("type", [
  QuestGenerationSchema,
  AreaGenerationSchema,
  ItemGenerationSchema,
  StoreGenerationSchema,
  NPCGenerationSchema,
]);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type QuestDifficulty = z.infer<typeof QuestDifficultySchema>;
export type QuestCategory = z.infer<typeof QuestCategorySchema>;
export type QuestGenerationRequest = z.infer<typeof QuestGenerationSchema>;
export type AreaSize = z.infer<typeof AreaSizeSchema>;
export type AreaGenerationRequest = z.infer<typeof AreaGenerationSchema>;
export type ItemType = z.infer<typeof ItemTypeSchema>;
export type ItemGenerationRequest = z.infer<typeof ItemGenerationSchema>;
export type StoreType = z.infer<typeof StoreTypeSchema>;
export type PriceRange = z.infer<typeof PriceRangeSchema>;
export type StoreGenerationRequest = z.infer<typeof StoreGenerationSchema>;
export type NPCCategory = z.infer<typeof NPCCategorySchema>;
export type NPCGenerationRequest = z.infer<typeof NPCGenerationSchema>;
export type ContentGenerationRequest = z.infer<typeof ContentGenerationSchema>;
