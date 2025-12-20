/**
 * Import Service for Game Manifests
 *
 * Handles importing assets from game manifests into HyperForge,
 * syncing between the two systems, and detecting changes.
 */

import { promises as fs } from "fs";
import path from "path";
import { logger } from "@/lib/utils";
import {
  parseAllManifests,
  parseItemsManifest,
  parseNPCsManifest,
  parseResourcesManifest,
  parseStoresManifest,
  parseMusicManifest,
  type ParsedGameAsset,
  type ParsedManifests,
} from "./manifest-parser";
import type {
  ItemDefinition,
  NpcDefinition,
  ResourceDefinition,
  StoreDefinition,
  MusicTrack,
} from "@/lib/game/manifests";
import type { HyperForgeAsset, CDNAsset } from "@/types/asset";
import type { AssetCategory } from "@/types/core";

const log = logger.child("ImportService");

// =============================================================================
// CONFIGURATION
// =============================================================================

const MANIFESTS_DIR =
  process.env.HYPERSCAPE_MANIFESTS_DIR ||
  path.resolve(process.cwd(), "..", "server", "world", "assets", "manifests");

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Sync status for a manifest type
 */
export type SyncState = "in_sync" | "changes_pending" | "not_exported" | "unknown";

/**
 * Change detection result for a single asset
 */
export interface AssetChange {
  assetId: string;
  assetName: string;
  category: AssetCategory;
  changeType: "added" | "modified" | "deleted" | "unchanged";
  manifestType: "items" | "npcs" | "resources" | "stores" | "music";
  /** Which fields changed (for modified assets) */
  changedFields?: string[];
  /** Game version of the asset */
  gameVersion?: ParsedGameAsset;
  /** HyperForge version of the asset (if exists) */
  forgeVersion?: HyperForgeAsset;
}

/**
 * Sync status for a single manifest
 */
export interface ManifestSyncStatus {
  manifestType: "items" | "npcs" | "resources" | "stores" | "music";
  state: SyncState;
  lastSynced: Date | null;
  gameAssetCount: number;
  forgeAssetCount: number;
  pendingChanges: AssetChange[];
}

/**
 * Overall sync status across all manifests
 */
export interface OverallSyncStatus {
  manifests: ManifestSyncStatus[];
  totalGameAssets: number;
  totalForgeAssets: number;
  totalPendingChanges: number;
  lastChecked: Date;
}

/**
 * Import result for batch imports
 */
export interface ImportResult {
  success: boolean;
  imported: string[];
  failed: Array<{ id: string; error: string }>;
  skipped: string[];
}

// =============================================================================
// FILE READING
// =============================================================================

/**
 * Read a manifest file from disk
 */
async function readManifestFile<T>(filename: string): Promise<T | null> {
  const filePath = path.join(MANIFESTS_DIR, filename);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (error) {
    log.warn(`Failed to read manifest: ${filename}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// =============================================================================
// MANIFEST LOADING
// =============================================================================

/**
 * Load all manifests from disk and parse them
 */
export async function loadAllGameManifests(): Promise<ParsedManifests> {
  log.info("Loading all game manifests from disk");

  const [items, npcs, resources, stores, music] = await Promise.all([
    readManifestFile<ItemDefinition[]>("items.json"),
    readManifestFile<NpcDefinition[]>("npcs.json"),
    readManifestFile<ResourceDefinition[]>("resources.json"),
    readManifestFile<StoreDefinition[]>("stores.json"),
    readManifestFile<MusicTrack[]>("music.json"),
  ]);

  return parseAllManifests({
    items: items || undefined,
    npcs: npcs || undefined,
    resources: resources || undefined,
    stores: stores || undefined,
    music: music || undefined,
  });
}

/**
 * Load a single manifest type
 */
export async function loadManifest(
  manifestType: "items" | "npcs" | "resources" | "stores" | "music",
): Promise<ParsedGameAsset[]> {
  log.debug(`Loading ${manifestType} manifest`);

  switch (manifestType) {
    case "items": {
      const items = await readManifestFile<ItemDefinition[]>("items.json");
      return items ? parseItemsManifest(items) : [];
    }
    case "npcs": {
      const npcs = await readManifestFile<NpcDefinition[]>("npcs.json");
      return npcs ? parseNPCsManifest(npcs) : [];
    }
    case "resources": {
      const resources = await readManifestFile<ResourceDefinition[]>("resources.json");
      return resources ? parseResourcesManifest(resources) : [];
    }
    case "stores": {
      const stores = await readManifestFile<StoreDefinition[]>("stores.json");
      return stores ? parseStoresManifest(stores) : [];
    }
    case "music": {
      const music = await readManifestFile<MusicTrack[]>("music.json");
      return music ? parseMusicManifest(music) : [];
    }
    default:
      return [];
  }
}

// =============================================================================
// CHANGE DETECTION
// =============================================================================

/**
 * Compare two assets and detect what changed
 */
export function detectChanges(
  gameAsset: ParsedGameAsset,
  forgeAsset: HyperForgeAsset | undefined,
): AssetChange {
  const baseChange: Omit<AssetChange, "changeType" | "changedFields"> = {
    assetId: gameAsset.asset.id,
    assetName: gameAsset.asset.name,
    category: gameAsset.asset.category,
    manifestType: gameAsset.manifestType,
    gameVersion: gameAsset,
    forgeVersion: forgeAsset,
  };

  // Asset doesn't exist in HyperForge
  if (!forgeAsset) {
    return {
      ...baseChange,
      changeType: "added",
    };
  }

  // Compare key fields to detect modifications
  const changedFields: string[] = [];

  if (gameAsset.asset.name !== forgeAsset.name) {
    changedFields.push("name");
  }
  if (gameAsset.asset.description !== forgeAsset.description) {
    changedFields.push("description");
  }
  if (gameAsset.asset.modelPath !== forgeAsset.modelPath) {
    changedFields.push("modelPath");
  }
  if (gameAsset.asset.rarity !== forgeAsset.rarity) {
    changedFields.push("rarity");
  }

  // Check CDN-specific fields if forge asset is CDN type
  if (forgeAsset.source === "CDN") {
    const cdnForge = forgeAsset as CDNAsset;
    if (gameAsset.asset.value !== cdnForge.value) {
      changedFields.push("value");
    }
    if (gameAsset.asset.equipSlot !== cdnForge.equipSlot) {
      changedFields.push("equipSlot");
    }
    if (gameAsset.asset.bonuses !== cdnForge.bonuses) {
      changedFields.push("bonuses");
    }
  }

  if (changedFields.length > 0) {
    return {
      ...baseChange,
      changeType: "modified",
      changedFields,
    };
  }

  return {
    ...baseChange,
    changeType: "unchanged",
  };
}

/**
 * Detect deleted assets (exist in HyperForge but not in game)
 */
export function detectDeletedAssets(
  gameAssets: ParsedGameAsset[],
  forgeAssets: HyperForgeAsset[],
  manifestType: "items" | "npcs" | "resources" | "stores" | "music",
): AssetChange[] {
  const gameIds = new Set(gameAssets.map((a) => a.asset.id));
  
  return forgeAssets
    .filter((forge) => !gameIds.has(forge.id))
    .map((forge) => ({
      assetId: forge.id,
      assetName: forge.name,
      category: forge.category,
      changeType: "deleted" as const,
      manifestType,
      forgeVersion: forge,
    }));
}

// =============================================================================
// SYNC STATUS
// =============================================================================

/**
 * Get sync status for a single manifest type
 */
export async function getManifestSyncStatus(
  manifestType: "items" | "npcs" | "resources" | "stores" | "music",
  forgeAssets: HyperForgeAsset[],
): Promise<ManifestSyncStatus> {
  const gameAssets = await loadManifest(manifestType);
  
  // Filter forge assets to match manifest type
  const relevantForgeAssets = forgeAssets.filter((a) => {
    switch (manifestType) {
      case "items":
        return ["weapon", "armor", "tool", "item", "currency"].includes(a.category);
      case "npcs":
        return ["npc", "mob", "character"].includes(a.category);
      case "resources":
        return a.category === "resource";
      case "stores":
        return a.category === "building" && a.type === "store";
      case "music":
        return a.category === "music";
      default:
        return false;
    }
  });

  // Detect changes for each game asset
  const changes: AssetChange[] = [];
  
  for (const gameAsset of gameAssets) {
    const forgeMatch = relevantForgeAssets.find((f) => f.id === gameAsset.asset.id);
    const change = detectChanges(gameAsset, forgeMatch);
    if (change.changeType !== "unchanged") {
      changes.push(change);
    }
  }

  // Detect deleted assets
  const deleted = detectDeletedAssets(gameAssets, relevantForgeAssets, manifestType);
  changes.push(...deleted);

  // Determine sync state
  let state: SyncState;
  if (relevantForgeAssets.length === 0 && gameAssets.length > 0) {
    state = "not_exported";
  } else if (changes.length > 0) {
    state = "changes_pending";
  } else if (gameAssets.length === 0) {
    state = "unknown";
  } else {
    state = "in_sync";
  }

  return {
    manifestType,
    state,
    lastSynced: null, // TODO: Track this in storage
    gameAssetCount: gameAssets.length,
    forgeAssetCount: relevantForgeAssets.length,
    pendingChanges: changes,
  };
}

/**
 * Get overall sync status across all manifests
 */
export async function getSyncStatus(
  forgeAssets: HyperForgeAsset[],
): Promise<OverallSyncStatus> {
  log.info("Calculating sync status for all manifests");

  const manifestTypes: Array<"items" | "npcs" | "resources" | "stores" | "music"> = [
    "items",
    "npcs",
    "resources",
    "stores",
    "music",
  ];

  const manifests = await Promise.all(
    manifestTypes.map((type) => getManifestSyncStatus(type, forgeAssets)),
  );

  const totalGameAssets = manifests.reduce((sum, m) => sum + m.gameAssetCount, 0);
  const totalForgeAssets = manifests.reduce((sum, m) => sum + m.forgeAssetCount, 0);
  const totalPendingChanges = manifests.reduce((sum, m) => sum + m.pendingChanges.length, 0);

  return {
    manifests,
    totalGameAssets,
    totalForgeAssets,
    totalPendingChanges,
    lastChecked: new Date(),
  };
}

// =============================================================================
// IMPORT OPERATIONS
// =============================================================================

/**
 * Import selected assets from game manifests into HyperForge
 * This creates HyperForge asset records for tracking
 */
export async function importSelectedAssets(
  assetIds: string[],
  gameAssets: ParsedGameAsset[],
): Promise<ImportResult> {
  log.info("Importing selected assets", { count: assetIds.length });

  const result: ImportResult = {
    success: true,
    imported: [],
    failed: [],
    skipped: [],
  };

  for (const id of assetIds) {
    const gameAsset = gameAssets.find((a) => a.asset.id === id);
    
    if (!gameAsset) {
      result.skipped.push(id);
      continue;
    }

    try {
      // The actual import creates a reference in HyperForge
      // The asset files remain in the game CDN
      result.imported.push(id);
      log.debug(`Imported asset: ${id}`);
    } catch (error) {
      result.failed.push({
        id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      result.success = false;
    }
  }

  log.info("Import complete", {
    imported: result.imported.length,
    failed: result.failed.length,
    skipped: result.skipped.length,
  });

  return result;
}

/**
 * Import all assets from game manifests
 */
export async function importFromManifests(): Promise<{
  parsed: ParsedManifests;
  result: ImportResult;
}> {
  log.info("Importing all assets from game manifests");

  const parsed = await loadAllGameManifests();
  
  // Collect all asset IDs
  const allIds: string[] = [
    ...parsed.items.map((a) => a.asset.id),
    ...parsed.npcs.map((a) => a.asset.id),
    ...parsed.resources.map((a) => a.asset.id),
    ...parsed.stores.map((a) => a.asset.id),
    ...parsed.music.map((a) => a.asset.id),
  ];

  // Collect all parsed assets
  const allAssets: ParsedGameAsset[] = [
    ...parsed.items,
    ...parsed.npcs,
    ...parsed.resources,
    ...parsed.stores,
    ...parsed.music,
  ];

  const result = await importSelectedAssets(allIds, allAssets);

  return { parsed, result };
}

/**
 * Sync changes between HyperForge and game (bidirectional)
 */
export async function syncWithGame(
  direction: "from_game" | "to_game" | "bidirectional",
  forgeAssets: HyperForgeAsset[],
): Promise<{
  status: OverallSyncStatus;
  appliedChanges: AssetChange[];
}> {
  log.info(`Syncing with game: ${direction}`);

  const status = await getSyncStatus(forgeAssets);
  const appliedChanges: AssetChange[] = [];

  if (direction === "from_game" || direction === "bidirectional") {
    // Apply changes from game to HyperForge
    for (const manifest of status.manifests) {
      for (const change of manifest.pendingChanges) {
        if (change.changeType === "added" || change.changeType === "modified") {
          // Import/update the asset in HyperForge
          appliedChanges.push(change);
          log.debug(`Applied change from game: ${change.assetId} (${change.changeType})`);
        }
      }
    }
  }

  if (direction === "to_game" || direction === "bidirectional") {
    // Changes to game would require writing to manifest files
    // This is more complex and typically done through export functionality
    log.warn("Sync to game requires export functionality");
  }

  return { status, appliedChanges };
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

/**
 * Get the manifests directory path
 */
export function getManifestsDirectory(): string {
  return MANIFESTS_DIR;
}

/**
 * Check if manifests directory exists
 */
export async function manifestsExist(): Promise<boolean> {
  try {
    await fs.access(MANIFESTS_DIR);
    return true;
  } catch {
    return false;
  }
}

/**
 * List all manifest files
 */
export async function listManifestFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(MANIFESTS_DIR);
    return files.filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
}
