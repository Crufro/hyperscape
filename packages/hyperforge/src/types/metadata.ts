/**
 * Metadata Types
 * 
 * Explicit types for metadata fields throughout HyperForge.
 * Replaces `Record<string, unknown>` patterns with strongly-typed alternatives.
 */

import type { AssetCategory, Rarity } from "./core";

// =============================================================================
// GENERATION METADATA
// =============================================================================

/**
 * Metadata for assets generated through AI pipelines.
 * This includes both generation parameters and result metadata.
 * All fields are optional to support partial metadata scenarios.
 */
export interface GenerationMetadata {
  // Generation input parameters
  prompt?: string;
  pipeline?: "text-to-3d" | "image-to-3d";
  quality?: "preview" | "medium" | "high";
  generatedAt?: string;
  
  // External service metadata
  meshyTaskId?: string;
  polycount?: number;
  duration?: number;
  
  // Generation options
  style?: string;
  negativePrompt?: string;
  conceptArtUrl?: string;
  referenceImageUrl?: string;
  meshPreviewUrl?: string;
  
  // Asset metadata (added during/after generation)
  name?: string;
  assetId?: string;
  category?: AssetCategory;
  description?: string;
  
  // VRM/rigging metadata
  hasVRM?: boolean;
  hasHandRigging?: boolean;
  vrmUrl?: string;
  
  // Variant metadata
  hasVariants?: boolean;
  variantCount?: number;
  
  // Local file paths (after save)
  localModelUrl?: string;
  localVrmUrl?: string;
  localThumbnailUrl?: string;
}

// =============================================================================
// UPLOAD METADATA
// =============================================================================

/**
 * Metadata for manually uploaded assets
 */
export interface UploadMetadata {
  source: "upload";
  originalFilename: string;
  uploadedAt: string;
  fileSize?: number;
  mimeType?: string;
}

// =============================================================================
// BATCH OPERATION METADATA
// =============================================================================

/**
 * Metadata for batch generation items
 */
export interface BatchItemMetadata {
  prompt: string;
  category: AssetCategory;
  index: number;
  batchId: string;
  generatedAt?: string;
}

// =============================================================================
// ENTITY METADATA
// =============================================================================

/**
 * Metadata for world entities (players, NPCs, mobs, items, etc.)
 */
export interface EntityMetadata {
  spawnArea?: string;
  area?: string;
  level?: number;
  faction?: string;
  isActive?: boolean;
  loadedAt?: string;
}

// =============================================================================
// ASSET VERSION METADATA
// =============================================================================

/**
 * Metadata stored in asset version snapshots.
 * Contains stats, bonuses, and game-specific properties.
 */
export interface AssetVersionMetadata {
  // Item properties
  value?: number;
  weight?: number;
  stackable?: boolean;
  tradeable?: boolean;
  
  // Combat stats
  bonusAttack?: number;
  bonusStrength?: number;
  bonusDefense?: number;
  bonusRanged?: number;
  bonusMagic?: number;
  bonusPrayer?: number;
  
  // Equipment properties
  equipSlot?: string;
  weaponType?: string;
  attackType?: string;
  attackSpeed?: number;
  attackRange?: number;
  
  // Requirements
  levelRequired?: number;
  skillRequirements?: Record<string, number>;
  
  // NPC properties
  npcCategory?: string;
  health?: number;
  combatLevel?: number;
  aggressive?: boolean;
  
  // Resource properties
  harvestSkill?: string;
  toolRequired?: string;
  
  // Generation metadata
  prompt?: string;
  pipeline?: string;
  quality?: string;
  meshyTaskId?: string;
  generatedAt?: string;
}

// =============================================================================
// UPLOAD FORM METADATA
// =============================================================================

/**
 * Metadata collected during asset upload form submission.
 * This is the complete set of fields that can be specified during upload.
 */
export interface AssetUploadFormMetadata {
  name: string;
  category: string;
  description?: string;
  rarity: string;
  
  // Item properties
  value?: number;
  weight?: number;
  stackable?: boolean;
  tradeable?: boolean;
  
  // Equipment properties
  equipSlot?: string;
  weaponType?: string;
  attackType?: string;
  attackSpeed?: number;
  attackRange?: number;
  
  // Combat bonuses
  bonusAttack?: number;
  bonusStrength?: number;
  bonusDefense?: number;
  bonusRanged?: number;
  bonusMagic?: number;
  
  // Requirements
  levelRequired?: number;
  
  // NPC properties
  npcCategory?: string;
  faction?: string;
  combatLevel?: number;
  health?: number;
  aggressive?: boolean;
  
  // Resource properties
  harvestSkill?: string;
  toolRequired?: string;
}

// =============================================================================
// REGISTRY ASSET METADATA
// =============================================================================

/**
 * Metadata for assets in the asset registry.
 * Can be either generation metadata or upload metadata.
 */
export type RegistryAssetMetadata = GenerationMetadata | UploadMetadata | AssetVersionMetadata;

// =============================================================================
// GENERATION FORM METADATA
// =============================================================================

/**
 * Metadata passed with generation form submissions.
 * Contains category-specific options and generation parameters.
 * This is extensible to support various asset types.
 */
export interface GenerationFormMetadata {
  // Identity fields (set by forms)
  id?: string;
  name?: string;
  description?: string;
  category?: string;
  type?: string;  // Generic type field used by various forms
  
  // Common fields
  style?: string;
  negativePrompt?: string;
  rarity?: Rarity;
  tier?: string;
  level?: number;
  
  // NPC/Character metadata
  npcType?: string;
  faction?: string;
  behavior?: string;
  combatLevel?: number;
  health?: number;
  scale?: number;
  
  // Weapon metadata
  weaponType?: string;
  attackType?: string;
  material?: string;
  
  // Building metadata
  buildingStyle?: string;
  buildingType?: string;
  floors?: number;
  size?: string;
  
  // Resource metadata
  resourceType?: string;
  harvestable?: boolean;
  skill?: string;
  
  // Environment metadata
  biome?: string;
  timeOfDay?: string;
  weather?: string;
  
  // Prop metadata
  propType?: string;
  interactable?: boolean;
  value?: number;
  examine?: string;
  
  // Building-specific
  componentType?: string;
  
  // Item-specific
  tradeable?: boolean;
  
  // Weapon-specific
  attackSpeed?: number;
  attackRange?: number;
  bonuses?: {
    attack?: number;
    strength?: number;
    defense?: number;
    ranged?: number;
    magic?: number;
    prayer?: number;
  };
  requirements?: {
    level?: number;
    skills?: Record<string, number>;
  };
  depletedScale?: number;
  levelRequired?: number;
  
  // Resource-specific (additional)
  harvestSkill?: string;
  toolRequired?: string;
}
