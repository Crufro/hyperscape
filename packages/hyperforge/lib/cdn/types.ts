/**
 * CDN Asset Types
 * Types for assets loaded from game CDN manifests
 */

export type AssetSource = "CDN" | "LOCAL" | "BASE";

// Matches manifest rarity values (lowercase)
export type AssetRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "very_rare"
  | "epic"
  | "legendary"
  | "always";

export type AssetCategory =
  | "tool"
  | "weapon"
  | "armor"
  | "resource"
  | "npc"
  | "environment"
  | "item"
  | "currency"
  | "avatar"
  | "emote"
  | "audio"
  | "music"
  | "biome";

// Item equip slots
export type EquipSlot =
  | "weapon"
  | "shield"
  | "head"
  | "body"
  | "legs"
  | "hands"
  | "feet"
  | "cape"
  | "neck"
  | "ring";

// Weapon types
export type WeaponType =
  | "SWORD"
  | "AXE"
  | "MACE"
  | "DAGGER"
  | "SPEAR"
  | "BOW"
  | "STAFF"
  | "WAND";

// Attack types
export type AttackType = "MELEE" | "RANGED" | "MAGIC";

// NPC categories from manifest
export type NPCCategory = "mob" | "boss" | "neutral" | "quest";

/**
 * CDN Asset from game manifests
 * Extended to include all manifest metadata
 */
export interface CDNAsset {
  id: string;
  name: string;
  source: "CDN";
  modelPath: string;
  thumbnailPath?: string;
  iconPath?: string;
  category: AssetCategory;
  rarity?: AssetRarity;
  type: string;
  subtype?: string;
  description?: string;
  examine?: string;

  // VRM support
  hasVRM?: boolean;
  vrmPath?: string;

  // Hand rigging
  hasHandRigging?: boolean;

  // Item metadata
  value?: number;
  weight?: number;
  stackable?: boolean;
  tradeable?: boolean;

  // Equipment metadata
  equipSlot?: EquipSlot;
  weaponType?: WeaponType;
  attackType?: AttackType;
  equippedModelPath?: string;

  // Combat stats
  bonuses?: {
    attack?: number;
    strength?: number;
    defense?: number;
    ranged?: number;
    magic?: number;
  };

  // Requirements
  requirements?: {
    level?: number;
    skills?: Record<string, number>;
  };

  // NPC-specific
  npcCategory?: NPCCategory;
  faction?: string;
  level?: number;
  combatLevel?: number;
  attackable?: boolean;

  // Resource-specific
  harvestSkill?: string;
  toolRequired?: string;
  levelRequired?: number;
}

/**
 * Local generated asset
 */
export interface LocalAsset {
  id: string;
  name: string;
  source: "LOCAL";
  localPath: string;
  thumbnailPath?: string;
  category: AssetCategory;
  status: "draft" | "processing" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Base template asset
 */
export interface BaseAsset {
  id: string;
  name: string;
  source: "BASE";
  modelPath: string;
  thumbnailPath?: string;
  category: AssetCategory;
  description?: string;
}

/**
 * Unified asset type
 */
export type HyperForgeAsset = CDNAsset | LocalAsset | BaseAsset;

/**
 * Item from items.json manifest
 * Matches the actual manifest structure
 */
export interface ItemManifest {
  id: string;
  name: string;
  type: string; // "weapon", "tool", "resource", "currency"
  description?: string;
  examine?: string;

  // Model paths
  modelPath?: string | null;
  equippedModelPath?: string;
  iconPath?: string;
  thumbnailPath?: string;

  // Basic properties
  value?: number;
  weight?: number;
  rarity?: AssetRarity;
  stackable?: boolean;
  maxStackSize?: number;
  tradeable?: boolean;

  // Equipment properties
  equipSlot?: EquipSlot;
  weaponType?: WeaponType;
  attackType?: AttackType;
  attackSpeed?: number;
  attackRange?: number;

  // Combat bonuses
  bonuses?: {
    attack?: number;
    strength?: number;
    defense?: number;
    ranged?: number;
    magic?: number;
  };

  // Requirements
  requirements?: {
    level?: number;
    skills?: Record<string, number>;
  };
}

/**
 * NPC from npcs.json manifest
 * Matches the actual manifest structure
 */
export interface NPCManifest {
  id: string;
  name: string;
  description?: string;
  category: NPCCategory;
  faction?: string;

  // Stats
  stats?: {
    level?: number;
    health?: number;
    attack?: number;
    strength?: number;
    defense?: number;
    ranged?: number;
    magic?: number;
  };

  // Combat settings
  combat?: {
    attackable?: boolean;
    aggressive?: boolean;
    retaliates?: boolean;
    aggroRange?: number;
    combatRange?: number;
    attackSpeedTicks?: number;
    respawnTicks?: number;
  };

  // Movement
  movement?: {
    type?: "wander" | "stationary" | "patrol";
    speed?: number;
    wanderRadius?: number;
  };

  // Appearance (nested in manifest)
  appearance?: {
    modelPath?: string;
    iconPath?: string;
    scale?: number;
  };

  // Direct paths (flattened for convenience)
  modelPath?: string;
  thumbnailPath?: string;
  iconPath?: string;

  // Services for NPCs like shopkeepers/bankers
  services?: {
    enabled?: boolean;
    types?: string[];
  };

  // Spawn info
  spawnBiomes?: string[];

  // Legacy fields for compatibility
  level?: number;
  health?: number;
  combatLevel?: number;
}

/**
 * Resource from resources.json manifest
 * Matches the actual manifest structure
 */
export interface ResourceManifest {
  id: string;
  name: string;
  type: string; // "tree", "fishing_spot", "rock", etc.
  examine?: string;

  // Model paths
  modelPath: string | null;
  depletedModelPath?: string | null;

  // Scale
  scale?: number;
  depletedScale?: number;

  // Harvesting requirements
  harvestSkill?: string;
  toolRequired?: string | null;
  levelRequired?: number;

  // Timing
  baseCycleTicks?: number;
  depleteChance?: number;
  respawnTicks?: number;

  // Yield
  harvestYield?: Array<{
    itemId: string;
    itemName?: string;
    quantity: number;
    chance: number;
    xpAmount?: number;
    stackable?: boolean;
  }>;
}

/**
 * Music track from music.json manifest
 */
export interface MusicManifest {
  id: string;
  name: string;
  type: "theme" | "ambient" | "combat";
  category: "intro" | "normal" | "combat" | "boss" | "ambient";
  path: string;
  description?: string;
  duration?: number;
  mood?: string;
}

/**
 * Biome from biomes.json manifest
 */
export interface BiomeManifest {
  id: string;
  name: string;
  description?: string;
  terrain?: string;
  difficultyLevel?: number;
  difficulty?: number;
  colorScheme?: {
    primary: string;
    secondary: string;
    fog: string;
  };
  resources?: string[];
  resourceTypes?: string[];
  mobs?: string[];
  mobTypes?: string[];
}
