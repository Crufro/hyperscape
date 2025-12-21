/**
 * Asset Converter
 * Converts between different asset formats
 */

import type { CDNAsset } from "@/lib/cdn/types";
import type { AssetData } from "@/types/asset";
import type { CombatBonuses, Requirements } from "@/types/core";
import { getAssetModelUrl, getAssetThumbnailUrl } from "@/lib/cdn/url-resolver";

/**
 * Valid property value types for CDN asset fields
 * Covers all primitive and complex types that can appear in CDNAsset
 */
type CDNAssetFieldValue =
  | string
  | number
  | boolean
  | CombatBonuses
  | Requirements
  | Record<string, number>
  | undefined;

// Input type that accepts CDNAsset or any extension of it (like LibraryAsset)
// Uses flexible types for fields that may be strings in some contexts
export interface CDNAssetInput {
  id: string;
  name: string;
  source: string;
  category: CDNAsset["category"];
  modelPath?: string;
  description?: string;
  thumbnailPath?: string;
  iconPath?: string;
  rarity?: CDNAsset["rarity"];
  type?: string;
  subtype?: string;
  hasVRM?: boolean;
  vrmPath?: string;
  hasHandRigging?: boolean;
  // Allow string for these equipment fields for flexibility
  equipSlot?: string;
  weaponType?: string;
  attackType?: string;
  // Index signature for additional fields from CDNAsset extensions
  [key: string]: CDNAssetFieldValue;
}

/**
 * Convert CDN asset to unified AssetData format
 * Accepts any object that has the required CDNAsset properties
 * Preserves original source for LOCAL/FORGE assets (Supabase storage)
 */
export function cdnAssetToAssetData(cdnAsset: CDNAssetInput): AssetData {
  // Cast to CDNAsset for the URL resolvers
  const asset = cdnAsset as CDNAsset;

  // Preserve original source for LOCAL/FORGE assets (Supabase)
  // Only default to "CDN" for actual CDN assets
  const originalSource = cdnAsset.source?.toUpperCase();
  // Map FORGE to LOCAL since they're both non-CDN sources
  const source: "CDN" | "LOCAL" | "BASE" =
    originalSource === "LOCAL" || originalSource === "FORGE"
      ? "LOCAL"
      : originalSource === "BASE"
        ? "BASE"
        : "CDN";

  const baseFields = {
    id: asset.id,
    name: asset.name,
    category: asset.category,
    description: asset.description,
    thumbnailUrl: getAssetThumbnailUrl(asset),
    modelUrl: getAssetModelUrl(asset),
    rarity: asset.rarity,
    modelPath: asset.modelPath,
    // VRM support
    hasVRM: asset.hasVRM,
    vrmPath: asset.vrmPath,
    // Use existing vrmUrl if it's a full URL, otherwise resolve from vrmPath
    vrmUrl: (cdnAsset as { vrmUrl?: string }).vrmUrl?.startsWith("http")
      ? (cdnAsset as { vrmUrl?: string }).vrmUrl
      : asset.vrmPath
        ? getAssetModelUrl({ ...asset, modelPath: asset.vrmPath })
        : undefined,
    // Hand rigging
    hasHandRigging: asset.hasHandRigging,
  };

  // Return typed based on source
  if (source === "CDN") {
    return {
      ...baseFields,
      source: "CDN" as const,
      modelPath: asset.modelPath || "",
    };
  } else if (source === "BASE") {
    return {
      ...baseFields,
      source: "BASE" as const,
      modelPath: asset.modelPath || "",
    };
  } else {
    // LOCAL assets need status discriminant
    return {
      ...baseFields,
      source: "LOCAL" as const,
      status: "completed" as const,
      hasModel: true,
      metadata: {
        prompt: "",
        pipeline: "text-to-3d",
        quality: "high",
        generatedAt: new Date().toISOString(),
      },
    };
  }
}
