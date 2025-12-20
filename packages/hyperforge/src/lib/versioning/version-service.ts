/**
 * Version Service for HyperForge
 *
 * Manages version snapshots, history, and rollback for assets.
 * Uses localStorage for simple persistence (suitable for client-side tracking).
 */

import { logger } from "@/lib/utils";
import {
  calculateDiff,
  calculateSummary,
  hashObject,
  deepClone,
} from "./diff-utils";
import type {
  AssetVersion,
  AssetVersionData,
  VersionDiff,
  ExportRecord,
  ExportHistory,
  ExportedAsset,
  SaveVersionOptions,
  GetHistoryOptions,
  RecordExportOptions,
  VersionStorage,
} from "./version-types";
import {
  MAX_VERSIONS_PER_ASSET,
  STORAGE_VERSION,
  VERSION_STORAGE_KEY,
  EXPORT_HISTORY_KEY,
} from "./version-types";

const log = logger.child("VersionService");

// =============================================================================
// STORAGE HELPERS
// =============================================================================

/**
 * Check if localStorage is available (client-side only)
 */
function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const test = "__storage_test__";
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the version storage from localStorage
 */
function getStorage(): VersionStorage {
  if (!isStorageAvailable()) {
    return createEmptyStorage();
  }

  try {
    const raw = window.localStorage.getItem(VERSION_STORAGE_KEY);
    if (!raw) {
      return createEmptyStorage();
    }
    const storage = JSON.parse(raw) as VersionStorage;
    // Migration check
    if (storage.meta.version !== STORAGE_VERSION) {
      log.warn("Storage version mismatch, resetting", {
        expected: STORAGE_VERSION,
        actual: storage.meta.version,
      });
      return createEmptyStorage();
    }
    return storage;
  } catch (error) {
    log.error("Failed to parse version storage", { error });
    return createEmptyStorage();
  }
}

/**
 * Save the version storage to localStorage
 */
function saveStorage(storage: VersionStorage): void {
  if (!isStorageAvailable()) {
    log.warn("localStorage not available, versions will not persist");
    return;
  }

  try {
    storage.meta.updatedAt = new Date().toISOString();
    window.localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    log.error("Failed to save version storage", { error });
  }
}

/**
 * Create an empty storage structure
 */
function createEmptyStorage(): VersionStorage {
  const now = new Date().toISOString();
  return {
    assets: {},
    exports: {
      records: [],
      totalExports: 0,
    },
    meta: {
      version: STORAGE_VERSION,
      createdAt: now,
      updatedAt: now,
    },
  };
}

/**
 * Generate a unique version ID
 */
function generateVersionId(): string {
  return `v_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Generate a version label (e.g., "v1", "v2")
 */
function generateVersionLabel(versionCount: number): string {
  return `v${versionCount + 1}`;
}

// =============================================================================
// VERSION SERVICE
// =============================================================================

/**
 * Save a new version snapshot for an asset
 */
export function saveVersion(
  assetId: string,
  data: AssetVersionData,
  options: SaveVersionOptions = {}
): AssetVersion {
  const storage = getStorage();
  const now = new Date().toISOString();
  const { description, createdBy = "user", label } = options;

  // Get or create asset version store
  let assetStore = storage.assets[assetId];
  if (!assetStore) {
    assetStore = {
      assetId,
      versions: [],
      currentVersionId: "",
      createdAt: now,
      updatedAt: now,
    };
    storage.assets[assetId] = assetStore;
  }

  // Get parent version ID
  const parentVersionId = assetStore.currentVersionId || null;

  // Check if data has actually changed
  if (parentVersionId) {
    const parentVersion = assetStore.versions.find(
      (v) => v.id === parentVersionId
    );
    if (parentVersion) {
      const oldHash = parentVersion.dataHash;
      const newHash = hashObject(data as Record<string, unknown>);
      if (oldHash === newHash) {
        log.debug("No changes detected, skipping version save", { assetId });
        return parentVersion;
      }
    }
  }

  // Create new version
  const version: AssetVersion = {
    id: generateVersionId(),
    assetId,
    label: label || generateVersionLabel(assetStore.versions.length),
    createdAt: now,
    createdBy,
    description,
    data: deepClone(data),
    dataHash: hashObject(data as Record<string, unknown>),
    parentVersionId,
  };

  // Add to versions
  assetStore.versions.push(version);
  assetStore.currentVersionId = version.id;
  assetStore.updatedAt = now;

  // Trim old versions if over limit
  if (assetStore.versions.length > MAX_VERSIONS_PER_ASSET) {
    const toRemove = assetStore.versions.length - MAX_VERSIONS_PER_ASSET;
    assetStore.versions.splice(0, toRemove);
    log.debug("Trimmed old versions", { assetId, removed: toRemove });
  }

  saveStorage(storage);
  log.info("Saved version", { assetId, versionId: version.id, label: version.label });

  return version;
}

/**
 * Get version history for an asset
 */
export function getVersionHistory(
  assetId: string,
  options: GetHistoryOptions = {}
): AssetVersion[] {
  const storage = getStorage();
  const { limit, includeData = true } = options;

  const assetStore = storage.assets[assetId];
  if (!assetStore) {
    return [];
  }

  // Return versions in reverse chronological order (newest first)
  let versions = [...assetStore.versions].reverse();

  if (limit && limit > 0) {
    versions = versions.slice(0, limit);
  }

  // Optionally strip data for lighter response
  if (!includeData) {
    versions = versions.map((v) => ({
      ...v,
      data: {} as AssetVersionData,
    }));
  }

  return versions;
}

/**
 * Get a specific version by ID
 */
export function getVersion(
  assetId: string,
  versionId: string
): AssetVersion | null {
  const storage = getStorage();
  const assetStore = storage.assets[assetId];

  if (!assetStore) {
    return null;
  }

  return assetStore.versions.find((v) => v.id === versionId) || null;
}

/**
 * Get the current (latest) version for an asset
 */
export function getCurrentVersion(assetId: string): AssetVersion | null {
  const storage = getStorage();
  const assetStore = storage.assets[assetId];

  if (!assetStore || !assetStore.currentVersionId) {
    return null;
  }

  return assetStore.versions.find((v) => v.id === assetStore.currentVersionId) || null;
}

/**
 * Calculate diff between two versions
 */
export function diffVersions(
  assetId: string,
  fromVersionId: string,
  toVersionId: string
): VersionDiff | null {
  const fromVersion = getVersion(assetId, fromVersionId);
  const toVersion = getVersion(assetId, toVersionId);

  if (!fromVersion || !toVersion) {
    log.warn("Version not found for diff", {
      assetId,
      fromVersionId,
      toVersionId,
      fromFound: !!fromVersion,
      toFound: !!toVersion,
    });
    return null;
  }

  const changes = calculateDiff(
    fromVersion.data as unknown as Record<string, unknown>,
    toVersion.data as unknown as Record<string, unknown>
  );

  const summary = calculateSummary(changes);

  return {
    fromVersionId,
    toVersionId,
    assetId,
    calculatedAt: new Date().toISOString(),
    hasChanges: changes.length > 0,
    changeCount: changes.length,
    summary,
    changes,
  };
}

/**
 * Diff current version against a specific version
 */
export function diffFromCurrent(
  assetId: string,
  toVersionId: string
): VersionDiff | null {
  const currentVersion = getCurrentVersion(assetId);
  if (!currentVersion) {
    return null;
  }
  return diffVersions(assetId, currentVersion.id, toVersionId);
}

/**
 * Rollback an asset to a previous version
 * Returns the restored version data
 */
export function rollback(
  assetId: string,
  targetVersionId: string
): AssetVersionData | null {
  const targetVersion = getVersion(assetId, targetVersionId);
  if (!targetVersion) {
    log.warn("Target version not found for rollback", { assetId, targetVersionId });
    return null;
  }

  const storage = getStorage();
  const assetStore = storage.assets[assetId];
  if (!assetStore) {
    return null;
  }

  // Create a new version that's a copy of the target (rollback as new version)
  const rolledBackVersion = saveVersion(assetId, deepClone(targetVersion.data), {
    description: `Rolled back to ${targetVersion.label}`,
    createdBy: "system",
  });

  log.info("Rolled back to version", {
    assetId,
    targetVersionId,
    newVersionId: rolledBackVersion.id,
  });

  return rolledBackVersion.data;
}

/**
 * Delete all versions for an asset
 */
export function deleteAssetVersions(assetId: string): void {
  const storage = getStorage();
  delete storage.assets[assetId];
  saveStorage(storage);
  log.info("Deleted all versions for asset", { assetId });
}

// =============================================================================
// EXPORT HISTORY
// =============================================================================

/**
 * Get export history
 */
export function getExportHistory(limit?: number): ExportHistory {
  const storage = getStorage();
  const history = storage.exports;

  if (limit && limit > 0) {
    return {
      ...history,
      records: history.records.slice(0, limit),
    };
  }

  return history;
}

/**
 * Record a new export
 */
export function recordExport(
  manifestTypes: string[],
  assets: ExportedAsset[],
  options: RecordExportOptions = {}
): ExportRecord {
  const storage = getStorage();
  const now = new Date().toISOString();
  const { exportedBy = "user", notes } = options;

  const record: ExportRecord = {
    id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    exportedAt: now,
    exportedBy,
    manifestTypes,
    assetCount: assets.length,
    assets,
    status: "completed",
    notes,
  };

  storage.exports.records.unshift(record);
  storage.exports.lastExportAt = now;
  storage.exports.totalExports++;

  // Keep only last 100 exports
  if (storage.exports.records.length > 100) {
    storage.exports.records = storage.exports.records.slice(0, 100);
  }

  saveStorage(storage);
  log.info("Recorded export", { exportId: record.id, assetCount: assets.length });

  return record;
}

/**
 * Get a specific export record
 */
export function getExportRecord(exportId: string): ExportRecord | null {
  const storage = getStorage();
  return storage.exports.records.find((r) => r.id === exportId) || null;
}

/**
 * Mark an export as rolled back
 */
export function markExportRolledBack(exportId: string): void {
  const storage = getStorage();
  const record = storage.exports.records.find((r) => r.id === exportId);

  if (record) {
    record.status = "rolled_back";
    saveStorage(storage);
    log.info("Marked export as rolled back", { exportId });
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if an asset has any versions
 */
export function hasVersions(assetId: string): boolean {
  const storage = getStorage();
  return (
    !!storage.assets[assetId] && storage.assets[assetId].versions.length > 0
  );
}

/**
 * Get the count of versions for an asset
 */
export function getVersionCount(assetId: string): number {
  const storage = getStorage();
  return storage.assets[assetId]?.versions.length || 0;
}

/**
 * Get all asset IDs that have versions
 */
export function getVersionedAssetIds(): string[] {
  const storage = getStorage();
  return Object.keys(storage.assets);
}

/**
 * Clear all version data (for testing/reset)
 */
export function clearAllVersionData(): void {
  if (!isStorageAvailable()) return;

  window.localStorage.removeItem(VERSION_STORAGE_KEY);
  window.localStorage.removeItem(EXPORT_HISTORY_KEY);
  log.info("Cleared all version data");
}

/**
 * Get storage statistics
 */
export function getStorageStats(): {
  totalAssets: number;
  totalVersions: number;
  totalExports: number;
  storageSizeBytes: number;
} {
  const storage = getStorage();

  const totalVersions = Object.values(storage.assets).reduce(
    (sum, store) => sum + store.versions.length,
    0
  );

  let storageSizeBytes = 0;
  if (isStorageAvailable()) {
    const raw = window.localStorage.getItem(VERSION_STORAGE_KEY);
    storageSizeBytes = raw ? new Blob([raw]).size : 0;
  }

  return {
    totalAssets: Object.keys(storage.assets).length,
    totalVersions,
    totalExports: storage.exports.totalExports,
    storageSizeBytes,
  };
}
