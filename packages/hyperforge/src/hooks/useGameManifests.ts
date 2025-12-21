/**
 * useGameManifests Hook
 *
 * React hook for accessing game manifest data in components.
 * Fetches and caches data from the manifests API.
 *
 * Usage:
 *   const { items, npcs, resources, stores, music, buildings, isLoading } = useGameManifests();
 *   const { items, isLoading } = useGameManifests({ types: ['items'] });
 */

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/utils";
import type { SkillRequirements } from "@/types/core";

const log = logger.child("useGameManifests");

// ============================================================================
// Types (re-exported from manifests for convenience)
// ============================================================================

export interface ItemBonuses {
  attack: number;
  strength: number;
  defense: number;
  ranged: number;
}

export interface ItemRequirements {
  level: number;
  skills: SkillRequirements;
}

export interface ItemDefinition {
  id: string;
  name: string;
  type: "weapon" | "armor" | "tool" | "resource" | "currency";
  value: number;
  weight: number;
  equipSlot?: string;
  weaponType?: string;
  attackType?: string;
  attackSpeed?: number;
  attackRange?: number;
  stackable?: boolean;
  maxStackSize?: number;
  description: string;
  examine: string;
  tradeable: boolean;
  rarity: "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "always";
  modelPath: string | null;
  equippedModelPath?: string;
  iconPath: string;
  thumbnailPath?: string;
  bonuses?: ItemBonuses;
  requirements?: ItemRequirements;
}

/**
 * NPC combat stats
 */
export interface NpcStats {
  level?: number;
  health?: number;
  attack?: number;
  strength?: number;
  defense?: number;
  ranged?: number;
  magic?: number;
}

/**
 * NPC combat settings
 */
export interface NpcCombat {
  attackable?: boolean;
  aggressive?: boolean;
  retaliates?: boolean;
  aggroRange?: number;
  combatRange?: number;
  attackSpeedTicks?: number;
  respawnTicks?: number;
}

/**
 * NPC movement settings
 */
export interface NpcMovement {
  type?: "wander" | "stationary" | "patrol";
  speed?: number;
  wanderRadius?: number;
}

/**
 * NPC services (shopkeeper, banker, etc.)
 */
export interface NpcServices {
  enabled?: boolean;
  types?: string[];
  storeId?: string;
}

/**
 * NPC dialogue options
 */
export interface NpcDialogue {
  greeting?: string;
  options?: Array<{ text: string; response: string }>;
}

/**
 * NPC drop table
 */
export interface NpcDropTable {
  always?: Array<{ itemId: string; quantity: number }>;
  common?: Array<{ itemId: string; quantity: number; chance: number }>;
  uncommon?: Array<{ itemId: string; quantity: number; chance: number }>;
  rare?: Array<{ itemId: string; quantity: number; chance: number }>;
  veryRare?: Array<{ itemId: string; quantity: number; chance: number }>;
}

export interface NpcDefinition {
  id: string;
  name: string;
  description: string;
  category: "mob" | "neutral";
  faction: string;
  stats?: NpcStats;
  combat?: NpcCombat;
  movement?: NpcMovement;
  services?: NpcServices;
  dialogue?: NpcDialogue;
  drops?: NpcDropTable;
  appearance?: {
    modelPath: string;
    iconPath: string;
    scale: number;
  };
  spawnBiomes?: string[];
  // Optional flattened fields for backwards compatibility
  modelPath?: string;
  iconPath?: string;
  thumbnailPath?: string;
  level?: number;
  combatLevel?: number;
}

export interface ResourceDefinition {
  id: string;
  name: string;
  type: string;
  examine: string;
  modelPath: string | null;
  depletedModelPath?: string | null;
  scale: number;
  harvestSkill: string;
  toolRequired: string;
  levelRequired: number;
  baseCycleTicks: number;
  depleteChance: number;
  respawnTicks: number;
  harvestYield: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    chance: number;
    xpAmount: number;
    stackable: boolean;
  }>;
}

export interface StoreItem {
  id: string;
  itemId: string;
  name: string;
  price: number;
  stockQuantity: number;
  restockTime: number;
  description: string;
  category: string;
}

export interface StoreDefinition {
  id: string;
  name: string;
  buyback: boolean;
  buybackRate: number;
  description: string;
  items: StoreItem[];
}

export interface MusicTrack {
  id: string;
  name: string;
  type: "theme" | "ambient" | "combat";
  category: string;
  path: string;
  description: string;
  duration: number;
  mood: string;
}

export interface BuildingDefinition {
  id: string;
  name: string;
  type: string;
  modelPath: string;
  scale?: number;
  interactable?: boolean;
}

// ============================================================================
// Cache (module-level for persistence across component remounts)
// ============================================================================

interface ManifestCache {
  items: ItemDefinition[] | null;
  npcs: NpcDefinition[] | null;
  resources: ResourceDefinition[] | null;
  stores: StoreDefinition[] | null;
  music: MusicTrack[] | null;
  buildings: BuildingDefinition[] | null;
  loadedAt: number | null;
}

const cache: ManifestCache = {
  items: null,
  npcs: null,
  resources: null,
  stores: null,
  music: null,
  buildings: null,
  loadedAt: null,
};

// Cache TTL: 5 minutes (manifests don't change often)
const CACHE_TTL = 5 * 60 * 1000;

function isCacheValid(): boolean {
  if (!cache.loadedAt) return false;
  return Date.now() - cache.loadedAt < CACHE_TTL;
}

// ============================================================================
// Hook Types
// ============================================================================

type ManifestType = "items" | "npcs" | "resources" | "stores" | "music" | "buildings";

interface UseGameManifestsOptions {
  /** Which manifest types to load. Defaults to all. */
  types?: ManifestType[];
  /** Skip cache and force refresh */
  forceRefresh?: boolean;
}

interface UseGameManifestsResult {
  items: ItemDefinition[];
  npcs: NpcDefinition[];
  resources: ResourceDefinition[];
  stores: StoreDefinition[];
  music: MusicTrack[];
  buildings: BuildingDefinition[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useGameManifests(
  options: UseGameManifestsOptions = {},
): UseGameManifestsResult {
  const { types, forceRefresh = false } = options;
  const [isLoading, setIsLoading] = useState(!isCacheValid() || forceRefresh);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<Omit<UseGameManifestsResult, "isLoading" | "error" | "refresh">>({
    items: cache.items || [],
    npcs: cache.npcs || [],
    resources: cache.resources || [],
    stores: cache.stores || [],
    music: cache.music || [],
    buildings: cache.buildings || [],
  });

  const fetchManifests = useCallback(async (force = false) => {
    // Use cache if valid and not forcing refresh
    if (!force && isCacheValid() && cache.items !== null) {
      setData({
        items: cache.items || [],
        npcs: cache.npcs || [],
        resources: cache.resources || [],
        stores: cache.stores || [],
        music: cache.music || [],
        buildings: cache.buildings || [],
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Determine what to fetch
      const typesToFetch = types || ["items", "npcs", "resources", "stores", "music", "buildings"];
      const queryType = typesToFetch.length === 6 ? "all" : typesToFetch.join(",");

      // If requesting all or multiple, fetch all at once
      if (queryType === "all" || typesToFetch.length > 1) {
        const res = await fetch("/api/game/manifests?type=all");
        if (!res.ok) {
          throw new Error(`Failed to fetch manifests: ${res.status}`);
        }
        const json = await res.json();

        // Update cache
        cache.items = json.data.items || [];
        cache.npcs = json.data.npcs || [];
        cache.resources = json.data.resources || [];
        cache.stores = json.data.stores || [];
        cache.music = json.data.music || [];
        cache.buildings = json.data.buildings || [];
        cache.loadedAt = Date.now();

        setData({
          items: cache.items ?? [],
          npcs: cache.npcs ?? [],
          resources: cache.resources ?? [],
          stores: cache.stores ?? [],
          music: cache.music ?? [],
          buildings: cache.buildings ?? [],
        });
      } else {
        // Fetch single type
        const type = typesToFetch[0];
        const res = await fetch(`/api/game/manifests?type=${type}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch ${type}: ${res.status}`);
        }
        const json = await res.json();

        // Update cache for this type based on manifest type
        switch (type) {
          case "items":
            cache.items = json.data || [];
            break;
          case "npcs":
            cache.npcs = json.data || [];
            break;
          case "resources":
            cache.resources = json.data || [];
            break;
          case "stores":
            cache.stores = json.data || [];
            break;
          case "music":
            cache.music = json.data || [];
            break;
          case "buildings":
            cache.buildings = json.data || [];
            break;
        }
        cache.loadedAt = Date.now();

        setData((prev) => ({
          ...prev,
          [type]: json.data || [],
        }));
      }

      log.debug("Manifests loaded", {
        items: cache.items?.length,
        npcs: cache.npcs?.length,
        resources: cache.resources?.length,
        stores: cache.stores?.length,
        music: cache.music?.length,
        buildings: cache.buildings?.length,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      log.error("Failed to load manifests", { error: error.message });
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [types]);

  useEffect(() => {
    fetchManifests(forceRefresh);
  }, [fetchManifests, forceRefresh]);

  const refresh = useCallback(async () => {
    await fetchManifests(true);
  }, [fetchManifests]);

  return {
    ...data,
    isLoading,
    error,
    refresh,
  };
}

// ============================================================================
// Convenience Hooks for Single Types
// ============================================================================

export function useItems() {
  const { items, isLoading, error, refresh } = useGameManifests({ types: ["items"] });
  return { items, isLoading, error, refresh };
}

export function useNpcs() {
  const { npcs, isLoading, error, refresh } = useGameManifests({ types: ["npcs"] });
  return { npcs, isLoading, error, refresh };
}

export function useResources() {
  const { resources, isLoading, error, refresh } = useGameManifests({ types: ["resources"] });
  return { resources, isLoading, error, refresh };
}

export function useStores() {
  const { stores, isLoading, error, refresh } = useGameManifests({ types: ["stores"] });
  return { stores, isLoading, error, refresh };
}

export function useMusic() {
  const { music, isLoading, error, refresh } = useGameManifests({ types: ["music"] });
  return { music, isLoading, error, refresh };
}

export function useBuildings() {
  const { buildings, isLoading, error, refresh } = useGameManifests({ types: ["buildings"] });
  return { buildings, isLoading, error, refresh };
}

// ============================================================================
// Lookup Helpers
// ============================================================================

export function useItemLookup() {
  const { items, isLoading } = useItems();
  const lookup = useCallback(
    (id: string) => items.find((i) => i.id === id),
    [items],
  );
  return { lookup, isLoading };
}

export function useNpcLookup() {
  const { npcs, isLoading } = useNpcs();
  const lookup = useCallback(
    (id: string) => npcs.find((n) => n.id === id),
    [npcs],
  );
  return { lookup, isLoading };
}

export function useResourceLookup() {
  const { resources, isLoading } = useResources();
  const lookup = useCallback(
    (id: string) => resources.find((r) => r.id === id),
    [resources],
  );
  return { lookup, isLoading };
}

export function useStoreLookup() {
  const { stores, isLoading } = useStores();
  const lookup = useCallback(
    (id: string) => stores.find((s) => s.id === id),
    [stores],
  );
  return { lookup, isLoading };
}
