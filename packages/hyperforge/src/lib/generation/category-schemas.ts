/**
 * Category Schema Validators
 * Validates generated assets against game manifest schemas
 */

import type { AssetCategory } from "@/types/categories";
import { z } from "zod";

/**
 * Base validation schemas for each manifest type
 */

// Item schema (for weapons, props, building materials)
export const ItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string(),
  description: z.string().optional(),
  modelPath: z.string().nullable().optional(),
  equippedModelPath: z.string().nullable().optional(),
  iconPath: z.string().optional(),
  value: z.number().optional(),
  weight: z.number().optional(),
  tradeable: z.boolean().optional(),
  rarity: z
    .enum(["common", "uncommon", "rare", "epic", "legendary"])
    .optional(),
  // Weapon-specific
  weaponType: z.string().optional(),
  attackType: z.string().optional(),
  attackSpeed: z.number().optional(),
  attackRange: z.number().optional(),
  bonuses: z.record(z.number()).optional(),
  requirements: z
    .object({
      level: z.number(),
      skills: z.record(z.number()),
    })
    .optional(),
});

// NPC schema
export const NPCSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  category: z.enum(["mob", "boss", "neutral", "quest"]),
  level: z.number().optional(),
  health: z.number().optional(),
  combatLevel: z.number().optional(),
  modelPath: z.string().optional(),
  thumbnailPath: z.string().optional(),
  faction: z.string().optional(),
  stats: z.record(z.unknown()).optional(),
  drops: z.record(z.unknown()).optional(),
  dialogue: z.record(z.unknown()).optional(),
});

// Resource schema
export const ResourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string(),
  examine: z.string().optional(),
  modelPath: z.string().nullable(),
  depletedModelPath: z.string().nullable().optional(),
  scale: z.number().optional(),
  depletedScale: z.number().optional(),
  harvestSkill: z.string(),
  toolRequired: z.string().nullable().optional(),
  levelRequired: z.number(),
  baseCycleTicks: z.number().optional(),
  depleteChance: z.number().optional(),
  respawnTicks: z.number().optional(),
  harvestYield: z
    .array(
      z.object({
        itemId: z.string(),
        itemName: z.string(),
        quantity: z.number(),
        chance: z.number(),
        xpAmount: z.number(),
        stackable: z.boolean(),
      }),
    )
    .optional(),
});

/**
 * Validate asset against category schema
 */
export function validateAsset(
  category: AssetCategory,
  asset: unknown,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    switch (category) {
      case "weapon":
      case "prop":
      case "building":
        ItemSchema.parse(asset);
        break;
      case "npc":
      case "character":
        NPCSchema.parse(asset);
        break;
      case "resource":
      case "environment":
        ResourceSchema.parse(asset);
        break;
      default:
        errors.push(`Unknown category: ${category}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      errors.push(
        ...error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
      );
    } else {
      errors.push(String(error));
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate asset ID from name and category
 */
export function generateAssetId(
  name: string,
  category: AssetCategory,
  existingIds: string[] = [],
): string {
  // Convert name to snake_case ID
  const baseId = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  // Add category prefix if needed
  let assetId = baseId;
  if (category === "npc" || category === "character") {
    // NPCs don't need prefix
  } else if (category === "resource" || category === "environment") {
    // Resources use type as prefix if not already present
    if (!baseId.includes("_")) {
      assetId = `${category}_${baseId}`;
    }
  }

  // Ensure uniqueness
  let finalId = assetId;
  let counter = 1;
  while (existingIds.includes(finalId)) {
    finalId = `${assetId}_${counter.toString().padStart(2, "0")}`;
    counter++;
  }

  return finalId;
}

/**
 * Auto-fill metadata defaults based on category
 */
export function getDefaultMetadata(
  category: AssetCategory,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const categoryDef = require("@/types/categories").CATEGORIES[category];
  const defaults = { ...categoryDef.metadataSchema.defaults, ...overrides };

  return defaults;
}
