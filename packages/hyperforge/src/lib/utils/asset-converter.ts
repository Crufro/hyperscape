/**
 * Asset Converter
 * Converts between different asset formats
 */

import type { CDNAsset } from "@/lib/cdn/types";
import type { CDNAssetData } from "@/types/asset";
import { getAssetModelUrl, getAssetThumbnailUrl } from "@/lib/cdn/url-resolver";

// Input type that accepts CDNAsset or any extension of it (like LibraryAsset)
// Uses Omit to allow source to be any string, not just "CDN"
type CDNAssetInput = Omit<CDNAsset, "source"> & { source: string };

/**
 * Convert CDN asset to unified AssetData format
 * Accepts any object that has the required CDNAsset properties
 */
export function cdnAssetToAssetData(cdnAsset: CDNAssetInput): CDNAssetData {
  // Cast to CDNAsset for the URL resolvers
  const asset = cdnAsset as CDNAsset;
  return {
    id: asset.id,
    name: asset.name,
    source: "CDN",
    category: asset.category,
    description: asset.description,
    thumbnailUrl: getAssetThumbnailUrl(asset),
    modelUrl: getAssetModelUrl(asset),
    rarity: asset.rarity,
    modelPath: asset.modelPath,
    // VRM support
    hasVRM: asset.hasVRM,
    vrmPath: asset.vrmPath,
    vrmUrl: asset.vrmPath
      ? getAssetModelUrl({ ...asset, modelPath: asset.vrmPath })
      : undefined,
    // Hand rigging
    hasHandRigging: asset.hasHandRigging,
  };
}
