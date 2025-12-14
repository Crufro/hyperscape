/**
 * CDN Asset Cache
 * In-memory cache for CDN assets to avoid repeated fetches
 */

import type { CDNAsset } from "./types";
import { loadCDNAssets } from "./loader";

let cachedAssets: CDNAsset[] | null = null;
let cacheTimestamp: number | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get CDN assets with caching
 */
export async function getCDNAssets(forceRefresh = false): Promise<CDNAsset[]> {
  const now = Date.now();

  if (
    !forceRefresh &&
    cachedAssets &&
    cacheTimestamp &&
    now - cacheTimestamp < CACHE_TTL
  ) {
    return cachedAssets;
  }

  cachedAssets = await loadCDNAssets();
  cacheTimestamp = now;
  return cachedAssets;
}

/**
 * Clear cache
 */
export function clearCDNCache(): void {
  cachedAssets = null;
  cacheTimestamp = null;
}

/**
 * Get single asset by ID
 */
export async function getCDNAssetById(id: string): Promise<CDNAsset | null> {
  const assets = await getCDNAssets();
  return assets.find((asset) => asset.id === id) || null;
}
