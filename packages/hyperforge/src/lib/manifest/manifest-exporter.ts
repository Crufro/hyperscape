/**
 * Manifest Exporter
 * Exports generated assets to game manifest format
 */

import type { AssetCategory } from "@/types/categories";
import { validateAssetForExport } from "./schema-validators";
import { generateAssetId } from "../generation/category-schemas";
import type { Item } from "@/types/game/item-types";
import type { NPCDataInput } from "@/types/game/npc-types";
import type { ResourceManifest } from "../cdn/types";

export interface ExportOptions {
  manifestPath?: string; // Path to manifest file (e.g., "items.json", "npcs.json")
  validate?: boolean; // Validate before export
  generateId?: boolean; // Auto-generate ID if missing
}

export interface ExportResult {
  success: boolean;
  manifestType: "items" | "npcs" | "resources";
  asset: Item | NPCDataInput | ResourceManifest;
  errors: string[];
  warnings: string[];
}

/**
 * Prepare asset for manifest export
 */
export function prepareAssetForExport(
  category: AssetCategory,
  metadata: Record<string, unknown>,
  modelPath?: string,
  options: ExportOptions = {},
): ExportResult {
  const { validate = true, generateId = true } = options;

  // Determine manifest type
  const manifestTypeMap: Record<AssetCategory, "items" | "npcs" | "resources"> =
    {
      weapon: "items",
      prop: "items",
      building: "items",
      npc: "npcs",
      character: "npcs",
      resource: "resources",
      environment: "resources",
    };

  const manifestType = manifestTypeMap[category];

  // Ensure ID exists
  let assetData = { ...metadata };
  if (generateId && !assetData.id) {
    assetData.id = generateAssetId(
      (assetData.name as string) || "asset",
      category,
    );
  }

  // Add model path if provided
  if (modelPath) {
    assetData.modelPath = modelPath;
  }

  // Validate
  let validation = { valid: true, errors: [], warnings: [] };
  if (validate) {
    validation = validateAssetForExport(category, assetData);
  }

  return {
    success: validation.valid,
    manifestType,
    asset: assetData as Item | NPCDataInput | ResourceManifest,
    errors: validation.errors,
    warnings: validation.warnings,
  };
}

/**
 * Format asset path for game manifest
 * Converts local paths to asset:// protocol
 */
export function formatAssetPath(localPath: string, assetId: string): string {
  // If already using asset:// protocol, return as-is
  if (localPath.startsWith("asset://")) {
    return localPath;
  }

  // Extract filename from path
  const filename = localPath.split("/").pop() || `${assetId}.glb`;

  // Format as asset:// path
  // Example: asset://models/sword-bronze/sword-bronze.glb
  return `asset://models/${assetId}/${filename}`;
}

/**
 * Generate manifest entry
 */
export function generateManifestEntry(
  category: AssetCategory,
  metadata: Record<string, unknown>,
  modelPath?: string,
): Item | NPCDataInput | ResourceManifest {
  const prepared = prepareAssetForExport(category, metadata, modelPath);

  if (!prepared.success) {
    throw new Error(`Validation failed: ${prepared.errors.join(", ")}`);
  }

  // Format model path if provided
  if (modelPath && prepared.asset) {
    const formattedPath = formatAssetPath(
      modelPath,
      (prepared.asset as { id: string }).id,
    );
    (prepared.asset as { modelPath?: string }).modelPath = formattedPath;
  }

  return prepared.asset;
}
