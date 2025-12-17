/**
 * CDN URL Resolver
 * Client-safe utilities for resolving CDN asset URLs
 * (No fs/server-only imports)
 */

import type { HyperForgeAsset } from "./types";

const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || "http://localhost:8080";

/**
 * Get asset model URL (resolves asset:// protocol)
 * Safe to use on client
 */
export function getAssetModelUrl(asset: HyperForgeAsset): string {
  if (asset.source === "CDN") {
    // CDN assets use asset:// protocol, resolve to CDN URL
    if (asset.modelPath.startsWith("asset://")) {
      return asset.modelPath.replace("asset://", `${CDN_URL}/`);
    }
    return `${CDN_URL}/${asset.modelPath}`;
  }

  if (asset.source === "LOCAL") {
    // Local assets served from Next.js API with .glb extension
    return `/api/assets/${asset.id}/model.glb`;
  }

  // Base assets
  if (asset.modelPath.startsWith("asset://")) {
    return asset.modelPath.replace("asset://", `${CDN_URL}/`);
  }
  return asset.modelPath;
}

/**
 * Get asset thumbnail URL
 * Safe to use on client
 */
export function getAssetThumbnailUrl(
  asset: HyperForgeAsset,
): string | undefined {
  if (!asset.thumbnailPath) return undefined;

  if (asset.thumbnailPath.startsWith("asset://")) {
    return asset.thumbnailPath.replace("asset://", `${CDN_URL}/`);
  }

  if (asset.thumbnailPath.startsWith("http")) {
    return asset.thumbnailPath;
  }

  return `${CDN_URL}/${asset.thumbnailPath}`;
}

/**
 * Get CDN base URL
 */
export function getCDNBaseUrl(): string {
  return CDN_URL;
}
