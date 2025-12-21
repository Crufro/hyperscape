/**
 * HyperForge Type Definitions - Barrel Export
 *
 * This is the main entry point for all HyperForge types.
 * Import from '@/types' for a unified type experience.
 *
 * Organization:
 * - core.ts: Foundational types (source, category, rarity, combat)
 * - asset.ts: Asset storage types (CDN, Local, Base)
 * - manifest.ts: Game manifest types for import/export
 * - generation.ts: AI generation pipeline types
 * - audio.ts: Audio asset types (voice, SFX, music)
 * - game/*: Game content types (items, NPCs, quests, dialogue)
 *
 * Naming Conventions:
 * - PascalCase for types and interfaces
 * - Lowercase for string literal unions (e.g., "melee" | "ranged")
 * - No I prefix for interfaces
 * - Descriptive names (Item, not IItem; CDNAsset, not CDNAssetData)
 */

// =============================================================================
// CORE TYPES
// =============================================================================

export type {
  AssetSource,
  AssetCategory,
  ModelCategory,
  ManifestType,
  Rarity,
  EquipSlot,
  WeaponType,
  AttackType,
  CombatBonuses,
  CombatBonusesFull,
  Requirements,
  SkillType,
  SkillRequirements,
  NPCCategory,
  ItemType,
  Position3D,
  GeneratedMetadata,
} from "./core";

export { CATEGORY_TO_MANIFEST, RARITY_COLORS, fillCombatBonuses } from "./core";

// =============================================================================
// METADATA TYPES
// =============================================================================

export type {
  GenerationMetadata,
  UploadMetadata,
  BatchItemMetadata,
  EntityMetadata,
  AssetVersionMetadata,
  AssetUploadFormMetadata,
  RegistryAssetMetadata,
  GenerationFormMetadata,
} from "./metadata";

// =============================================================================
// ASSET TYPES
// =============================================================================

export type {
  SpriteData,
  BaseAsset,
  CDNAsset,
  LocalAsset,
  BaseTemplateAsset,
  HyperForgeAsset,
  // Legacy aliases
  BaseAssetData,
  CDNAssetData,
  LocalAssetData,
  BaseTemplateAssetData,
  AssetData,
} from "./asset";

export { isCDNAsset, isLocalAsset, isBaseTemplateAsset } from "./asset";

// =============================================================================
// MANIFEST TYPES
// =============================================================================

export type {
  ItemManifest,
  NPCManifest,
  ResourceManifest,
  MusicTrackManifest,
  BiomeManifest,
  CategoryDefinition,
  CategoryMetadataSchema,
  CategoryDefaults,
  VariantGenerationInfo,
  ManifestVariant,
  AssetWithVariants,
} from "./manifest";

export {
  CATEGORIES,
  getCategory,
  getAllCategories,
  getCategoriesByManifestType,
} from "./manifest";

// =============================================================================
// GENERATION TYPES
// =============================================================================

export type {
  GenerationPipeline,
  AIProvider,
  GenerationQuality,
  GenerationStatus,
  GenerationProgress,
  GenerationConfig,
  GenerationOptions,
  GenerationResult,
  BatchGenerationJob,
} from "./generation";

// =============================================================================
// AUDIO TYPES
// =============================================================================

export type {
  VoiceAsset,
  SoundEffectAsset,
  SoundEffectCategory,
  MusicAsset,
  MusicCategory,
  AudioManifest,
  VoiceManifest,
  SoundEffectManifest,
  MusicManifest,
  VoiceGenerationRequest,
  SoundEffectGenerationRequest,
  MusicGenerationRequest,
  AudioLibrary,
  ZoneId,
} from "./audio";

// =============================================================================
// GAME CONTENT TYPES
// =============================================================================

// Re-export all game types
export * from "./game";

// =============================================================================
// SERVICE TYPES
// =============================================================================

export type {
  // Viewer ref types
  HandCaptureViews,
  HandRiggingViewerRef,
  // TensorFlow types
  TensorFlowKeypoint,
  TensorFlowHand,
  // Hand rigging types
  HandBoneStructure,
  SingleHandResult,
  BoneStats,
  HandRiggingMetadata,
  HandRiggingOptions,
  RequiredHandRiggingOptions,
  HandRiggingResult,
  FingerName,
  FingerBoneCounts,
  // Debug types
  Point3D,
  DetectedHandPose,
  DetectedPoseResult,
  VertexSegmentationResult,
  BonePositionsMap,
  HandRiggingResultWithDebug,
  // GLTF types
  GLTFPrimitive,
  GLTFMesh,
  GLTFNode,
  GLTFSkin,
  GLTFAccessor,
  GLTFBufferView,
  GLTFTextureInfo,
  GLTFPbrMetallicRoughness,
  GLTFMaterial,
  GLTFTexture,
  GLTFImage,
  GLTFSampler,
  GLTFAnimationChannelTarget,
  GLTFAnimationChannel,
  GLTFAnimationSampler,
  GLTFAnimation,
  GLTFExtensionData,
  GLTFDocument,
  // Normalization types
  AxisConvention,
  FrontDirection,
  NormalizationConventions,
  NormalizationResult,
} from "./service-types";

export { NORMALIZATION_CONVENTIONS, getConvention } from "./service-types";

// =============================================================================
// TYPE UTILITIES
// =============================================================================

// =============================================================================
// TYPE GUARDS
// =============================================================================

export {
  // Primitive guards
  isArray,
  isFiniteNumber,
  isNonNegativeNumber,
  isInteger,
  isPositiveInteger,
  // Enum/union type guards
  isAssetCategory,
  isRarity,
  isEquipSlot,
  isWeaponType,
  isAttackType,
  isNPCCategory,
  isSkillType,
  isItemType,
  isAssetSource,
  // Three.js guards
  isMesh,
  isSkinnedMesh,
  isBone,
  isGroup,
  hasBufferGeometry,
  // Generic guards
  isNonNull,
  isObject as isObjectGuard,
  hasProperty,
  hasStringProperty,
  hasNonEmptyStringProperty,
  hasNumberProperty,
  hasBooleanProperty,
  hasArrayProperty,
  hasObjectProperty,
  isString,
  isNumber,
  isBoolean,
  isArrayOf,
  isNonEmptyArray,
  // Asset-specific guards
  hasModelUrl,
  hasModelPath,
  hasThumbnailUrl,
  hasVRM,
  hasSprites,
  isEquipment,
  isWeaponAsset,
  hasCombatBonuses,
  hasRequirements,
  isResourceAsset,
  isNPCAsset,
  isAttackableAsset,
  // Manifest guards
  isItemManifest,
  isNPCManifest,
  isResourceManifest,
  isGLTFDocument,
  // Safe property access
  getProperty,
  getStringProperty,
  getNumberProperty,
  getObjectProperty,
} from "./guards";

export {
  // Branded ID types
  type UserId,
  type AssetId,
  type TaskId,
  type GenerationId,
  type ManifestId,
  type VoiceId,
  type MusicId,
  type SpriteId,
  type DialogueId,
  type ItemId,
  type NpcId,
  // Branded ID creators
  createUserId,
  createAssetId,
  createTaskId,
  createGenerationId,
  // Result types
  type Result,
  type AsyncResult,
  type Option,
  ok,
  err,
  some,
  none,
  // Error handling
  type AppError,
  isError,
  toError,
  toAppError,
  getErrorMessage,
  // Exhaustiveness
  assertNever,
  exhaustive,
  // Validation
  validateOrThrow,
  getOrThrow,
  getOr,
  // Type guards
  isObject,
  isNonEmptyString,
  isPositiveNumber,
  assert,
  assertDefined,
} from "./utils";

// =============================================================================
// STRUCTURE TYPES
// =============================================================================

// Note: Structure types are now defined in @/lib/world/tile-types.ts
// The structures module was removed - use StructureSpawnConfig from tile-types
export type { StructureSpawnConfig } from "@/lib/world/tile-types";

// =============================================================================
// LEGACY RE-EXPORTS (for backwards compatibility)
// =============================================================================

/**
 * @deprecated Import from '@/types' instead of '@/lib/cdn/types'
 * These re-exports maintain backwards compatibility during migration.
 */
export type { Rarity as AssetRarity } from "./core";
