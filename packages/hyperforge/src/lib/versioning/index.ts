/**
 * Version Control System for HyperForge
 *
 * Tracks changes to assets before export to game manifests.
 */

// Export types from version-types
export type {
  AssetVersion,
  AssetVersionData,
  AssetVersionStore,
  VersionDiff,
  FieldChange,
  ChangeType,
  DiffSummary,
  ExportRecord,
  ExportedAsset,
  ExportHistory,
  ExportStatus,
  VersionStorage,
  SaveVersionOptions,
  GetHistoryOptions,
  RecordExportOptions,
} from "./version-types";

export {
  MAX_VERSIONS_PER_ASSET,
  STORAGE_VERSION,
  VERSION_STORAGE_KEY,
  EXPORT_HISTORY_KEY,
} from "./version-types";

// Export version service functions (individual asset versioning)
export {
  saveVersion,
  getVersionHistory,
  getVersion,
  getCurrentVersion,
  diffVersions,
  diffFromCurrent,
  rollback,
  deleteAssetVersions,
  getExportHistory,
  recordExport,
  getExportRecord,
  markExportRolledBack,
  hasVersions,
  getVersionCount,
  getVersionedAssetIds,
  clearAllVersionData,
  getStorageStats,
} from "./version-service";

// Export diff utilities
export {
  calculateDiff,
  calculateSummary,
  formatDiff,
  formatDiffForUI,
  applyDiff,
  applyDiffReverse,
  hashObject,
  deepClone,
} from "./diff-utils";

export type {
  FormattedDiffSection,
  FormattedChange,
} from "./diff-utils";

// Export version control (full manifest snapshot system)
export {
  createSnapshot,
  listSnapshots,
  getSnapshot,
  getCurrentSnapshot,
  compareSnapshots,
  restoreSnapshot,
  getAssetHistory,
  deleteSnapshot,
  getVersionsDirectory,
  isInitialized,
  getVersionControlStats,
} from "./version-control";

export type {
  Snapshot,
  SnapshotSummary,
  SnapshotDiff,
  ManifestCollection,
  AssetChange,
  AssetHistoryEntry,
} from "./version-control";
