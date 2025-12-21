/**
 * CDN Manifest Zod Schemas
 *
 * Schemas for validating JSON data loaded from CDN manifests.
 * Use these to safely parse external JSON files.
 */

import { z } from "zod";

// =============================================================================
// COMMON SCHEMAS
// =============================================================================

export const RaritySchema = z.enum([
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "unique",
]);

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

export const AttackTypeSchema = z.enum(["melee", "ranged", "magic"]);

/**
 * NPC category - matches types/core.ts NPCCategory
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

// =============================================================================
// COMBAT BONUSES SCHEMA
// =============================================================================

export const CombatBonusesSchema = z.object({
  attack: z.number().optional(),
  strength: z.number().optional(),
  defense: z.number().optional(),
  ranged: z.number().optional(),
  magic: z.number().optional(),
  prayer: z.number().optional(),
}).optional();

// =============================================================================
// REQUIREMENTS SCHEMA
// =============================================================================

export const RequirementsSchema = z.object({
  level: z.number().optional(),
  skills: z.record(z.string(), z.number()).optional(),
}).optional();

// =============================================================================
// ITEM MANIFEST SCHEMA
// =============================================================================

export const ItemManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
  examine: z.string().optional(),

  // Model paths
  modelPath: z.string().nullable().optional(),
  equippedModelPath: z.string().optional(),
  iconPath: z.string().optional(),
  thumbnailPath: z.string().optional(),

  // Basic properties
  value: z.number().optional(),
  weight: z.number().optional(),
  rarity: RaritySchema.optional(),
  stackable: z.boolean().optional(),
  maxStackSize: z.number().optional(),
  tradeable: z.boolean().optional(),

  // Equipment properties
  equipSlot: EquipSlotSchema.optional(),
  weaponType: WeaponTypeSchema.optional(),
  attackType: AttackTypeSchema.optional(),
  attackSpeed: z.number().optional(),
  attackRange: z.number().optional(),
  is2h: z.boolean().optional(),

  // Combat bonuses
  bonuses: CombatBonusesSchema,

  // Requirements
  requirements: RequirementsSchema,
});

// =============================================================================
// NPC MANIFEST SCHEMA
// =============================================================================

export const NPCStatsSchema = z.object({
  level: z.number().optional(),
  health: z.number().optional(),
  attack: z.number().optional(),
  strength: z.number().optional(),
  defense: z.number().optional(),
  ranged: z.number().optional(),
  magic: z.number().optional(),
}).optional();

export const NPCCombatSchema = z.object({
  attackable: z.boolean().optional(),
  aggressive: z.boolean().optional(),
  retaliates: z.boolean().optional(),
  aggroRange: z.number().optional(),
  combatRange: z.number().optional(),
  attackSpeedTicks: z.number().optional(),
  respawnTicks: z.number().optional(),
}).optional();

export const NPCMovementSchema = z.object({
  type: z.enum(["wander", "stationary", "patrol"]).optional(),
  speed: z.number().optional(),
  wanderRadius: z.number().optional(),
}).optional();

export const NPCAppearanceSchema = z.object({
  modelPath: z.string().optional(),
  iconPath: z.string().optional(),
  scale: z.number().optional(),
}).optional();

export const NPCServicesSchema = z.object({
  enabled: z.boolean().optional(),
  types: z.array(z.string()).optional(),
}).optional();

export const NPCManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: NPCCategorySchema,
  faction: z.string().optional(),

  // Stats
  stats: NPCStatsSchema,

  // Combat settings
  combat: NPCCombatSchema,

  // Movement
  movement: NPCMovementSchema,

  // Appearance
  appearance: NPCAppearanceSchema,

  // Direct paths
  modelPath: z.string().optional(),
  thumbnailPath: z.string().optional(),
  iconPath: z.string().optional(),

  // Services
  services: NPCServicesSchema,

  // Spawn info
  spawnBiomes: z.array(z.string()).optional(),

  // Legacy fields
  level: z.number().optional(),
  health: z.number().optional(),
  combatLevel: z.number().optional(),
});

// =============================================================================
// RESOURCE MANIFEST SCHEMA
// =============================================================================

export const HarvestYieldSchema = z.object({
  itemId: z.string(),
  itemName: z.string().optional(),
  quantity: z.number(),
  chance: z.number(),
  xpAmount: z.number().optional(),
  stackable: z.boolean().optional(),
});

export const ResourceManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  examine: z.string().optional(),

  // Model paths
  modelPath: z.string().nullable(),
  depletedModelPath: z.string().nullable().optional(),

  // Scale
  scale: z.number().optional(),
  depletedScale: z.number().optional(),

  // Harvesting requirements
  harvestSkill: z.string().optional(),
  toolRequired: z.string().nullable().optional(),
  levelRequired: z.number().optional(),

  // Timing
  baseCycleTicks: z.number().optional(),
  depleteChance: z.number().optional(),
  respawnTicks: z.number().optional(),

  // Yield
  harvestYield: z.array(HarvestYieldSchema).optional(),
});

// =============================================================================
// MUSIC MANIFEST SCHEMA
// =============================================================================

export const MusicManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["theme", "ambient", "combat"]),
  category: z.enum(["intro", "normal", "combat", "boss", "ambient"]),
  path: z.string(),
  description: z.string().optional(),
  duration: z.number().optional(),
  mood: z.string().optional(),
});

// =============================================================================
// BIOME MANIFEST SCHEMA
// =============================================================================

export const BiomeColorSchemeSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  fog: z.string(),
}).optional();

export const BiomeManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  terrain: z.string().optional(),
  difficultyLevel: z.number().optional(),
  difficulty: z.number().optional(),
  colorScheme: BiomeColorSchemeSchema,
  resources: z.array(z.string()).optional(),
  resourceTypes: z.array(z.string()).optional(),
  mobs: z.array(z.string()).optional(),
  mobTypes: z.array(z.string()).optional(),
});

// =============================================================================
// ARRAY SCHEMAS
// =============================================================================

export const ItemManifestArraySchema = z.array(ItemManifestSchema);
export const NPCManifestArraySchema = z.array(NPCManifestSchema);
export const ResourceManifestArraySchema = z.array(ResourceManifestSchema);
export const MusicManifestArraySchema = z.array(MusicManifestSchema);
export const BiomeManifestArraySchema = z.array(BiomeManifestSchema);

// =============================================================================
// PARSE FUNCTIONS
// =============================================================================

/**
 * Parse and validate an array of item manifests
 */
export function parseItemManifests(data: unknown) {
  return ItemManifestArraySchema.parse(data);
}

/**
 * Parse and validate an array of NPC manifests
 */
export function parseNPCManifests(data: unknown) {
  return NPCManifestArraySchema.parse(data);
}

/**
 * Parse and validate an array of resource manifests
 */
export function parseResourceManifests(data: unknown) {
  return ResourceManifestArraySchema.parse(data);
}

/**
 * Parse and validate an array of music manifests
 */
export function parseMusicManifests(data: unknown) {
  return MusicManifestArraySchema.parse(data);
}

/**
 * Parse and validate an array of biome manifests
 */
export function parseBiomeManifests(data: unknown) {
  return BiomeManifestArraySchema.parse(data);
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ItemManifestParsed = z.infer<typeof ItemManifestSchema>;
export type NPCManifestParsed = z.infer<typeof NPCManifestSchema>;
export type ResourceManifestParsed = z.infer<typeof ResourceManifestSchema>;
export type MusicManifestParsed = z.infer<typeof MusicManifestSchema>;
export type BiomeManifestParsed = z.infer<typeof BiomeManifestSchema>;
