"use client";

import { useState, useEffect, useCallback } from "react";
import type { CDNAsset } from "@/lib-core/cdn/types";

// Extended asset type that includes local assets
export interface LibraryAsset extends CDNAsset {
  source: "CDN" | "LOCAL";
  createdAt?: string;
  status?: string;
  // VRM support
  hasVRM?: boolean;
  vrmPath?: string;
}

export function useCDNAssets() {
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch both CDN and local assets in parallel
      const [cdnResponse, localResponse] = await Promise.all([
        fetch("/api/assets/cdn").catch(() => null),
        fetch("/api/assets/local").catch(() => null),
      ]);

      const cdnAssets: LibraryAsset[] = [];
      const localAssets: LibraryAsset[] = [];

      // Parse CDN assets
      if (cdnResponse?.ok) {
        const data = await cdnResponse.json();
        if (Array.isArray(data)) {
          cdnAssets.push(
            ...data.map((a: CDNAsset) => ({ ...a, source: "CDN" as const })),
          );
        }
      }

      // Parse local assets
      if (localResponse?.ok) {
        const data = await localResponse.json();
        if (Array.isArray(data)) {
          localAssets.push(...data);
        }
      }

      // Combine: local assets first (newest), then CDN assets
      const allAssets = [...localAssets, ...cdnAssets];
      setAssets(allAssets);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  // Expose refresh function for after generation
  const refresh = useCallback(() => {
    loadAssets();
  }, [loadAssets]);

  return { assets, loading, error, refresh };
}
