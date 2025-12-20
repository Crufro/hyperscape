/**
 * Asset Naming Conventions
 *
 * The game uses TWO different naming conventions:
 *
 * 1. GAME ENTITY IDs (snake_case) - used in manifest `id` fields:
 *    - bronze_sword, chainbody_dragon, spiked_helmet
 *    - Used for: items.json id, npcs.json id, resources.json id
 *
 * 2. FILE/FOLDER PATHS (kebab-case) - used for storage:
 *    - sword-bronze/sword-bronze.glb, shield-steel/concept-art.png
 *    - Used for: modelPath, iconPath, file storage
 *
 * FOLDER STRUCTURE (models):
 *   models/{folder-name}/
 *     ├── {folder-name}.glb       - Main 3D model
 *     ├── {folder-name}.vrm       - VRM avatar (if character)
 *     ├── {folder-name}_rigged.glb - Rigged model (if character)
 *     ├── {folder-name}_preview.glb - Preview/untextured model
 *     ├── concept-art.png         - Thumbnail/icon
 *     ├── metadata.json           - Asset metadata
 *     └── animations/             - Animation files (if character)
 *
 * AUDIO STRUCTURE:
 *   audio/
 *     ├── music/{filename}.mp3
 *     ├── soundeffects/{description}_{variant}.mp3
 *     └── voice/{npc_id}/{dialogue_id}.mp3
 *
 * EXAMPLES:
 *   Name: "Bronze Sword"
 *   → Game ID: "bronze_sword" (for manifest)
 *   → Folder: "sword-bronze" (for storage)
 *   → Model: "asset://models/sword-bronze/sword-bronze.glb"
 */

import { logger } from "@/lib/utils";

const log = logger.child("AssetNaming");

/**
 * Convert any string to snake_case (for game entity IDs in manifests)
 *
 * Examples:
 *   "Bronze Sword" → "bronze_sword"
 *   "Dragon Chainbody" → "dragon_chainbody"
 *   "Goblin Level 5" → "goblin_level_5"
 *   "sword-bronze" → "sword_bronze"
 */
export function toSnakeCase(input: string): string {
  return input
    .toLowerCase()
    .trim()
    // Replace hyphens with underscores
    .replace(/-/g, "_")
    // Replace multiple spaces/underscores with single underscore
    .replace(/[\s_]+/g, "_")
    // Remove any non-alphanumeric characters except underscores
    .replace(/[^a-z0-9_]/g, "")
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, "");
}

/**
 * Convert any string to kebab-case (for file/folder paths)
 *
 * Examples:
 *   "Bronze Sword" → "bronze-sword"
 *   "dragon_chainbody" → "dragon-chainbody"
 *   "Goblin Level 5" → "goblin-level-5"
 *   "  Multiple   Spaces  " → "multiple-spaces"
 */
export function toKebabCase(input: string): string {
  return input
    .toLowerCase()
    .trim()
    // Replace underscores with hyphens
    .replace(/_/g, "-")
    // Replace multiple spaces/hyphens with single hyphen
    .replace(/[\s-]+/g, "-")
    // Remove any non-alphanumeric characters except hyphens
    .replace(/[^a-z0-9-]/g, "")
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, "");
}

/**
 * Generate a game entity ID (snake_case) for manifest files
 *
 * Examples:
 *   "Bronze Sword" → "bronze_sword"
 *   "Dragon Chainbody" → "dragon_chainbody"
 */
export function generateGameId(name: string): string {
  return toSnakeCase(name);
}

/**
 * Generate a folder/file name (kebab-case) for storage paths
 *
 * Examples:
 *   "Bronze Sword" → "bronze-sword"
 *   "Dragon Chainbody" → "dragon-chainbody"
 */
export function generateFolderName(name: string): string {
  return toKebabCase(name);
}

/**
 * Generate a contextual asset ID from a name
 *
 * If no name provided, generates from category/type + timestamp
 */
export function generateAssetId(
  name?: string,
  options?: {
    category?: string;
    type?: string;
    material?: string;
    fallbackPrefix?: string;
  }
): string {
  const { category, type, material, fallbackPrefix = "asset" } = options || {};

  // If we have a name, convert it to kebab-case
  if (name && name.trim()) {
    let id = toKebabCase(name);

    // If material is specified separately and not in name, append it
    if (material && !id.includes(toKebabCase(material))) {
      id = `${id}-${toKebabCase(material)}`;
    }

    return id;
  }

  // Generate a contextual ID if no name provided
  const parts: string[] = [];

  if (type) {
    parts.push(toKebabCase(type));
  } else if (category) {
    parts.push(toKebabCase(category));
  } else {
    parts.push(fallbackPrefix);
  }

  if (material) {
    parts.push(toKebabCase(material));
  }

  // Add short timestamp for uniqueness (last 6 chars of timestamp)
  const timestamp = Date.now().toString(36).slice(-6);
  parts.push(timestamp);

  return parts.join("-");
}

/**
 * Generate a variant ID from a base asset ID and material
 *
 * Examples:
 *   baseId: "sword-base", material: "bronze" → "sword-bronze"
 *   baseId: "pickaxe", material: "steel" → "pickaxe-steel"
 */
export function generateVariantId(baseId: string, material: string): string {
  const baseName = baseId.replace(/-base$/, "");
  return `${baseName}-${toKebabCase(material)}`;
}

/**
 * Generate audio asset ID with proper format
 *
 * @param type - "voice" | "sfx" | "music"
 * @param description - What the audio is (e.g., "sword clash", "goblin death")
 * @param variant - Optional variant number (defaults to 001)
 */
export function generateAudioId(
  type: "voice" | "sfx" | "music",
  description: string,
  variant?: number | string
): string {
  const baseId = toKebabCase(description);

  if (type === "voice") {
    // Voice files don't need variant numbers usually
    return baseId;
  }

  // SFX and music get variant numbers
  const variantNum = variant
    ? String(variant).padStart(3, "0")
    : "001";

  return `${baseId}-${variantNum}`;
}

/**
 * Generate audio filename following conventions
 *
 * @param type - Audio type
 * @param id - Asset ID (already kebab-case)
 */
export function generateAudioFilename(
  type: "voice" | "sfx" | "music",
  id: string
): string {
  return `${id}.mp3`;
}

/**
 * Get the standard paths for an asset
 */
export interface AssetPaths {
  /** Directory: models/{id}/ */
  dir: string;
  /** Model file: models/{id}/{id}.glb */
  model: string;
  /** VRM file: models/{id}/{id}.vrm */
  vrm: string;
  /** Rigged model: models/{id}/{id}_rigged.glb */
  rigged: string;
  /** Preview model: models/{id}/{id}_preview.glb */
  preview: string;
  /** Concept art/thumbnail: models/{id}/concept-art.png */
  conceptArt: string;
  /** Metadata: models/{id}/metadata.json */
  metadata: string;
  /** Animations directory: models/{id}/animations/ */
  animations: string;
}

export function getAssetPaths(assetId: string, baseDir: string = ""): AssetPaths {
  const dir = baseDir ? `${baseDir}/${assetId}` : assetId;

  return {
    dir,
    model: `${dir}/${assetId}.glb`,
    vrm: `${dir}/${assetId}.vrm`,
    rigged: `${dir}/${assetId}_rigged.glb`,
    preview: `${dir}/${assetId}_preview.glb`,
    conceptArt: `${dir}/concept-art.png`,
    metadata: `${dir}/metadata.json`,
    animations: `${dir}/animations`,
  };
}

/**
 * Get audio paths based on type
 */
export interface AudioPaths {
  /** Full path including filename */
  path: string;
  /** Directory only */
  dir: string;
  /** Filename only */
  filename: string;
}

export function getAudioPaths(
  type: "voice" | "sfx" | "music",
  id: string,
  options?: { npcId?: string; category?: string }
): AudioPaths {
  const { npcId, category } = options || {};
  const filename = generateAudioFilename(type, id);

  let dir: string;
  switch (type) {
    case "voice":
      dir = npcId ? `audio/voice/${npcId}` : "audio/voice";
      break;
    case "sfx":
      dir = "audio/soundeffects";
      break;
    case "music":
      dir = category ? `audio/music/${category}` : "audio/music";
      break;
  }

  return {
    path: `${dir}/${filename}`,
    dir,
    filename,
  };
}

/**
 * Build asset:// protocol paths for manifest entries
 */
export function buildAssetPath(assetId: string, filename: string): string {
  return `asset://models/${assetId}/${filename}`;
}

export function buildModelPath(assetId: string): string {
  return buildAssetPath(assetId, `${assetId}.glb`);
}

export function buildVRMPath(assetId: string): string {
  return buildAssetPath(assetId, `${assetId}.vrm`);
}

export function buildIconPath(assetId: string): string {
  return buildAssetPath(assetId, "concept-art.png");
}

export function buildAudioPath(type: "voice" | "sfx" | "music", filename: string): string {
  const typeDir = type === "sfx" ? "soundeffects" : type;
  return `asset://audio/${typeDir}/${filename}`;
}

/**
 * Validate an asset ID follows conventions
 */
export function validateAssetId(id: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!id) {
    issues.push("Asset ID is required");
    return { valid: false, issues };
  }

  // Check for valid kebab-case
  if (id !== toKebabCase(id)) {
    issues.push(`ID should be kebab-case: "${id}" → "${toKebabCase(id)}"`);
  }

  // Check for random/generated patterns we want to avoid
  if (/^(gen|uploaded|asset)-\d+/.test(id)) {
    issues.push("ID should be descriptive, not timestamp-based");
  }

  if (/[0-9a-f]{8}-[0-9a-f]{4}/.test(id)) {
    issues.push("ID should not contain UUIDs");
  }

  // Check minimum length
  if (id.length < 3) {
    issues.push("ID should be at least 3 characters");
  }

  // Check for common bad patterns
  if (id.includes("_")) {
    issues.push("Use hyphens instead of underscores");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Suggest a better asset ID if current one has issues
 */
export function suggestAssetId(
  currentId: string,
  context?: {
    name?: string;
    type?: string;
    category?: string;
    material?: string;
  }
): string {
  // If we have a descriptive name, use it
  if (context?.name && context.name.trim()) {
    return generateAssetId(context.name, context);
  }

  // Try to extract useful info from current ID
  const cleaned = toKebabCase(currentId);

  // Remove common prefixes
  const withoutPrefix = cleaned
    .replace(/^(gen|uploaded|asset)-/, "")
    .replace(/^[0-9]+-/, "")
    .replace(/-[0-9a-z]{6,8}$/, ""); // Remove timestamp suffixes

  if (withoutPrefix && withoutPrefix.length >= 3) {
    return withoutPrefix;
  }

  // Fall back to generating from context
  return generateAssetId(undefined, context);
}

/**
 * Create standardized metadata object for assets
 */
export interface StandardMetadata {
  name: string;
  gameId: string;
  type: string;
  subtype?: string;
  description: string;
  detailedPrompt?: string;
  generatedAt: string;
  completedAt?: string;
  isBaseModel: boolean;
  materialVariants: string[];
  isPlaceholder: boolean;
  hasModel: boolean;
  hasConceptArt: boolean;
  modelPath: string;
  conceptArtUrl: string;
  gddCompliant: boolean;
  workflow: string;
  meshyTaskId?: string;
  meshyStatus?: string;
  isVariant?: boolean;
  baseMaterial?: string;
  parentBaseModel?: string;
  materialStylePrompt?: string;
  source: "FORGE" | "LOCAL";
}

export function createStandardMetadata(
  assetId: string,
  options: {
    name: string;
    type: string;
    subtype?: string;
    description: string;
    prompt?: string;
    workflow?: string;
    isBaseModel?: boolean;
    materialVariants?: string[];
    meshyTaskId?: string;
    meshyStatus?: string;
    isVariant?: boolean;
    baseMaterial?: string;
    parentBaseModel?: string;
    materialStylePrompt?: string;
    source?: "FORGE" | "LOCAL";
    hasModel?: boolean;
    hasConceptArt?: boolean;
  }
): StandardMetadata {
  const now = new Date().toISOString();

  return {
    name: assetId,
    gameId: assetId,
    type: options.type,
    subtype: options.subtype,
    description: options.description,
    detailedPrompt: options.prompt,
    generatedAt: now,
    completedAt: now,
    isBaseModel: options.isBaseModel ?? !options.isVariant,
    materialVariants: options.materialVariants ?? [],
    isPlaceholder: false,
    hasModel: options.hasModel ?? true,
    hasConceptArt: options.hasConceptArt ?? true,
    modelPath: `${assetId}/${assetId}.glb`,
    conceptArtUrl: "./concept-art.png",
    gddCompliant: true,
    workflow: options.workflow ?? "HyperForge Generation Pipeline",
    meshyTaskId: options.meshyTaskId,
    meshyStatus: options.meshyStatus,
    isVariant: options.isVariant,
    baseMaterial: options.baseMaterial,
    parentBaseModel: options.parentBaseModel,
    materialStylePrompt: options.materialStylePrompt,
    source: options.source ?? "FORGE",
  };
}

// Log when module loads
log.debug("Asset naming conventions loaded");
