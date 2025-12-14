/**
 * Asset Converter
 * Converts between different asset formats
 */

import type { CDNAsset } from "@/lib-core/cdn/types";
import type { CDNAssetData } from "@/types/asset";
import {
  getAssetModelUrl,
  getAssetThumbnailUrl,
} from "@/lib-core/cdn/url-resolver";

/**
 * Convert CDN asset to unified AssetData format
 */
export function cdnAssetToAssetData(cdnAsset: CDNAsset): CDNAssetData {
  return {
    id: cdnAsset.id,
    name: cdnAsset.name,
    source: "CDN",
    category: cdnAsset.category,
    description: cdnAsset.description,
    thumbnailUrl: getAssetThumbnailUrl(cdnAsset),
    modelUrl: getAssetModelUrl(cdnAsset),
    rarity: cdnAsset.rarity,
    modelPath: cdnAsset.modelPath,
    // VRM support
    hasVRM: cdnAsset.hasVRM,
    vrmPath: cdnAsset.vrmPath,
    vrmUrl: cdnAsset.vrmPath
      ? getAssetModelUrl({ ...cdnAsset, modelPath: cdnAsset.vrmPath })
      : undefined,
    // Hand rigging
    hasHandRigging: cdnAsset.hasHandRigging,
  };
}
