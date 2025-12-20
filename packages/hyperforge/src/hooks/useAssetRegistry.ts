/**
 * useAssetRegistry Hook
 *
 * React hook for accessing the unified asset registry.
 * Queries assets from all sources:
 * - CDN: Official game assets from hyperscapeAI/assets repo
 * - FORGE: HyperForge-generated assets stored in Supabase
 * - LOCAL: Development fallback (filesystem)
 *
 * Both CDN and FORGE assets are production-ready and CDN-servable.
 * The source indicates ORIGIN, not delivery method.
 *
 * Usage:
 *   const { assets, isLoading } = useAssetRegistry();
 *   const { assets: models } = useAssetRegistry({ type: 'model' });
 *   const { assets: avatars } = useAssetRegistry({ type: 'vrm', source: 'CDN' });
 *   const { assets: generated } = useAssetRegistry({ source: 'FORGE' });
 */

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/utils";

const log = logger.child("useAssetRegistry");

// ============================================================================
// Types
// ============================================================================

/**
 * Asset source/origin:
 * - CDN: Official game assets from hyperscapeAI/assets repo
 * - FORGE: HyperForge-generated assets (stored in Supabase, also CDN-accessible)
 * - LOCAL: Local filesystem (development only)
 */
export type AssetSource = "CDN" | "FORGE" | "LOCAL";

export type AssetType =
  | "model"
  | "vrm"
  | "image"
  | "audio"
  | "content"
  | "unknown";

export type AssetCategory =
  | "weapon" | "armor" | "tool" | "item" | "prop" | "building" | "character" | "npc" | "mob"
  | "concept-art" | "sprite" | "texture" | "icon" | "reference"
  | "voice" | "sfx" | "music" | "ambient"
  | "quest" | "dialogue" | "area" | "config"
  | "misc" | "unknown";

export interface RegistryAsset {
  id: string;
  name: string;
  type: AssetType;
  category: AssetCategory;
  source: AssetSource;
  url: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  vrmUrl?: string;
  path?: string;
  format?: string;
  size?: number;
  hasVRM?: boolean;
  hasModel?: boolean;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface AssetQuery {
  type?: AssetType | AssetType[];
  category?: AssetCategory | AssetCategory[];
  source?: AssetSource | AssetSource[];
  search?: string;
  hasVRM?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Cache (module-level for persistence)
// ============================================================================

interface RegistryCache {
  assets: RegistryAsset[] | null;
  loadedAt: number | null;
}

const cache: RegistryCache = {
  assets: null,
  loadedAt: null,
};

// Cache TTL: 2 minutes
const CACHE_TTL = 2 * 60 * 1000;

function isCacheValid(): boolean {
  if (!cache.loadedAt) return false;
  return Date.now() - cache.loadedAt < CACHE_TTL;
}

// ============================================================================
// Hook
// ============================================================================

interface UseAssetRegistryOptions extends AssetQuery {
  /** Skip cache and force refresh */
  forceRefresh?: boolean;
  /** Don't auto-fetch on mount */
  skip?: boolean;
}

interface UseAssetRegistryResult {
  assets: RegistryAsset[];
  isLoading: boolean;
  error: Error | null;
  total: number;
  refresh: () => Promise<void>;
}

export function useAssetRegistry(
  options: UseAssetRegistryOptions = {},
): UseAssetRegistryResult {
  const {
    type,
    category,
    source,
    search,
    hasVRM,
    limit,
    offset,
    forceRefresh = false,
    skip = false,
  } = options;

  const [assets, setAssets] = useState<RegistryAsset[]>([]);
  const [isLoading, setIsLoading] = useState(!skip);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);

  const fetchAssets = useCallback(async (force = false) => {
    if (skip) return;

    setIsLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams();

      if (type) {
        params.set("type", Array.isArray(type) ? type.join(",") : type);
      }
      if (category) {
        params.set("category", Array.isArray(category) ? category.join(",") : category);
      }
      if (source) {
        params.set("source", Array.isArray(source) ? source.join(",") : source);
      }
      if (search) {
        params.set("search", search);
      }
      if (hasVRM !== undefined) {
        params.set("hasVRM", String(hasVRM));
      }
      if (limit !== undefined) {
        params.set("limit", String(limit));
      }
      if (offset !== undefined) {
        params.set("offset", String(offset));
      }
      if (force) {
        params.set("reload", "true");
      }

      // If no filters and cache is valid, use cached data
      const hasFilters = type || category || source || search || hasVRM !== undefined;
      if (!force && !hasFilters && isCacheValid() && cache.assets) {
        let filtered = cache.assets;
        if (limit !== undefined || offset !== undefined) {
          filtered = cache.assets.slice(offset || 0, (offset || 0) + (limit || cache.assets.length));
        }
        setAssets(filtered);
        setTotal(cache.assets.length);
        setIsLoading(false);
        return;
      }

      // Fetch from API
      const url = `/api/assets/registry${params.toString() ? `?${params.toString()}` : "?all=true"}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Failed to fetch assets: ${res.status}`);
      }

      const data = await res.json();
      const fetchedAssets = data.assets || [];

      // Update cache if fetching all
      if (!hasFilters && !limit && !offset) {
        cache.assets = fetchedAssets;
        cache.loadedAt = Date.now();
      }

      setAssets(fetchedAssets);
      setTotal(data.total || fetchedAssets.length);

      log.debug("Fetched assets", {
        count: fetchedAssets.length,
        total: data.total,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      log.error("Failed to fetch assets", { error: error.message });
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [type, category, source, search, hasVRM, limit, offset, skip]);

  useEffect(() => {
    fetchAssets(forceRefresh);
  }, [fetchAssets, forceRefresh]);

  const refresh = useCallback(async () => {
    await fetchAssets(true);
  }, [fetchAssets]);

  return {
    assets,
    isLoading,
    error,
    total,
    refresh,
  };
}

// ============================================================================
// Convenience Hooks
// ============================================================================

export function useModels(options?: Omit<UseAssetRegistryOptions, "type">) {
  return useAssetRegistry({ ...options, type: "model" });
}

export function useAvatars(options?: Omit<UseAssetRegistryOptions, "type">) {
  return useAssetRegistry({ ...options, type: "vrm" });
}

export function useAudioAssets(options?: Omit<UseAssetRegistryOptions, "type">) {
  return useAssetRegistry({ ...options, type: "audio" });
}

export function useImages(options?: Omit<UseAssetRegistryOptions, "type">) {
  return useAssetRegistry({ ...options, type: "image" });
}

/**
 * Get HyperForge-generated assets (stored in Supabase)
 * These are developer-created assets, also CDN-accessible
 */
export function useForgeAssets(options?: Omit<UseAssetRegistryOptions, "source">) {
  return useAssetRegistry({ ...options, source: "FORGE" });
}

/**
 * Get official game assets from hyperscapeAI/assets repo
 * These are curated, canonical game content
 */
export function useGameAssets(options?: Omit<UseAssetRegistryOptions, "source">) {
  return useAssetRegistry({ ...options, source: "CDN" });
}

/**
 * Get local filesystem assets (development only)
 */
export function useLocalAssets(options?: Omit<UseAssetRegistryOptions, "source">) {
  return useAssetRegistry({ ...options, source: "LOCAL" });
}

// Legacy aliases for backwards compatibility
/** @deprecated Use useForgeAssets instead */
export const useSupabaseAssets = useForgeAssets;
/** @deprecated Use useGameAssets instead */
export const useCDNAssets = useGameAssets;

// ============================================================================
// Lookup Hook
// ============================================================================

export function useAssetLookup() {
  const { assets, isLoading } = useAssetRegistry();

  const lookup = useCallback(
    (id: string) => assets.find((a) => a.id === id),
    [assets],
  );

  const lookupByUrl = useCallback(
    (url: string) => assets.find((a) => a.url === url),
    [assets],
  );

  return { lookup, lookupByUrl, isLoading };
}
