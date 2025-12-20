/**
 * HyperForge Stores
 * Centralized Zustand store exports and composition
 */

// Individual stores
export { useAppStore, type ModuleView, type ViewportPanelType } from "./app-store";
export { useGenerationStore, type GenerationProgress, type GeneratedAsset, type BatchJob } from "./generation-store";
export { usePresetStore, usePresetsForCategory, applyPreset, type GenerationPreset, type PresetFilters } from "./preset-store";
export { useAssetStore, useSelectedAsset, useFilteredAssets, useAssetsByCategory, useIsAssetSelected, type AssetFilters, type AssetLoadingState } from "./asset-store";
export { useVersionStore, useHasUnsavedChanges, useVersionCount, useCurrentVersion, type VersionState } from "./version-store";
export { useVariantStore } from "./variant-store";
export { useModelPreferencesStore } from "./model-preferences-store";

// =============================================================================
// COMPOSITE STORE HOOK
// =============================================================================

import { useAppStore } from "./app-store";
import { useGenerationStore } from "./generation-store";
import { usePresetStore } from "./preset-store";
import { useAssetStore } from "./asset-store";
import { useVersionStore } from "./version-store";

/**
 * Unified store hook for common access patterns
 * Provides access to all stores in a single hook
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { app, generation, assets, presets, version } = useHyperForgeStore();
 *   
 *   const selectedAsset = assets.getSelectedAsset();
 *   const currentPreset = presets.getSelectedPreset();
 * }
 * ```
 */
export function useHyperForgeStore() {
  const app = useAppStore();
  const generation = useGenerationStore();
  const presets = usePresetStore();
  const assets = useAssetStore();
  const version = useVersionStore();

  return {
    app,
    generation,
    presets,
    assets,
    version,
  };
}

// =============================================================================
// STORE ACTIONS (for use outside React components)
// =============================================================================

/**
 * Get store states directly (for use in non-React contexts)
 */
export const storeActions = {
  app: useAppStore.getState,
  generation: useGenerationStore.getState,
  presets: usePresetStore.getState,
  assets: useAssetStore.getState,
  version: useVersionStore.getState,
};
