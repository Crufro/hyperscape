/**
 * Preset Store
 * Zustand store for managing generation presets (saved form configurations)
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { AssetCategory } from "@/types/categories";
import type { GenerationConfig } from "@/components/generation/GenerationFormRouter";
import { logger } from "@/lib/utils";

const log = logger.child("PresetStore");

// =============================================================================
// TYPES
// =============================================================================

export interface GenerationPreset {
  id: string;
  name: string;
  description?: string;
  category: AssetCategory;
  config: Omit<GenerationConfig, "category">;
  createdAt: string;
  updatedAt: string;
  isBuiltIn?: boolean; // Built-in presets cannot be deleted
  tags?: string[];
}

export interface PresetFilters {
  category?: AssetCategory;
  searchQuery?: string;
  tags?: string[];
}

interface PresetState {
  // Presets
  presets: GenerationPreset[];
  
  // Currently selected preset
  selectedPresetId: string | null;
  
  // Filters
  filters: PresetFilters;
  
  // Actions
  addPreset: (preset: Omit<GenerationPreset, "id" | "createdAt" | "updatedAt">) => string;
  updatePreset: (id: string, updates: Partial<GenerationPreset>) => void;
  deletePreset: (id: string) => boolean;
  duplicatePreset: (id: string, newName: string) => string | null;
  
  // Selection
  selectPreset: (id: string | null) => void;
  getSelectedPreset: () => GenerationPreset | null;
  
  // Filtering
  setFilters: (filters: PresetFilters) => void;
  getFilteredPresets: () => GenerationPreset[];
  
  // Utilities
  getPresetsByCategory: (category: AssetCategory) => GenerationPreset[];
  getPresetById: (id: string) => GenerationPreset | undefined;
  exportPresets: () => string;
  importPresets: (json: string) => number;
  
  // Reset
  reset: () => void;
}

// =============================================================================
// BUILT-IN PRESETS
// =============================================================================

const BUILT_IN_PRESETS: GenerationPreset[] = [
  {
    id: "builtin-weapon-sword-basic",
    name: "Basic Sword",
    description: "A simple one-handed sword suitable for beginners",
    category: "weapon",
    config: {
      prompt: "medieval fantasy sword, single-handed, simple guard, straight blade",
      pipeline: "text-to-3d",
      quality: "medium",
      metadata: {
        weaponType: "sword",
        attackType: "melee",
        tier: "basic",
      },
      options: {
        topology: "quad",
        targetPolycount: 5000,
      },
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    isBuiltIn: true,
    tags: ["melee", "starter", "sword"],
  },
  {
    id: "builtin-weapon-axe-basic",
    name: "Basic Axe",
    description: "A rugged woodcutting axe that doubles as a weapon",
    category: "weapon",
    config: {
      prompt: "medieval fantasy axe, wooden handle, iron head, simple design",
      pipeline: "text-to-3d",
      quality: "medium",
      metadata: {
        weaponType: "axe",
        attackType: "melee",
        tier: "basic",
      },
      options: {
        topology: "quad",
        targetPolycount: 4000,
      },
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    isBuiltIn: true,
    tags: ["melee", "starter", "axe"],
  },
  {
    id: "builtin-npc-goblin",
    name: "Goblin Enemy",
    description: "A small green goblin creature for low-level combat",
    category: "npc",
    config: {
      prompt: "small green goblin, fantasy creature, pointy ears, menacing pose, tattered clothes",
      pipeline: "text-to-3d",
      quality: "medium",
      convertToVRM: true,
      metadata: {
        npcType: "enemy",
        combatLevel: 5,
        faction: "hostile",
      },
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    isBuiltIn: true,
    tags: ["enemy", "low-level", "goblin"],
  },
  {
    id: "builtin-npc-merchant",
    name: "Town Merchant",
    description: "A friendly NPC shopkeeper for towns",
    category: "npc",
    config: {
      prompt: "medieval merchant, friendly expression, merchant clothes, apron, holding scales",
      pipeline: "text-to-3d",
      quality: "high",
      convertToVRM: true,
      metadata: {
        npcType: "merchant",
        faction: "neutral",
      },
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    isBuiltIn: true,
    tags: ["friendly", "merchant", "town"],
  },
  {
    id: "builtin-resource-tree",
    name: "Oak Tree",
    description: "A harvestable oak tree for woodcutting",
    category: "resource",
    config: {
      prompt: "large oak tree, thick trunk, full canopy, fantasy style, harvestable resource",
      pipeline: "text-to-3d",
      quality: "medium",
      metadata: {
        resourceType: "wood",
        skill: "woodcutting",
        level: 1,
      },
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    isBuiltIn: true,
    tags: ["woodcutting", "resource", "tree"],
  },
  {
    id: "builtin-resource-rock",
    name: "Iron Rock",
    description: "A mining rock containing iron ore",
    category: "resource",
    config: {
      prompt: "large rock with iron ore veins, reddish-brown streaks, fantasy mining node",
      pipeline: "text-to-3d",
      quality: "medium",
      metadata: {
        resourceType: "ore",
        skill: "mining",
        level: 15,
        material: "iron",
      },
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    isBuiltIn: true,
    tags: ["mining", "resource", "rock", "iron"],
  },
  {
    id: "builtin-prop-chest",
    name: "Treasure Chest",
    description: "A wooden chest for storing loot",
    category: "prop",
    config: {
      prompt: "wooden treasure chest, metal bands, closed lid, fantasy style, medieval",
      pipeline: "text-to-3d",
      quality: "medium",
      metadata: {
        propType: "container",
        interactable: true,
      },
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    isBuiltIn: true,
    tags: ["container", "loot", "chest"],
  },
  {
    id: "builtin-building-house",
    name: "Village House",
    description: "A simple medieval village house",
    category: "building",
    config: {
      prompt: "small medieval village house, thatched roof, wooden walls, single door, two windows",
      pipeline: "text-to-3d",
      quality: "high",
      metadata: {
        buildingType: "residential",
        size: "small",
      },
      options: {
        targetPolycount: 10000,
      },
    },
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    isBuiltIn: true,
    tags: ["residential", "village", "house"],
  },
];

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: Pick<PresetState, "presets" | "selectedPresetId" | "filters"> = {
  presets: [...BUILT_IN_PRESETS],
  selectedPresetId: null,
  filters: {},
};

// =============================================================================
// STORE
// =============================================================================

export const usePresetStore = create<PresetState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        addPreset: (presetData) => {
          const id = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          const now = new Date().toISOString();
          const preset: GenerationPreset = {
            ...presetData,
            id,
            createdAt: now,
            updatedAt: now,
          };
          
          set((state) => ({
            presets: [...state.presets, preset],
          }));
          
          log.info("Preset created", { id, name: preset.name });
          return id;
        },

        updatePreset: (id, updates) => {
          set((state) => ({
            presets: state.presets.map((p) =>
              p.id === id && !p.isBuiltIn
                ? { ...p, ...updates, updatedAt: new Date().toISOString() }
                : p
            ),
          }));
          log.info("Preset updated", { id });
        },

        deletePreset: (id) => {
          const preset = get().presets.find((p) => p.id === id);
          if (!preset || preset.isBuiltIn) {
            log.warn("Cannot delete preset", { id, isBuiltIn: preset?.isBuiltIn });
            return false;
          }
          
          set((state) => ({
            presets: state.presets.filter((p) => p.id !== id),
            selectedPresetId: state.selectedPresetId === id ? null : state.selectedPresetId,
          }));
          
          log.info("Preset deleted", { id });
          return true;
        },

        duplicatePreset: (id, newName) => {
          const original = get().presets.find((p) => p.id === id);
          if (!original) return null;
          
          return get().addPreset({
            name: newName,
            description: original.description,
            category: original.category,
            config: { ...original.config },
            tags: original.tags,
          });
        },

        selectPreset: (id) => set({ selectedPresetId: id }),

        getSelectedPreset: () => {
          const { presets, selectedPresetId } = get();
          return presets.find((p) => p.id === selectedPresetId) ?? null;
        },

        setFilters: (filters) => set({ filters }),

        getFilteredPresets: () => {
          const { presets, filters } = get();
          
          return presets.filter((preset) => {
            // Category filter
            if (filters.category && preset.category !== filters.category) {
              return false;
            }
            
            // Search query filter
            if (filters.searchQuery) {
              const query = filters.searchQuery.toLowerCase();
              const matchesName = preset.name.toLowerCase().includes(query);
              const matchesDescription = preset.description?.toLowerCase().includes(query);
              const matchesTags = preset.tags?.some((t) => t.toLowerCase().includes(query));
              if (!matchesName && !matchesDescription && !matchesTags) {
                return false;
              }
            }
            
            // Tags filter
            if (filters.tags && filters.tags.length > 0) {
              if (!preset.tags || !filters.tags.some((t) => preset.tags?.includes(t))) {
                return false;
              }
            }
            
            return true;
          });
        },

        getPresetsByCategory: (category) => {
          return get().presets.filter((p) => p.category === category);
        },

        getPresetById: (id) => {
          return get().presets.find((p) => p.id === id);
        },

        exportPresets: () => {
          const userPresets = get().presets.filter((p) => !p.isBuiltIn);
          return JSON.stringify(userPresets, null, 2);
        },

        importPresets: (json) => {
          try {
            const imported = JSON.parse(json) as GenerationPreset[];
            const now = new Date().toISOString();
            let count = 0;
            
            const newPresets = imported.map((p) => ({
              ...p,
              id: `preset-imported-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              createdAt: p.createdAt || now,
              updatedAt: now,
              isBuiltIn: false,
            }));
            
            set((state) => ({
              presets: [...state.presets, ...newPresets],
            }));
            
            count = newPresets.length;
            log.info("Presets imported", { count });
            return count;
          } catch (error) {
            log.error("Failed to import presets", { error });
            return 0;
          }
        },

        reset: () => set(initialState),
      }),
      {
        name: "hyperforge-presets",
        partialize: (state) => ({
          // Only persist user-created presets, not built-ins
          presets: state.presets.filter((p) => !p.isBuiltIn),
          selectedPresetId: state.selectedPresetId,
        }),
        merge: (persisted, current) => {
          const persistedState = persisted as Partial<PresetState>;
          return {
            ...current,
            presets: [
              ...BUILT_IN_PRESETS,
              ...(persistedState.presets ?? []),
            ],
            selectedPresetId: persistedState.selectedPresetId ?? null,
          };
        },
      }
    ),
    { name: "PresetStore" }
  )
);

// =============================================================================
// HELPER HOOKS
// =============================================================================

/**
 * Get presets for a specific category
 */
export function usePresetsForCategory(category: AssetCategory) {
  return usePresetStore((state) => state.presets.filter((p) => p.category === category));
}

/**
 * Apply a preset to get a GenerationConfig
 */
export function applyPreset(preset: GenerationPreset): GenerationConfig {
  return {
    ...preset.config,
    category: preset.category,
  };
}
