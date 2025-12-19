"use client";

import { useState, useEffect, useCallback } from "react";

const HIDDEN_ASSETS_KEY = "hyperforge-hidden-assets";

/**
 * Hook for managing hidden assets with localStorage persistence
 * Used to hide CDN assets from the UI without deleting them
 */
export function useHiddenAssets() {
  const [hiddenAssets, setHiddenAssets] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load hidden assets from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HIDDEN_ASSETS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setHiddenAssets(new Set(parsed));
        }
      }
    } catch {
      // Ignore localStorage errors
    }
    setIsLoaded(true);
  }, []);

  // Save hidden assets to localStorage whenever they change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(
        HIDDEN_ASSETS_KEY,
        JSON.stringify([...hiddenAssets]),
      );
    } catch {
      // Ignore localStorage errors
    }
  }, [hiddenAssets, isLoaded]);

  const isHidden = useCallback(
    (assetId: string) => hiddenAssets.has(assetId),
    [hiddenAssets],
  );

  const hideAsset = useCallback((assetId: string) => {
    setHiddenAssets((prev) => new Set([...prev, assetId]));
  }, []);

  const unhideAsset = useCallback((assetId: string) => {
    setHiddenAssets((prev) => {
      const next = new Set(prev);
      next.delete(assetId);
      return next;
    });
  }, []);

  const toggleHidden = useCallback((assetId: string) => {
    setHiddenAssets((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  }, []);

  const clearAllHidden = useCallback(() => {
    setHiddenAssets(new Set());
  }, []);

  const hideMultiple = useCallback((assetIds: string[]) => {
    setHiddenAssets((prev) => new Set([...prev, ...assetIds]));
  }, []);

  return {
    hiddenAssets,
    hiddenAssetIds: [...hiddenAssets],
    isHidden,
    hideAsset,
    unhideAsset,
    toggleHidden,
    clearAllHidden,
    hideMultiple,
    hiddenCount: hiddenAssets.size,
    isLoaded,
  };
}
