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
 *
 * Handles:
 * - CDN assets (asset:// protocol or relative paths)
 * - LOCAL assets (served from Next.js API)
 * - FORGE assets (Supabase URLs)
 * - Direct URLs (http/https)
 */
export function getAssetModelUrl(asset: HyperForgeAsset): string {
  const modelPath = asset.modelPath ?? "";
  
  // Already a full URL (Supabase, CDN, etc.) - return as-is
  if (modelPath.startsWith("http://") || modelPath.startsWith("https://")) {
    return modelPath;
  }

  if (asset.source === "CDN") {
    // CDN assets use asset:// protocol, resolve to CDN URL
    if (modelPath.startsWith("asset://")) {
      return modelPath.replace("asset://", `${CDN_URL}/`);
    }
    return `${CDN_URL}/${modelPath}`;
  }

  if (asset.source === "LOCAL") {
    // Local assets served from Next.js API
    // Preserve the file extension (.glb or .vrm)
    const isVRM = modelPath.toLowerCase().endsWith(".vrm");
    return `/api/assets/${asset.id}/model.${isVRM ? "vrm" : "glb"}`;
  }

  // BASE source - use CDN
  if (modelPath.startsWith("asset://")) {
    return modelPath.replace("asset://", `${CDN_URL}/`);
  }
  return `${CDN_URL}/${modelPath}`;
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
