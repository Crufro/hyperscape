"use client";

import { useState, useEffect, useCallback } from "react";

const FAVORITES_KEY = "hyperforge-favorites";

/**
 * Hook for managing favorite assets with localStorage persistence
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setFavorites(new Set(parsed));
        }
      }
    } catch {
      // Ignore localStorage errors
    }
    setIsLoaded(true);
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
    } catch {
      // Ignore localStorage errors
    }
  }, [favorites, isLoaded]);

  const isFavorite = useCallback(
    (assetId: string) => favorites.has(assetId),
    [favorites],
  );

  const toggleFavorite = useCallback((assetId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  }, []);

  const addFavorite = useCallback((assetId: string) => {
    setFavorites((prev) => new Set([...prev, assetId]));
  }, []);

  const removeFavorite = useCallback((assetId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.delete(assetId);
      return next;
    });
  }, []);

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    favoritesCount: favorites.size,
    isLoaded,
  };
}
