/**
 * Thumbnail Overrides Hook
 * Manages local thumbnail overrides for CDN assets that have generated sprites
 * Persists overrides in localStorage
 */

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "hyperforge-thumbnail-overrides";

type ThumbnailOverrides = Record<string, string>;

/**
 * Hook for managing thumbnail overrides
 * When sprites are generated for a CDN asset, the local thumbnail overrides the CDN one
 */
export function useThumbnailOverrides() {
  const [overrides, setOverrides] = useState<ThumbnailOverrides>({});
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setOverrides(JSON.parse(stored));
      }
    } catch {
      // Ignore parse errors
    }
    setLoaded(true);
  }, []);

  // Save to localStorage when overrides change
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
      } catch {
        // Ignore storage errors
      }
    }
  }, [overrides, loaded]);

  /**
   * Set a thumbnail override for an asset
   */
  const setThumbnailOverride = useCallback(
    (assetId: string, thumbnailUrl: string) => {
      setOverrides((prev) => ({
        ...prev,
        [assetId]: thumbnailUrl,
      }));
    },
    [],
  );

  /**
   * Get thumbnail URL for an asset (returns override if exists, otherwise original)
   */
  const getThumbnailUrl = useCallback(
    (assetId: string, originalUrl?: string): string | undefined => {
      return overrides[assetId] || originalUrl;
    },
    [overrides],
  );

  /**
   * Check if an asset has a thumbnail override
   */
  const hasOverride = useCallback(
    (assetId: string): boolean => {
      return assetId in overrides;
    },
    [overrides],
  );

  /**
   * Remove a thumbnail override
   */
  const removeOverride = useCallback((assetId: string) => {
    setOverrides((prev) => {
      const { [assetId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  /**
   * Clear all overrides
   */
  const clearOverrides = useCallback(() => {
    setOverrides({});
  }, []);

  return {
    overrides,
    loaded,
    setThumbnailOverride,
    getThumbnailUrl,
    hasOverride,
    removeOverride,
    clearOverrides,
  };
}
