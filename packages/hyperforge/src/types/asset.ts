/**
 * Asset Types for HyperForge
 *
 * Unified types for all asset storage variants (CDN, Local, Base).
 * These types represent how assets are stored and managed in HyperForge.
 */

import type { AssetSource, AssetCategory, Rarity } from "./core";

// =============================================================================
// SPRITE DATA
// =============================================================================

/**
 * Sprite image data for 2D representations
 */
export interface SpriteData {
  angle: string;
  imageUrl: string;
}

// =============================================================================
// BASE ASSET
// =============================================================================

/**
 * Base asset interface - common fields for all asset types
 */
export interface BaseAsset {
  id: string;
  name: string;
  source: AssetSource;
  category: AssetCategory;
  description?: string;
  thumbnailUrl?: string;
  thumbnailPath?: string;
  modelUrl?: string;
  modelPath?: string;
  iconPath?: string;
  rarity?: Rarity;
  type?: string;
  subtype?: string;
  /** Whether this asset has a VRM version */
  hasVRM?: boolean;
  /** URL to the VRM model (if available) */
  vrmUrl?: string;
  /** Path to the VRM model (if available) */
  vrmPath?: string;
  /** Whether this asset has hand bones added */
  hasHandRigging?: boolean;
  /** Whether this asset has generated sprites */
  hasSprites?: boolean;
  /** Array of sprite images for this asset */
  sprites?: SpriteData[];
}

// =============================================================================
// CDN ASSET
// =============================================================================

/**
 * CDN Asset - read-only asset from game CDN manifests
 * Contains extended metadata from manifest files
 */
export interface CDNAsset extends BaseAsset {
  source: "CDN";
  modelPath: string;
  examine?: string;

  // Item metadata
  value?: number;
  weight?: number;
  stackable?: boolean;
  tradeable?: boolean;

  // Equipment metadata (imported from core for consistency)
  equipSlot?: import("./core").EquipSlot;
  weaponType?: import("./core").WeaponType;
  attackType?: import("./core").AttackType;
  equippedModelPath?: string;

  // Combat stats
  bonuses?: import("./core").CombatBonuses;

  // Requirements
  requirements?: import("./core").Requirements;

  // NPC-specific
  npcCategory?: import("./core").NPCCategory;
  faction?: string;
  level?: number;
  combatLevel?: number;
  attackable?: boolean;

  // Resource-specific
  harvestSkill?: string;
  toolRequired?: string;
  levelRequired?: number;
}

// =============================================================================
// LOCAL ASSET
// =============================================================================

/**
 * Base fields for all local assets
 */
interface LocalAssetBase extends BaseAsset {
  source: "LOCAL";
  localPath?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  prompt?: string;
}

/**
 * Draft local asset - not yet started generation
 */
export interface LocalAssetDraft extends LocalAssetBase {
  readonly status: "draft";
  /** Draft-specific: generation not yet started */
  generationParams?: {
    pipeline?: string;
    quality?: string;
    provider?: string;
  };
}

/**
 * Processing local asset - generation in progress
 */
export interface LocalAssetProcessing extends LocalAssetBase {
  readonly status: "processing";
  /** Processing-specific: Meshy task ID for tracking */
  taskId: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current pipeline stage */
  currentStage?: string;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
}

/**
 * Completed local asset - generation successful
 */
export interface LocalAssetCompleted extends LocalAssetBase {
  readonly status: "completed";
  /** Completed-specific: always has a model */
  hasModel: true;
  /** URL to the generated model (required for completed) */
  modelUrl: string;
  /** Generation metadata */
  metadata: {
    prompt: string;
    pipeline: string;
    quality: string;
    generatedAt: string;
    meshyTaskId?: string;
    polycount?: number;
    duration?: number;
  };
}

/**
 * Failed local asset - generation failed
 */
export interface LocalAssetFailed extends LocalAssetBase {
  readonly status: "failed";
  /** Failed-specific: error information */
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
  /** Optional partial metadata if generation failed mid-way */
  partialMetadata?: {
    prompt?: string;
    pipeline?: string;
    failedAt?: string;
  };
}

/**
 * Local Asset - discriminated union by status
 * Use status to access status-specific fields
 *
 * @example
 * function renderAsset(asset: LocalAsset) {
 *   switch (asset.status) {
 *     case "draft":
 *       return <DraftCard params={asset.generationParams} />;
 *     case "processing":
 *       return <ProgressBar progress={asset.progress} />;
 *     case "completed":
 *       return <ModelViewer url={asset.modelUrl} />;
 *     case "failed":
 *       return <ErrorCard error={asset.error} />;
 *   }
 * }
 */
export type LocalAsset =
  | LocalAssetDraft
  | LocalAssetProcessing
  | LocalAssetCompleted
  | LocalAssetFailed;

/**
 * Type guard for draft assets
 */
export function isLocalAssetDraft(asset: LocalAsset): asset is LocalAssetDraft {
  return asset.status === "draft";
}

/**
 * Type guard for processing assets
 */
export function isLocalAssetProcessing(
  asset: LocalAsset,
): asset is LocalAssetProcessing {
  return asset.status === "processing";
}

/**
 * Type guard for completed assets
 */
export function isLocalAssetCompleted(
  asset: LocalAsset,
): asset is LocalAssetCompleted {
  return asset.status === "completed";
}

/**
 * Type guard for failed assets
 */
export function isLocalAssetFailed(asset: LocalAsset): asset is LocalAssetFailed {
  return asset.status === "failed";
}

// =============================================================================
// BASE TEMPLATE ASSET
// =============================================================================

/**
 * Base Template Asset - starting point for generation
 */
export interface BaseTemplateAsset extends BaseAsset {
  source: "BASE";
  modelPath: string;
}

// =============================================================================
// UNIFIED ASSET TYPE
// =============================================================================

/**
 * Union type for all HyperForge assets
 */
export type HyperForgeAsset = CDNAsset | LocalAsset | BaseTemplateAsset;

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if asset is from CDN
 */
export function isCDNAsset(asset: HyperForgeAsset): asset is CDNAsset {
  return asset.source === "CDN";
}

/**
 * Check if asset is local
 */
export function isLocalAsset(asset: HyperForgeAsset): asset is LocalAsset {
  return asset.source === "LOCAL";
}

/**
 * Check if asset is a base template
 */
export function isBaseTemplateAsset(
  asset: HyperForgeAsset,
): asset is BaseTemplateAsset {
  return asset.source === "BASE";
}

// =============================================================================
// LEGACY ALIASES (for backwards compatibility)
// =============================================================================

/** @deprecated Use BaseAsset instead */
export type BaseAssetData = BaseAsset;

/** @deprecated Use CDNAsset instead */
export type CDNAssetData = CDNAsset;

/** @deprecated Use LocalAsset instead */
export type LocalAssetData = LocalAsset;

/** @deprecated Use BaseTemplateAsset instead */
export type BaseTemplateAssetData = BaseTemplateAsset;

/** @deprecated Use HyperForgeAsset instead */
export type AssetData = HyperForgeAsset;
