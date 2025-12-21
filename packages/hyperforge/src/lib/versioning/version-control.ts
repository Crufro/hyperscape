/**
 * Version Control Service for HyperForge Manifest Snapshots
 *
 * Manages full manifest snapshots stored as JSON files in .hyperforge/versions/
 * Enables tracking changes, comparing versions, and rolling back.
 */

import { promises as fs } from "fs";
import path from "path";
import { logger } from "@/lib/utils";
import { calculateDiff, hashObject, deepClone } from "./diff-utils";
import type { ItemManifest, NPCManifest, ResourceManifest, MusicTrackManifest } from "@/types/manifest";
import type { StoreDefinition } from "@/lib/game/manifests";
import type { FieldChange, DiffSummary } from "./version-types";

const log = logger.child("VersionControl");

// =============================================================================
// CONFIGURATION
// =============================================================================

const VERSIONS_DIR =
  process.env["HYPERFORGE_VERSIONS_DIR"] ||
  path.resolve(process.cwd(), ".hyperforge", "versions");

const SNAPSHOT_INDEX_FILE = "index.json";
const MAX_SNAPSHOTS = 100;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Manifests contained in a snapshot
 */
export interface ManifestCollection {
  items: ItemManifest[];
  npcs: NPCManifest[];
  resources: ResourceManifest[];
  stores: StoreDefinition[];
  music: MusicTrackManifest[];
}

/**
 * A complete snapshot of all manifests at a point in time
 */
export interface Snapshot {
  id: string;
  timestamp: string;
  description: string;
  manifests: ManifestCollection;
  metadata: {
    totalAssets: number;
    changesFromPrevious: number;
    hash: string;
  };
}

/**
 * Lightweight snapshot info for listing (without full manifests)
 */
export interface SnapshotSummary {
  id: string;
  timestamp: string;
  description: string;
  metadata: {
    totalAssets: number;
    changesFromPrevious: number;
    hash: string;
  };
}

/**
 * Index file structure that tracks all snapshots
 */
interface SnapshotIndex {
  version: number;
  currentSnapshotId: string | null;
  snapshots: SnapshotSummary[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Change for a single asset between snapshots
 */
export interface AssetChange {
  assetId: string;
  assetName: string;
  manifestType: "items" | "npcs" | "resources" | "stores" | "music";
  changeType: "added" | "modified" | "deleted";
  fieldChanges: FieldChange[];
}

/**
 * Complete diff between two snapshots
 */
export interface SnapshotDiff {
  fromSnapshotId: string;
  toSnapshotId: string;
  calculatedAt: string;
  summary: {
    added: number;
    modified: number;
    deleted: number;
    total: number;
  };
  changes: AssetChange[];
}

/**
 * History entry for a single asset
 */
export interface AssetHistoryEntry {
  snapshotId: string;
  timestamp: string;
  description: string;
  changeType: "added" | "modified" | "deleted" | "unchanged";
  fieldChanges: FieldChange[];
}

// =============================================================================
// FILE SYSTEM HELPERS
// =============================================================================

/**
 * Ensure the versions directory exists
 */
async function ensureVersionsDir(): Promise<void> {
  try {
    await fs.mkdir(VERSIONS_DIR, { recursive: true });
  } catch (error) {
    log.error("Failed to create versions directory", { error });
    throw error;
  }
}

/**
 * Read the snapshot index
 */
async function readIndex(): Promise<SnapshotIndex> {
  const indexPath = path.join(VERSIONS_DIR, SNAPSHOT_INDEX_FILE);

  try {
    const content = await fs.readFile(indexPath, "utf-8");
    return JSON.parse(content) as SnapshotIndex;
  } catch (_error) {
    // Index doesn't exist, create empty one
    const now = new Date().toISOString();
    return {
      version: 1,
      currentSnapshotId: null,
      snapshots: [],
      createdAt: now,
      updatedAt: now,
    };
  }
}

/**
 * Write the snapshot index
 */
async function writeIndex(index: SnapshotIndex): Promise<void> {
  await ensureVersionsDir();
  const indexPath = path.join(VERSIONS_DIR, SNAPSHOT_INDEX_FILE);
  index.updatedAt = new Date().toISOString();
  await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
}

/**
 * Read a snapshot file
 */
async function readSnapshot(snapshotId: string): Promise<Snapshot | null> {
  const snapshotPath = path.join(VERSIONS_DIR, `${snapshotId}.json`);

  try {
    const content = await fs.readFile(snapshotPath, "utf-8");
    return JSON.parse(content) as Snapshot;
  } catch (error) {
    log.warn("Failed to read snapshot", { snapshotId, error });
    return null;
  }
}

/**
 * Write a snapshot file
 */
async function writeSnapshot(snapshot: Snapshot): Promise<void> {
  await ensureVersionsDir();
  const snapshotPath = path.join(VERSIONS_DIR, `${snapshot.id}.json`);
  await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));
}

/**
 * Delete a snapshot file
 */
async function deleteSnapshotFile(snapshotId: string): Promise<void> {
  const snapshotPath = path.join(VERSIONS_DIR, `${snapshotId}.json`);

  try {
    await fs.unlink(snapshotPath);
  } catch (error) {
    log.warn("Failed to delete snapshot file", { snapshotId, error });
  }
}

/**
 * Generate a unique snapshot ID
 */
function generateSnapshotId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `snap_${timestamp}_${random}`;
}

// =============================================================================
// MANIFEST COMPARISON HELPERS
// =============================================================================

/**
 * Convert manifest array to a map by ID for comparison
 */
function toManifestMap<T extends { id: string }>(
  manifests: T[]
): Map<string, T> {
  return new Map(manifests.map((m) => [m.id, m]));
}

/**
 * Compare two manifest arrays and return asset changes
 */
function compareManifests<T extends { id: string; name: string }>(
  oldManifests: T[],
  newManifests: T[],
  manifestType: AssetChange["manifestType"]
): AssetChange[] {
  const changes: AssetChange[] = [];
  const oldMap = toManifestMap(oldManifests);
  const newMap = toManifestMap(newManifests);

  // Find deleted and modified assets
  for (const [id, oldAsset] of oldMap) {
    const newAsset = newMap.get(id);

    if (!newAsset) {
      // Asset was deleted
      changes.push({
        assetId: id,
        assetName: oldAsset.name,
        manifestType,
        changeType: "deleted",
        fieldChanges: [],
      });
    } else {
      // Check for modifications
      const fieldChanges = calculateDiff(
        oldAsset as unknown as Record<string, unknown>,
        newAsset as unknown as Record<string, unknown>
      );

      if (fieldChanges.length > 0) {
        changes.push({
          assetId: id,
          assetName: newAsset.name,
          manifestType,
          changeType: "modified",
          fieldChanges,
        });
      }
    }
  }

  // Find added assets
  for (const [id, newAsset] of newMap) {
    if (!oldMap.has(id)) {
      changes.push({
        assetId: id,
        assetName: newAsset.name,
        manifestType,
        changeType: "added",
        fieldChanges: [],
      });
    }
  }

  return changes;
}

/**
 * Calculate total asset count in a manifest collection
 */
function countAssets(manifests: ManifestCollection): number {
  return (
    manifests.items.length +
    manifests.npcs.length +
    manifests.resources.length +
    manifests.stores.length +
    manifests.music.length
  );
}

/**
 * Calculate hash for manifest collection
 */
function hashManifests(manifests: ManifestCollection): string {
  return hashObject({
    items: manifests.items.map((i) => i.id).sort(),
    npcs: manifests.npcs.map((n) => n.id).sort(),
    resources: manifests.resources.map((r) => r.id).sort(),
    stores: manifests.stores.map((s) => s.id).sort(),
    music: manifests.music.map((m) => m.id).sort(),
    fullHash: hashObject(manifests as unknown as Record<string, unknown>),
  });
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Create a new snapshot of the current manifest state
 */
export async function createSnapshot(
  manifests: ManifestCollection,
  description: string = ""
): Promise<Snapshot> {
  const index = await readIndex();
  const snapshotId = generateSnapshotId();
  const timestamp = new Date().toISOString();

  // Calculate changes from previous snapshot
  let changesFromPrevious = 0;
  if (index.currentSnapshotId) {
    const previousSnapshot = await readSnapshot(index.currentSnapshotId);
    if (previousSnapshot) {
      const diff = compareSnapshotsInternal(previousSnapshot.manifests, manifests);
      changesFromPrevious = diff.added + diff.modified + diff.deleted;
    }
  } else {
    // First snapshot - all assets are new
    changesFromPrevious = countAssets(manifests);
  }

  const snapshot: Snapshot = {
    id: snapshotId,
    timestamp,
    description: description || `Snapshot at ${new Date(timestamp).toLocaleString()}`,
    manifests: deepClone(manifests),
    metadata: {
      totalAssets: countAssets(manifests),
      changesFromPrevious,
      hash: hashManifests(manifests),
    },
  };

  // Write the snapshot file
  await writeSnapshot(snapshot);

  // Update the index
  const summary: SnapshotSummary = {
    id: snapshot.id,
    timestamp: snapshot.timestamp,
    description: snapshot.description,
    metadata: snapshot.metadata,
  };

  index.snapshots.unshift(summary); // Newest first
  index.currentSnapshotId = snapshotId;

  // Trim old snapshots if over limit
  if (index.snapshots.length > MAX_SNAPSHOTS) {
    const removed = index.snapshots.splice(MAX_SNAPSHOTS);
    for (const old of removed) {
      await deleteSnapshotFile(old.id);
    }
    log.info("Trimmed old snapshots", { removed: removed.length });
  }

  await writeIndex(index);

  log.info("Created snapshot", {
    snapshotId,
    totalAssets: snapshot.metadata.totalAssets,
    changesFromPrevious,
  });

  return snapshot;
}

/**
 * List all snapshots (summaries only)
 */
export async function listSnapshots(): Promise<SnapshotSummary[]> {
  const index = await readIndex();
  return index.snapshots;
}

/**
 * Get a specific snapshot by ID
 */
export async function getSnapshot(snapshotId: string): Promise<Snapshot | null> {
  return readSnapshot(snapshotId);
}

/**
 * Get the current (latest) snapshot
 */
export async function getCurrentSnapshot(): Promise<Snapshot | null> {
  const index = await readIndex();
  if (!index.currentSnapshotId) {
    return null;
  }
  return readSnapshot(index.currentSnapshotId);
}

/**
 * Internal comparison helper
 */
function compareSnapshotsInternal(
  oldManifests: ManifestCollection,
  newManifests: ManifestCollection
): DiffSummary & { changes: AssetChange[] } {
  const allChanges: AssetChange[] = [];

  // Compare each manifest type
  allChanges.push(
    ...compareManifests(oldManifests.items, newManifests.items, "items")
  );
  allChanges.push(
    ...compareManifests(oldManifests.npcs, newManifests.npcs, "npcs")
  );
  allChanges.push(
    ...compareManifests(oldManifests.resources, newManifests.resources, "resources")
  );
  allChanges.push(
    ...compareManifests(oldManifests.stores, newManifests.stores, "stores")
  );
  allChanges.push(
    ...compareManifests(oldManifests.music, newManifests.music, "music")
  );

  const summary = {
    added: allChanges.filter((c) => c.changeType === "added").length,
    modified: allChanges.filter((c) => c.changeType === "modified").length,
    deleted: allChanges.filter((c) => c.changeType === "deleted").length,
  };

  return { ...summary, changes: allChanges };
}

/**
 * Compare two snapshots and return the diff
 */
export async function compareSnapshots(
  fromSnapshotId: string,
  toSnapshotId: string
): Promise<SnapshotDiff | null> {
  const fromSnapshot = await readSnapshot(fromSnapshotId);
  const toSnapshot = await readSnapshot(toSnapshotId);

  if (!fromSnapshot || !toSnapshot) {
    log.warn("Snapshot not found for comparison", {
      fromSnapshotId,
      toSnapshotId,
      fromFound: !!fromSnapshot,
      toFound: !!toSnapshot,
    });
    return null;
  }

  const result = compareSnapshotsInternal(
    fromSnapshot.manifests,
    toSnapshot.manifests
  );

  return {
    fromSnapshotId,
    toSnapshotId,
    calculatedAt: new Date().toISOString(),
    summary: {
      ...result,
      total: result.added + result.modified + result.deleted,
    },
    changes: result.changes,
  };
}

/**
 * Restore a previous snapshot (returns the manifests to apply)
 */
export async function restoreSnapshot(
  snapshotId: string
): Promise<ManifestCollection | null> {
  const snapshot = await readSnapshot(snapshotId);

  if (!snapshot) {
    log.warn("Snapshot not found for restore", { snapshotId });
    return null;
  }

  // Create a new snapshot marking this as a restore
  const restored = await createSnapshot(
    snapshot.manifests,
    `Restored from snapshot: ${snapshot.description} (${snapshot.id})`
  );

  log.info("Restored snapshot", {
    originalSnapshotId: snapshotId,
    newSnapshotId: restored.id,
  });

  return deepClone(snapshot.manifests);
}

/**
 * Get the change history for a single asset across all snapshots
 */
export async function getAssetHistory(
  assetId: string,
  manifestType?: AssetChange["manifestType"]
): Promise<AssetHistoryEntry[]> {
  const index = await readIndex();
  const history: AssetHistoryEntry[] = [];

  // Process snapshots from newest to oldest
  let previousAsset: Record<string, unknown> | null = null;

  // Reverse to process oldest first for proper diff calculation
  const snapshotsOldestFirst = [...index.snapshots].reverse();

  for (const snapshotSummary of snapshotsOldestFirst) {
    const snapshot = await readSnapshot(snapshotSummary.id);
    if (!snapshot) continue;

    // Find the asset in this snapshot
    let currentAsset: { id: string; name: string } | null = null;

    // Search in all manifest types if not specified
    const typesToSearch: AssetChange["manifestType"][] = manifestType
      ? [manifestType]
      : ["items", "npcs", "resources", "stores", "music"];

    for (const type of typesToSearch) {
      const manifests = snapshot.manifests[type];
      const found = manifests.find((m: { id: string }) => m.id === assetId);
      if (found) {
        currentAsset = found as { id: string; name: string };
        break;
      }
    }

    // Determine change type
    let changeType: AssetHistoryEntry["changeType"];
    let fieldChanges: FieldChange[] = [];

    if (!previousAsset && currentAsset) {
      changeType = "added";
    } else if (previousAsset && !currentAsset) {
      changeType = "deleted";
    } else if (previousAsset && currentAsset) {
      fieldChanges = calculateDiff(
        previousAsset,
        currentAsset as unknown as Record<string, unknown>
      );
      changeType = fieldChanges.length > 0 ? "modified" : "unchanged";
    } else {
      // Asset doesn't exist in either snapshot
      continue;
    }

    history.push({
      snapshotId: snapshotSummary.id,
      timestamp: snapshotSummary.timestamp,
      description: snapshotSummary.description,
      changeType,
      fieldChanges,
    });

    previousAsset = currentAsset as unknown as Record<string, unknown>;
  }

  // Return in reverse chronological order (newest first)
  return history.reverse();
}

/**
 * Delete a snapshot
 */
export async function deleteSnapshot(snapshotId: string): Promise<boolean> {
  const index = await readIndex();

  const snapshotIndex = index.snapshots.findIndex((s) => s.id === snapshotId);
  if (snapshotIndex === -1) {
    log.warn("Snapshot not found for deletion", { snapshotId });
    return false;
  }

  // Remove from index
  index.snapshots.splice(snapshotIndex, 1);

  // Update current snapshot ID if needed
  if (index.currentSnapshotId === snapshotId) {
    index.currentSnapshotId = index.snapshots[0]?.id || null;
  }

  await writeIndex(index);
  await deleteSnapshotFile(snapshotId);

  log.info("Deleted snapshot", { snapshotId });
  return true;
}

/**
 * Get versions directory path
 */
export function getVersionsDirectory(): string {
  return VERSIONS_DIR;
}

/**
 * Check if version control is initialized (has any snapshots)
 */
export async function isInitialized(): Promise<boolean> {
  const index = await readIndex();
  return index.snapshots.length > 0;
}

/**
 * Get statistics about version control
 */
export async function getVersionControlStats(): Promise<{
  initialized: boolean;
  snapshotCount: number;
  currentSnapshotId: string | null;
  oldestSnapshot: SnapshotSummary | null;
  newestSnapshot: SnapshotSummary | null;
  versionsDirectory: string;
}> {
  const index = await readIndex();

  return {
    initialized: index.snapshots.length > 0,
    snapshotCount: index.snapshots.length,
    currentSnapshotId: index.currentSnapshotId,
    oldestSnapshot: index.snapshots[index.snapshots.length - 1] || null,
    newestSnapshot: index.snapshots[0] || null,
    versionsDirectory: VERSIONS_DIR,
  };
}
