/**
 * Version Control Types for HyperForge
 *
 * Types for tracking asset changes before export to game manifests.
 */

import type { AssetVersionMetadata } from "@/types/metadata";

// =============================================================================
// CHANGE TYPES
// =============================================================================

/**
 * Types of changes that can occur to an asset
 */
export type ChangeType = "added" | "modified" | "deleted";

// =============================================================================
// ASSET VERSION
// =============================================================================

/**
 * Snapshot of an asset at a specific point in time
 */
export interface AssetVersion {
  /** Unique version identifier (timestamp-based) */
  id: string;
  /** ID of the asset this version belongs to */
  assetId: string;
  /** Human-readable version label (e.g., "v1", "v2") */
  label: string;
  /** ISO timestamp when this version was created */
  createdAt: string;
  /** User or system that created this version */
  createdBy: string;
  /** Optional description of changes made */
  description?: string;
  /** The complete asset data at this point in time */
  data: AssetVersionData;
  /** Hash of the data for quick comparison */
  dataHash: string;
  /** Parent version ID (null for first version) */
  parentVersionId: string | null;
}

/**
 * The actual data stored in a version snapshot
 */
export interface AssetVersionData {
  /** Asset name */
  name: string;
  /** Asset category */
  category: string;
  /** Asset description */
  description?: string;
  /** Asset rarity */
  rarity?: string;
  /** Model URL/path */
  modelUrl?: string;
  /** Thumbnail URL/path */
  thumbnailUrl?: string;
  /** Additional metadata (stats, bonuses, etc.) */
  metadata: AssetVersionMetadata;
  /** Index signature for compatibility with diff and hashing utilities */
  [key: string]: string | AssetVersionMetadata | undefined;
}

// =============================================================================
// VERSION DIFF
// =============================================================================

/**
 * Represents a single field change between versions
 */
export interface FieldChange {
  /** Path to the field (e.g., "metadata.bonuses.attack") */
  path: string;
  /** Type of change */
  type: ChangeType;
  /** Old value (undefined for added fields) */
  oldValue?: unknown;
  /** New value (undefined for deleted fields) */
  newValue?: unknown;
}

/**
 * Complete diff between two asset versions
 */
export interface VersionDiff {
  /** ID of the source (older) version */
  fromVersionId: string;
  /** ID of the target (newer) version */
  toVersionId: string;
  /** Asset ID these versions belong to */
  assetId: string;
  /** Timestamp when diff was calculated */
  calculatedAt: string;
  /** Whether there are any changes */
  hasChanges: boolean;
  /** Number of total changes */
  changeCount: number;
  /** Breakdown by change type */
  summary: DiffSummary;
  /** Individual field changes */
  changes: FieldChange[];
}

/**
 * Summary of changes in a diff
 */
export interface DiffSummary {
  added: number;
  modified: number;
  deleted: number;
}

// =============================================================================
// EXPORT HISTORY
// =============================================================================

/**
 * Record of an export to game manifests
 */
export interface ExportRecord {
  /** Unique export identifier */
  id: string;
  /** ISO timestamp when export occurred */
  exportedAt: string;
  /** User who triggered the export */
  exportedBy: string;
  /** Target manifest types exported to */
  manifestTypes: string[];
  /** Number of assets included in this export */
  assetCount: number;
  /** Asset IDs and their versions included in export */
  assets: ExportedAsset[];
  /** Status of the export */
  status: ExportStatus;
  /** Error message if export failed */
  errorMessage?: string;
  /** Optional notes about this export */
  notes?: string;
}

/**
 * Status of an export operation
 */
export type ExportStatus = "pending" | "completed" | "failed" | "rolled_back";

/**
 * Asset included in an export
 */
export interface ExportedAsset {
  /** Asset ID */
  assetId: string;
  /** Asset name at time of export */
  assetName: string;
  /** Version ID that was exported */
  versionId: string;
  /** Type of change for this asset */
  changeType: ChangeType;
  /** Previous version ID (for rollback) */
  previousVersionId?: string;
}

/**
 * Complete export history for tracking all exports
 */
export interface ExportHistory {
  /** All export records, newest first */
  records: ExportRecord[];
  /** Last export timestamp */
  lastExportAt?: string;
  /** Total number of exports */
  totalExports: number;
}

// =============================================================================
// VERSION STORAGE
// =============================================================================

/**
 * Structure for storing all versions of a single asset
 */
export interface AssetVersionStore {
  assetId: string;
  versions: AssetVersion[];
  currentVersionId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Root storage structure for all version data
 */
export interface VersionStorage {
  /** Asset versions by asset ID */
  assets: Record<string, AssetVersionStore>;
  /** Export history */
  exports: ExportHistory;
  /** Storage metadata */
  meta: {
    version: number;
    createdAt: string;
    updatedAt: string;
  };
}

// =============================================================================
// SERVICE OPTIONS
// =============================================================================

/**
 * Options for saving a new version
 */
export interface SaveVersionOptions {
  /** Optional description of changes */
  description?: string;
  /** User making the change (defaults to "user") */
  createdBy?: string;
  /** Custom version label (auto-generated if not provided) */
  label?: string;
}

/**
 * Options for getting version history
 */
export interface GetHistoryOptions {
  /** Maximum number of versions to return */
  limit?: number;
  /** Include version data in response */
  includeData?: boolean;
}

/**
 * Options for recording an export
 */
export interface RecordExportOptions {
  /** User performing the export */
  exportedBy?: string;
  /** Notes about this export */
  notes?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum versions to keep per asset (prevent storage bloat) */
export const MAX_VERSIONS_PER_ASSET = 20;

/** Current storage format version */
export const STORAGE_VERSION = 1;

/** LocalStorage key for version data */
export const VERSION_STORAGE_KEY = "hyperforge:versions";

/** LocalStorage key for export history */
export const EXPORT_HISTORY_KEY = "hyperforge:exports";
