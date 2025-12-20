/**
 * Variant Store
 * Zustand store for texture variant state management
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  TextureVariant,
  GeneratedVariant,
} from "@/components/generation/GenerationFormRouter";

interface VariantState {
  // Base model reference (for post-generation variant creation)
  baseModelId: string | null;
  baseModelUrl: string | null;
  baseModelName: string | null;

  // Variants for current session
  variants: TextureVariant[];
  generatedVariants: GeneratedVariant[];

  // UI state
  isGenerating: boolean;
  currentVariantIndex: number;

  // Actions - Base model
  setBaseModel: (id: string, url: string, name: string) => void;
  clearBaseModel: () => void;

  // Actions - Variant definition
  addVariant: (variant: TextureVariant) => void;
  removeVariant: (id: string) => void;
  updateVariant: (id: string, updates: Partial<TextureVariant>) => void;
  clearVariants: () => void;

  // Actions - Generated variants
  addGeneratedVariant: (variant: GeneratedVariant) => void;
  clearGeneratedVariants: () => void;

  // Actions - Generation state
  setIsGenerating: (isGenerating: boolean) => void;
  setCurrentVariantIndex: (index: number) => void;

  // Actions - Reset
  reset: () => void;
}

const initialState = {
  baseModelId: null,
  baseModelUrl: null,
  baseModelName: null,
  variants: [],
  generatedVariants: [],
  isGenerating: false,
  currentVariantIndex: 0,
};

export const useVariantStore = create<VariantState>()(
  devtools(
    (set) => ({
      ...initialState,

      setBaseModel: (id, url, name) =>
        set({
          baseModelId: id,
          baseModelUrl: url,
          baseModelName: name,
        }),

      clearBaseModel: () =>
        set({
          baseModelId: null,
          baseModelUrl: null,
          baseModelName: null,
        }),

      addVariant: (variant) =>
        set((state) => ({
          variants: [...state.variants, variant],
        })),

      removeVariant: (id) =>
        set((state) => ({
          variants: state.variants.filter((v) => v.id !== id),
        })),

      updateVariant: (id, updates) =>
        set((state) => ({
          variants: state.variants.map((v) =>
            v.id === id ? { ...v, ...updates } : v,
          ),
        })),

      clearVariants: () => set({ variants: [] }),

      addGeneratedVariant: (variant) =>
        set((state) => ({
          generatedVariants: [...state.generatedVariants, variant],
        })),

      clearGeneratedVariants: () => set({ generatedVariants: [] }),

      setIsGenerating: (isGenerating) => set({ isGenerating }),

      setCurrentVariantIndex: (index) => set({ currentVariantIndex: index }),

      reset: () => set(initialState),
    }),
    { name: "VariantStore" },
  ),
);

/**
 * Generate a unique variant ID
 */
export function generateVariantId(): string {
  return `variant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a variant from a material preset
 */
export function createVariantFromPreset(preset: {
  id: string;
  displayName?: string;
  name?: string;
  stylePrompt?: string;
}): TextureVariant {
  return {
    id: generateVariantId(),
    name: preset.displayName || preset.name || preset.id,
    prompt: preset.stylePrompt,
    materialPresetId: preset.id,
  };
}
