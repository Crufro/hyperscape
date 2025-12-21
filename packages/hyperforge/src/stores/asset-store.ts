/**
 * Asset Store
 * Zustand store for centralized asset state management
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import type { AssetCategory, AssetSource } from "@/types/core";
import type { HyperForgeAsset, CDNAsset } from "@/types/asset";
import { CDNAssetSchema } from "@/lib/api/schemas/common";
import { logger } from "@/lib/utils";

const log = logger.child("AssetStore");

// =============================================================================
// TYPES
// =============================================================================

export interface AssetFilters {
  category?: AssetCategory;
  source?: AssetSource;
  searchQuery?: string;
  rarity?: string;
  hasModel?: boolean;
  hasVRM?: boolean;
  sortBy?: "name" | "createdAt" | "updatedAt" | "category";
  sortOrder?: "asc" | "desc";
}

export interface AssetLoadingState {
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastFetchedAt: string | null;
}

interface AssetState {
  // Assets stored as a Map for O(1) lookups
  assets: Map<string, HyperForgeAsset>;
  
  // Selection
  selectedAssetId: string | null;
  
  // Multi-selection for batch operations
  selectedAssetIds: Set<string>;
  
  // Filters
  filters: AssetFilters;
  
  // Loading state
  loading: AssetLoadingState;
  
  // Actions - Assets
  setAssets: (assets: HyperForgeAsset[]) => void;
  addAsset: (asset: HyperForgeAsset) => void;
  updateAsset: (id: string, updates: Partial<HyperForgeAsset>) => void;
  removeAsset: (id: string) => void;
  removeAssets: (ids: string[]) => void;
  clearAssets: () => void;
  
  // Actions - Selection
  selectAsset: (id: string | null) => void;
  toggleAssetSelection: (id: string) => void;
  selectAllAssets: () => void;
  clearSelection: () => void;
  
  // Actions - Filters
  setFilters: (filters: AssetFilters) => void;
  resetFilters: () => void;
  
  // Actions - Loading
  setLoading: (loading: Partial<AssetLoadingState>) => void;
  
  // Getters
  getAsset: (id: string) => HyperForgeAsset | undefined;
  getSelectedAsset: () => HyperForgeAsset | undefined;
  getFilteredAssets: () => HyperForgeAsset[];
  getAssetsByCategory: (category: AssetCategory) => HyperForgeAsset[];
  getAssetCount: () => number;
  
  // API Integration
  loadAssets: () => Promise<void>;
  refreshAssets: () => Promise<void>;
  
  // Reset
  reset: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialFilters: AssetFilters = {
  sortBy: "name",
  sortOrder: "asc",
};

const initialLoading: AssetLoadingState = {
  isLoading: false,
  isRefreshing: false,
  error: null,
  lastFetchedAt: null,
};

const initialState = {
  assets: new Map<string, HyperForgeAsset>(),
  selectedAssetId: null,
  selectedAssetIds: new Set<string>(),
  filters: initialFilters,
  loading: initialLoading,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function filterAssets(
  assets: Map<string, HyperForgeAsset>,
  filters: AssetFilters
): HyperForgeAsset[] {
  let result = Array.from(assets.values());
  
  // Category filter
  if (filters.category) {
    result = result.filter((a) => a.category === filters.category);
  }
  
  // Source filter
  if (filters.source) {
    result = result.filter((a) => a.source === filters.source);
  }
  
  // Search query
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    result = result.filter((a) => {
      const name = a.name?.toLowerCase() ?? "";
      const description = a.description?.toLowerCase() ?? "";
      return name.includes(query) || description.includes(query);
    });
  }
  
  // Rarity filter
  if (filters.rarity) {
    result = result.filter((a) => a.rarity === filters.rarity);
  }
  
  // Has model filter
  if (filters.hasModel !== undefined) {
    result = result.filter((a) => {
      const hasModel = !!(a.modelUrl || a.modelPath);
      return hasModel === filters.hasModel;
    });
  }
  
  // Has VRM filter
  if (filters.hasVRM !== undefined) {
    result = result.filter((a) => !!a.hasVRM === filters.hasVRM);
  }
  
  // Sorting
  if (filters.sortBy) {
    const sortOrder = filters.sortOrder === "desc" ? -1 : 1;
    result.sort((a, b) => {
      let aVal: string | number | Date = "";
      let bVal: string | number | Date = "";
      
      switch (filters.sortBy) {
        case "name":
          aVal = a.name?.toLowerCase() ?? "";
          bVal = b.name?.toLowerCase() ?? "";
          break;
        case "category":
          aVal = a.category ?? "";
          bVal = b.category ?? "";
          break;
        case "createdAt":
          aVal = (a as { createdAt?: string | Date }).createdAt ?? "";
          bVal = (b as { createdAt?: string | Date }).createdAt ?? "";
          break;
        case "updatedAt":
          aVal = (a as { updatedAt?: string | Date }).updatedAt ?? "";
          bVal = (b as { updatedAt?: string | Date }).updatedAt ?? "";
          break;
      }
      
      if (aVal < bVal) return -1 * sortOrder;
      if (aVal > bVal) return 1 * sortOrder;
      return 0;
    });
  }
  
  return result;
}

// =============================================================================
// STORE
// =============================================================================

export const useAssetStore = create<AssetState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      // Asset actions
      setAssets: (assets) => {
        const assetMap = new Map<string, HyperForgeAsset>();
        assets.forEach((asset) => assetMap.set(asset.id, asset));
        set({ assets: assetMap });
        log.debug("Assets loaded", { count: assets.length });
      },

      addAsset: (asset) => {
        set((state) => {
          const newAssets = new Map(state.assets);
          newAssets.set(asset.id, asset);
          return { assets: newAssets };
        });
        log.debug("Asset added", { id: asset.id, name: asset.name });
      },

      updateAsset: (id, updates) => {
        set((state) => {
          const existing = state.assets.get(id);
          if (!existing) return state;
          
          const newAssets = new Map(state.assets);
          newAssets.set(id, { ...existing, ...updates } as HyperForgeAsset);
          return { assets: newAssets };
        });
        log.debug("Asset updated", { id });
      },

      removeAsset: (id) => {
        set((state) => {
          const newAssets = new Map(state.assets);
          newAssets.delete(id);
          
          const newSelectedIds = new Set(state.selectedAssetIds);
          newSelectedIds.delete(id);
          
          return {
            assets: newAssets,
            selectedAssetId: state.selectedAssetId === id ? null : state.selectedAssetId,
            selectedAssetIds: newSelectedIds,
          };
        });
        log.debug("Asset removed", { id });
      },

      removeAssets: (ids) => {
        set((state) => {
          const newAssets = new Map(state.assets);
          const newSelectedIds = new Set(state.selectedAssetIds);
          
          ids.forEach((id) => {
            newAssets.delete(id);
            newSelectedIds.delete(id);
          });
          
          return {
            assets: newAssets,
            selectedAssetId: ids.includes(state.selectedAssetId ?? "") ? null : state.selectedAssetId,
            selectedAssetIds: newSelectedIds,
          };
        });
        log.debug("Assets removed", { count: ids.length });
      },

      clearAssets: () => set({ assets: new Map(), selectedAssetId: null, selectedAssetIds: new Set() }),

      // Selection actions
      selectAsset: (id) => set({ selectedAssetId: id }),

      toggleAssetSelection: (id) => {
        set((state) => {
          const newSelected = new Set(state.selectedAssetIds);
          if (newSelected.has(id)) {
            newSelected.delete(id);
          } else {
            newSelected.add(id);
          }
          return { selectedAssetIds: newSelected };
        });
      },

      selectAllAssets: () => {
        set((state) => ({
          selectedAssetIds: new Set(state.assets.keys()),
        }));
      },

      clearSelection: () => set({ selectedAssetId: null, selectedAssetIds: new Set() }),

      // Filter actions
      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters },
      })),

      resetFilters: () => set({ filters: initialFilters }),

      // Loading actions
      setLoading: (loading) => set((state) => ({
        loading: { ...state.loading, ...loading },
      })),

      // Getters
      getAsset: (id) => get().assets.get(id),

      getSelectedAsset: () => {
        const { assets, selectedAssetId } = get();
        return selectedAssetId ? assets.get(selectedAssetId) : undefined;
      },

      getFilteredAssets: () => {
        const { assets, filters } = get();
        return filterAssets(assets, filters);
      },

      getAssetsByCategory: (category) => {
        return Array.from(get().assets.values()).filter((a) => a.category === category);
      },

      getAssetCount: () => get().assets.size,

      // API Integration
      loadAssets: async () => {
        const { setLoading, setAssets } = get();
        
        setLoading({ isLoading: true, error: null });
        
        try {
          // Load from multiple sources
          const [localResponse, cdnResponse] = await Promise.allSettled([
            fetch("/api/assets"),
            fetch("/api/game/data"),
          ]);
          
          const assets: HyperForgeAsset[] = [];
          
          // Process local assets
          if (localResponse.status === "fulfilled" && localResponse.value.ok) {
            const localData = await localResponse.value.json();
            if (Array.isArray(localData.assets)) {
              assets.push(...localData.assets);
            }
          }
          
          // Process CDN/game data assets with validation
          if (cdnResponse.status === "fulfilled" && cdnResponse.value.ok) {
            const cdnData = await cdnResponse.value.json();
            if (cdnData.items && Array.isArray(cdnData.items)) {
              // Validate each item with Zod schema
              const validatedItems = (cdnData.items as unknown[])
                .map((item) => {
                  const result = CDNAssetSchema.safeParse(item);
                  if (result.success) {
                    return result.data as CDNAsset;
                  }
                  log.debug("Invalid CDN asset skipped", { 
                    item,
                    errors: result.error.flatten() 
                  });
                  return null;
                })
                .filter((item): item is CDNAsset => item !== null);
              
              assets.push(...validatedItems);
            }
          }
          
          setAssets(assets);
          setLoading({
            isLoading: false,
            lastFetchedAt: new Date().toISOString(),
          });
          
          log.info("Assets loaded from API", { count: assets.length });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to load assets";
          setLoading({ isLoading: false, error: message });
          log.error("Failed to load assets", { error });
        }
      },

      refreshAssets: async () => {
        const { setLoading } = get();
        setLoading({ isRefreshing: true });
        await get().loadAssets();
        setLoading({ isRefreshing: false });
      },

      // Reset
      reset: () => set(initialState),
    })),
    { name: "AssetStore" }
  )
);

// =============================================================================
// SELECTOR HOOKS
// =============================================================================

/**
 * Get the currently selected asset
 */
export function useSelectedAsset(): HyperForgeAsset | undefined {
  return useAssetStore((state) => 
    state.selectedAssetId ? state.assets.get(state.selectedAssetId) : undefined
  );
}

/**
 * Get filtered assets as an array
 */
export function useFilteredAssets(): HyperForgeAsset[] {
  const assets = useAssetStore((state) => state.assets);
  const filters = useAssetStore((state) => state.filters);
  return filterAssets(assets, filters);
}

/**
 * Get assets by category
 */
export function useAssetsByCategory(category: AssetCategory): HyperForgeAsset[] {
  return useAssetStore((state) => 
    Array.from(state.assets.values()).filter((a) => a.category === category)
  );
}

/**
 * Check if an asset is selected (for multi-select)
 */
export function useIsAssetSelected(id: string): boolean {
  return useAssetStore((state) => state.selectedAssetIds.has(id));
}
