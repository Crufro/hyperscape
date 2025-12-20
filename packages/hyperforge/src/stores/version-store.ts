/**
 * Version Store
 * Zustand store for reactive version history state management
 * Wraps version-service.ts with reactive state
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { logger } from "@/lib/utils";
import type {
  AssetVersion,
  AssetVersionData,
  VersionDiff,
  ExportRecord,
  SaveVersionOptions,
} from "@/lib/versioning/version-types";
import * as versionService from "@/lib/versioning/version-service";

const log = logger.child("VersionStore");

// =============================================================================
// TYPES
// =============================================================================

export interface VersionState {
  // Current asset being versioned
  currentAssetId: string | null;
  
  // Version history for current asset
  versions: AssetVersion[];
  currentVersion: AssetVersion | null;
  
  // Dirty state tracking
  isDirty: boolean;
  unsavedData: AssetVersionData | null;
  
  // Auto-save
  autoSaveEnabled: boolean;
  autoSaveIntervalMs: number;
  lastAutoSaveAt: string | null;
  
  // Export history
  recentExports: ExportRecord[];
  
  // UI state
  isLoading: boolean;
  selectedVersionId: string | null;
  comparisonVersionId: string | null;
  
  // Actions - Asset Selection
  setCurrentAsset: (assetId: string | null) => void;
  
  // Actions - Version Management
  saveVersion: (data: AssetVersionData, options?: SaveVersionOptions) => AssetVersion | null;
  loadVersionHistory: (assetId: string) => void;
  rollbackToVersion: (versionId: string) => AssetVersionData | null;
  deleteAssetVersions: (assetId: string) => void;
  
  // Actions - Dirty State
  markDirty: (data: AssetVersionData) => void;
  markClean: () => void;
  
  // Actions - Auto-save
  setAutoSaveEnabled: (enabled: boolean) => void;
  setAutoSaveInterval: (intervalMs: number) => void;
  triggerAutoSave: () => void;
  
  // Actions - Comparison
  selectVersionForComparison: (versionId: string | null) => void;
  compareVersions: (fromId: string, toId: string) => VersionDiff | null;
  
  // Actions - Exports
  recordExport: (assetId: string, targetManifest: string) => void;
  loadRecentExports: () => void;
  
  // Getters
  getVersionById: (versionId: string) => AssetVersion | undefined;
  hasUnsavedChanges: () => boolean;
  getVersionCount: () => number;
  
  // Reset
  reset: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState = {
  currentAssetId: null,
  versions: [],
  currentVersion: null,
  isDirty: false,
  unsavedData: null,
  autoSaveEnabled: true,
  autoSaveIntervalMs: 5 * 60 * 1000, // 5 minutes
  lastAutoSaveAt: null,
  recentExports: [],
  isLoading: false,
  selectedVersionId: null,
  comparisonVersionId: null,
};

// =============================================================================
// AUTO-SAVE TIMER
// =============================================================================

let autoSaveTimer: ReturnType<typeof setInterval> | null = null;

function startAutoSave(store: VersionState) {
  stopAutoSave();
  
  if (!store.autoSaveEnabled) return;
  
  autoSaveTimer = setInterval(() => {
    store.triggerAutoSave();
  }, store.autoSaveIntervalMs);
  
  log.debug("Auto-save started", { intervalMs: store.autoSaveIntervalMs });
}

function stopAutoSave() {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
    log.debug("Auto-save stopped");
  }
}

// =============================================================================
// STORE
// =============================================================================

export const useVersionStore = create<VersionState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      // Asset Selection
      setCurrentAsset: (assetId) => {
        set({ currentAssetId: assetId, isDirty: false, unsavedData: null });
        if (assetId) {
          get().loadVersionHistory(assetId);
        } else {
          set({ versions: [], currentVersion: null });
        }
      },

      // Version Management
      saveVersion: (data, options = {}) => {
        const { currentAssetId } = get();
        if (!currentAssetId) {
          log.warn("Cannot save version: no asset selected");
          return null;
        }

        try {
          const version = versionService.saveVersion(currentAssetId, data, options);
          
          // Reload history to get updated state
          get().loadVersionHistory(currentAssetId);
          
          // Mark as clean after save
          set({ isDirty: false, unsavedData: null });
          
          log.info("Version saved", { assetId: currentAssetId, versionId: version.id });
          return version;
        } catch (error) {
          log.error("Failed to save version", { error, assetId: currentAssetId });
          return null;
        }
      },

      loadVersionHistory: (assetId) => {
        set({ isLoading: true });
        
        try {
          const versions = versionService.getVersionHistory(assetId);
          const currentVersion = versionService.getCurrentVersion(assetId);
          
          set({
            versions,
            currentVersion,
            isLoading: false,
          });
          
          log.debug("Version history loaded", { assetId, count: versions.length });
        } catch (error) {
          log.error("Failed to load version history", { error, assetId });
          set({ versions: [], currentVersion: null, isLoading: false });
        }
      },

      rollbackToVersion: (versionId) => {
        const { currentAssetId } = get();
        if (!currentAssetId) return null;

        try {
          const data = versionService.rollback(currentAssetId, versionId);
          
          if (data) {
            // Reload history after rollback
            get().loadVersionHistory(currentAssetId);
            log.info("Rolled back to version", { assetId: currentAssetId, versionId });
          }
          
          return data;
        } catch (error) {
          log.error("Failed to rollback", { error, assetId: currentAssetId, versionId });
          return null;
        }
      },

      deleteAssetVersions: (assetId) => {
        try {
          versionService.deleteAssetVersions(assetId);
          
          // Clear state if it's the current asset
          const { currentAssetId } = get();
          if (currentAssetId === assetId) {
            set({ versions: [], currentVersion: null });
          }
          
          log.info("Asset versions deleted", { assetId });
        } catch (error) {
          log.error("Failed to delete versions", { error, assetId });
        }
      },

      // Dirty State
      markDirty: (data) => {
        set({ isDirty: true, unsavedData: data });
      },

      markClean: () => {
        set({ isDirty: false, unsavedData: null });
      },

      // Auto-save
      setAutoSaveEnabled: (enabled) => {
        set({ autoSaveEnabled: enabled });
        if (enabled) {
          startAutoSave(get());
        } else {
          stopAutoSave();
        }
      },

      setAutoSaveInterval: (intervalMs) => {
        set({ autoSaveIntervalMs: intervalMs });
        if (get().autoSaveEnabled) {
          startAutoSave(get());
        }
      },

      triggerAutoSave: () => {
        const { isDirty, unsavedData, currentAssetId } = get();
        
        if (!isDirty || !unsavedData || !currentAssetId) return;

        log.debug("Auto-save triggered", { assetId: currentAssetId });
        
        const version = get().saveVersion(unsavedData, {
          description: "Auto-saved",
          createdBy: "auto-save",
        });

        if (version) {
          set({ lastAutoSaveAt: new Date().toISOString() });
        }
      },

      // Comparison
      selectVersionForComparison: (versionId) => {
        set({ comparisonVersionId: versionId });
      },

      compareVersions: (fromId, toId) => {
        const { currentAssetId } = get();
        if (!currentAssetId) return null;

        try {
          return versionService.diffVersions(currentAssetId, fromId, toId);
        } catch (error) {
          log.error("Failed to compare versions", { error, fromId, toId });
          return null;
        }
      },

      // Exports
      recordExport: (assetId, targetManifest) => {
        try {
          const currentVersion = get().currentVersion;
          versionService.recordExport(
            [targetManifest],
            [{
              assetId,
              assetName: currentVersion?.data.name ?? assetId,
              versionId: currentVersion?.id ?? `v_${Date.now()}`,
              changeType: "modified" as const,
            }],
            { exportedBy: "user" }
          );
          
          get().loadRecentExports();
        } catch (error) {
          log.error("Failed to record export", { error, assetId });
        }
      },

      loadRecentExports: () => {
        try {
          const history = versionService.getExportHistory(10);
          set({ recentExports: history.records });
        } catch (error) {
          log.error("Failed to load export history", { error });
        }
      },

      // Getters
      getVersionById: (versionId) => {
        return get().versions.find((v) => v.id === versionId);
      },

      hasUnsavedChanges: () => {
        return get().isDirty;
      },

      getVersionCount: () => {
        return get().versions.length;
      },

      // Reset
      reset: () => {
        stopAutoSave();
        set(initialState);
      },
    })),
    { name: "VersionStore" }
  )
);

// =============================================================================
// INITIALIZATION
// =============================================================================

// Start auto-save when store is first accessed (client-side only)
if (typeof window !== "undefined") {
  // Subscribe to auto-save settings changes
  useVersionStore.subscribe(
    (state) => ({ enabled: state.autoSaveEnabled, interval: state.autoSaveIntervalMs }),
    ({ enabled }) => {
      if (enabled) {
        startAutoSave(useVersionStore.getState());
      } else {
        stopAutoSave();
      }
    }
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook to check if current asset has unsaved changes
 */
export function useHasUnsavedChanges(): boolean {
  return useVersionStore((state) => state.isDirty);
}

/**
 * Hook to get version count for current asset
 */
export function useVersionCount(): number {
  return useVersionStore((state) => state.versions.length);
}

/**
 * Hook to get current version data
 */
export function useCurrentVersion(): AssetVersion | null {
  return useVersionStore((state) => state.currentVersion);
}
