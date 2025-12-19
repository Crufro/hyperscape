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
  // Already a full URL (Supabase, CDN, etc.) - return as-is
  if (
    asset.modelPath.startsWith("http://") ||
    asset.modelPath.startsWith("https://")
  ) {
    return asset.modelPath;
  }

  if (asset.source === "CDN") {
    // CDN assets use asset:// protocol, resolve to CDN URL
    if (asset.modelPath.startsWith("asset://")) {
      return asset.modelPath.replace("asset://", `${CDN_URL}/`);
    }
    return `${CDN_URL}/${asset.modelPath}`;
  }

  if (asset.source === "LOCAL" || asset.source === "FORGE") {
    // Local/Forge assets served from Next.js API
    // Preserve the file extension (.glb or .vrm)
    const isVRM = asset.modelPath.toLowerCase().endsWith(".vrm");
    return `/api/assets/${asset.id}/model.${isVRM ? "vrm" : "glb"}`;
  }

  // Asset:// protocol without explicit source - resolve to CDN
  if (asset.modelPath.startsWith("asset://")) {
    return asset.modelPath.replace("asset://", `${CDN_URL}/`);
  }

  // API paths - return as-is
  if (asset.modelPath.startsWith("/api/")) {
    return asset.modelPath;
  }

  // Relative path - assume it's a local API asset if no source specified
  // This prevents accidentally using CDN URL for non-CDN assets
  if (!asset.source && asset.id) {
    const isVRM = asset.modelPath.toLowerCase().endsWith(".vrm");
    return `/api/assets/${asset.id}/model.${isVRM ? "vrm" : "glb"}`;
  }

  // Fallback: prepend CDN URL for relative paths (legacy behavior)
  return `${CDN_URL}/${asset.modelPath}`;
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
