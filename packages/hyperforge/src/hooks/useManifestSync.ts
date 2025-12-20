/**
 * useManifestSync Hook
 *
 * React hook for tracking sync state between game manifests and HyperForge.
 * Provides status, pending changes, and auto-detection of manifest changes.
 *
 * Usage:
 *   const {
 *     syncStatus,
 *     lastSyncTime,
 *     pendingChanges,
 *     isLoading,
 *     isSyncing,
 *     syncFromGame,
 *     syncToGame,
 *     refresh,
 *   } = useManifestSync();
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { logger } from "@/lib/utils";

const log = logger.child("useManifestSync");

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

type ManifestType = "items" | "npcs" | "resources" | "stores" | "music";

type SyncStatus = "idle" | "loading" | "syncing" | "in_sync" | "changes_pending" | "error";

interface AssetChange {
  id: string;
  name: string;
  category: string;
  manifestType: ManifestType;
  changeType: "new" | "modified" | "deleted";
}

interface ManifestDiffSummary {
  manifestType: ManifestType;
  new: number;
  modified: number;
  deleted: number;
  unchanged: number;
}

interface SyncState {
  status: SyncStatus;
  lastSyncTime: Date | null;
  lastCheckTime: Date | null;
  pendingChanges: AssetChange[];
  manifestSummaries: ManifestDiffSummary[];
  totals: {
    new: number;
    modified: number;
    deleted: number;
    unchanged: number;
  };
  error: string | null;
}

interface SyncResult {
  success: boolean;
  totals: {
    added: number;
    updated: number;
    skipped: number;
    failed: number;
  };
}

interface UseManifestSyncOptions {
  /** Polling interval in milliseconds (default: 30000 = 30s) */
  pollInterval?: number;
  /** Whether to auto-poll for changes (default: false) */
  autoPoll?: boolean;
  /** Callback when sync completes */
  onSyncComplete?: (result: SyncResult) => void;
  /** Callback when changes detected */
  onChangesDetected?: (changes: AssetChange[]) => void;
}

interface UseManifestSyncResult {
  /** Current sync status */
  syncStatus: SyncStatus;
  /** Last successful sync time */
  lastSyncTime: Date | null;
  /** Last time we checked for changes */
  lastCheckTime: Date | null;
  /** List of pending changes */
  pendingChanges: AssetChange[];
  /** Summary by manifest type */
  manifestSummaries: ManifestDiffSummary[];
  /** Totals across all manifests */
  totals: {
    new: number;
    modified: number;
    deleted: number;
    unchanged: number;
  };
  /** Whether currently loading */
  isLoading: boolean;
  /** Whether currently syncing */
  isSyncing: boolean;
  /** Whether there are pending changes */
  hasChanges: boolean;
  /** Error message if any */
  error: string | null;
  /** Sync from game manifests to HyperForge */
  syncFromGame: (manifestTypes?: ManifestType[]) => Promise<SyncResult>;
  /** Sync from HyperForge to game manifests */
  syncToGame: (manifestTypes?: ManifestType[]) => Promise<SyncResult>;
  /** Refresh the sync status */
  refresh: () => Promise<void>;
  /** Clear error state */
  clearError: () => void;
}

// =============================================================================
// LOCAL STORAGE KEYS
// =============================================================================

const STORAGE_KEY_LAST_SYNC = "hyperforge:manifest:lastSync";
const STORAGE_KEY_LAST_CHECK = "hyperforge:manifest:lastCheck";

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useManifestSync(
  options: UseManifestSyncOptions = {},
): UseManifestSyncResult {
  const {
    pollInterval = 30000,
    autoPoll = false,
    onSyncComplete,
    onChangesDetected,
  } = options;

  // State
  const [state, setState] = useState<SyncState>({
    status: "idle",
    lastSyncTime: null,
    lastCheckTime: null,
    pendingChanges: [],
    manifestSummaries: [],
    totals: { new: 0, modified: 0, deleted: 0, unchanged: 0 },
    error: null,
  });

  // Refs for callbacks (avoid stale closures)
  const onSyncCompleteRef = useRef(onSyncComplete);
  const onChangesDetectedRef = useRef(onChangesDetected);
  onSyncCompleteRef.current = onSyncComplete;
  onChangesDetectedRef.current = onChangesDetected;

  // Load last sync time from storage
  useEffect(() => {
    try {
      const storedLastSync = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
      const storedLastCheck = localStorage.getItem(STORAGE_KEY_LAST_CHECK);

      if (storedLastSync) {
        setState((prev) => ({
          ...prev,
          lastSyncTime: new Date(storedLastSync),
        }));
      }
      if (storedLastCheck) {
        setState((prev) => ({
          ...prev,
          lastCheckTime: new Date(storedLastCheck),
        }));
      }
    } catch (error) {
      // localStorage might not be available
      log.warn("Failed to load sync state from storage", { error });
    }
  }, []);

  // Fetch sync status
  const fetchStatus = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "loading", error: null }));

    try {
      const response = await fetch("/api/import/manifests");
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Extract pending changes from diff
      const pendingChanges: AssetChange[] = [];
      const manifestSummaries: ManifestDiffSummary[] = [];

      for (const manifest of data.diff.manifests) {
        // Add to summaries
        manifestSummaries.push({
          manifestType: manifest.manifestType,
          new: manifest.summary.new,
          modified: manifest.summary.modified,
          deleted: manifest.summary.deleted,
          unchanged: manifest.summary.unchanged,
        });

        // Extract individual changes
        for (const asset of manifest.newAssets) {
          pendingChanges.push({
            id: asset.id,
            name: asset.name,
            category: asset.category,
            manifestType: manifest.manifestType,
            changeType: "new",
          });
        }
        for (const asset of manifest.modifiedAssets) {
          pendingChanges.push({
            id: asset.id,
            name: asset.name,
            category: asset.category,
            manifestType: manifest.manifestType,
            changeType: "modified",
          });
        }
        for (const asset of manifest.deletedAssets) {
          pendingChanges.push({
            id: asset.id,
            name: asset.name,
            category: asset.category,
            manifestType: manifest.manifestType,
            changeType: "deleted",
          });
        }
      }

      const hasChanges =
        data.diff.totals.new > 0 ||
        data.diff.totals.modified > 0 ||
        data.diff.totals.deleted > 0;

      const lastCheckTime = new Date();

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY_LAST_CHECK, lastCheckTime.toISOString());
      } catch {
        // Ignore storage errors
      }

      setState((prev) => ({
        ...prev,
        status: hasChanges ? "changes_pending" : "in_sync",
        lastCheckTime,
        pendingChanges,
        manifestSummaries,
        totals: data.diff.totals,
        error: null,
      }));

      // Notify if changes detected
      if (hasChanges && onChangesDetectedRef.current) {
        onChangesDetectedRef.current(pendingChanges);
      }

      log.debug("Sync status updated", {
        hasChanges,
        totals: data.diff.totals,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      log.error("Failed to fetch sync status", { error: errorMessage });

      setState((prev) => ({
        ...prev,
        status: "error",
        error: errorMessage,
      }));
    }
  }, []);

  // Sync from game
  const syncFromGame = useCallback(
    async (manifestTypes?: ManifestType[]): Promise<SyncResult> => {
      setState((prev) => ({ ...prev, status: "syncing", error: null }));

      try {
        const response = await fetch("/api/import/manifests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            direction: "from_game",
            manifestTypes,
          }),
        });

        if (!response.ok) {
          throw new Error(`Sync failed: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Sync failed");
        }

        const result: SyncResult = {
          success: data.success,
          totals: data.totals,
        };

        const lastSyncTime = new Date();

        // Save to localStorage
        try {
          localStorage.setItem(STORAGE_KEY_LAST_SYNC, lastSyncTime.toISOString());
        } catch {
          // Ignore storage errors
        }

        setState((prev) => ({
          ...prev,
          lastSyncTime,
        }));

        // Refresh status after sync
        await fetchStatus();

        // Notify completion
        if (onSyncCompleteRef.current) {
          onSyncCompleteRef.current(result);
        }

        log.info("Sync from game complete", { totals: result.totals });

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        log.error("Sync from game failed", { error: errorMessage });

        setState((prev) => ({
          ...prev,
          status: "error",
          error: errorMessage,
        }));

        return {
          success: false,
          totals: { added: 0, updated: 0, skipped: 0, failed: 1 },
        };
      }
    },
    [fetchStatus],
  );

  // Sync to game
  const syncToGame = useCallback(
    async (manifestTypes?: ManifestType[]): Promise<SyncResult> => {
      setState((prev) => ({ ...prev, status: "syncing", error: null }));

      try {
        const response = await fetch("/api/import/manifests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            direction: "to_game",
            manifestTypes,
          }),
        });

        if (!response.ok) {
          throw new Error(`Sync failed: ${response.statusText}`);
        }

        const data = await response.json();

        // Note: to_game sync redirects to manifest exporter
        if (data.suggestion) {
          log.info(data.message, { suggestion: data.suggestion });
        }

        const result: SyncResult = {
          success: data.success,
          totals: data.totals || { added: 0, updated: 0, skipped: 0, failed: 0 },
        };

        // Refresh status after sync
        await fetchStatus();

        // Notify completion
        if (onSyncCompleteRef.current) {
          onSyncCompleteRef.current(result);
        }

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        log.error("Sync to game failed", { error: errorMessage });

        setState((prev) => ({
          ...prev,
          status: "error",
          error: errorMessage,
        }));

        return {
          success: false,
          totals: { added: 0, updated: 0, skipped: 0, failed: 1 },
        };
      }
    },
    [fetchStatus],
  );

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Auto-polling
  useEffect(() => {
    if (!autoPoll) return;

    const intervalId = setInterval(() => {
      fetchStatus();
    }, pollInterval);

    return () => clearInterval(intervalId);
  }, [autoPoll, pollInterval, fetchStatus]);

  // Computed values
  const isLoading = state.status === "loading";
  const isSyncing = state.status === "syncing";
  const hasChanges = state.totals.new > 0 || state.totals.modified > 0 || state.totals.deleted > 0;

  return {
    syncStatus: state.status,
    lastSyncTime: state.lastSyncTime,
    lastCheckTime: state.lastCheckTime,
    pendingChanges: state.pendingChanges,
    manifestSummaries: state.manifestSummaries,
    totals: state.totals,
    isLoading,
    isSyncing,
    hasChanges,
    error: state.error,
    syncFromGame,
    syncToGame,
    refresh: fetchStatus,
    clearError,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export type {
  SyncStatus,
  AssetChange,
  ManifestDiffSummary,
  SyncResult,
  UseManifestSyncOptions,
  UseManifestSyncResult,
};
