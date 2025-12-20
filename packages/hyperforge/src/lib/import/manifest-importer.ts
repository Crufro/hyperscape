/**
 * Manifest Importer
 *
 * High-level service for importing game manifest data into HyperForge.
 * Handles reading manifests, syncing to registry, and merging without duplicates.
 */

import { promises as fs } from "fs";
import path from "path";
import { logger } from "@/lib/utils";
import {
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
import type { RegistryAsset } from "@/lib/assets/registry";
import type { AssetCategory } from "@/types/core";

const log = logger.child("ManifestImporter");

// =============================================================================
// CONFIGURATION
// =============================================================================

const MANIFESTS_DIR =
  process.env["HYPERSCAPE_MANIFESTS_DIR"] ||
  path.resolve(process.cwd(), "..", "server", "world", "assets", "manifests");

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type ManifestType = "items" | "npcs" | "resources" | "stores" | "music";

/**
 * Import status for tracking what happened during import
 */
export interface ImportStatus {
  added: string[];
  updated: string[];
  skipped: string[];
  failed: Array<{ id: string; error: string }>;
}

/**
 * Full import result
 */
export interface ManifestImportResult {
  success: boolean;
  manifestType: ManifestType;
  status: ImportStatus;
  timestamp: Date;
}

/**
 * Overall import summary
 */
export interface ImportSummary {
  success: boolean;
  results: ManifestImportResult[];
  totals: {
    added: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  timestamp: Date;
}

/**
 * Asset comparison for detecting existing assets
 */
export interface AssetComparison {
  id: string;
  name: string;
  category: string;
  manifestType: ManifestType;
  existsInForge: boolean;
  existsInGame: boolean;
  isModified: boolean;
  gameAsset?: ParsedGameAsset | undefined;
  forgeAsset?: RegistryAsset | undefined;
}

/**
 * Diff result between manifests and HyperForge
 */
export interface ManifestDiff {
  manifestType: ManifestType;
  newAssets: AssetComparison[];
  modifiedAssets: AssetComparison[];
  deletedAssets: AssetComparison[];
  unchangedAssets: AssetComparison[];
  summary: {
    new: number;
    modified: number;
    deleted: number;
    unchanged: number;
  };
}

/**
 * Full diff across all manifests
 */
export interface FullManifestDiff {
  manifests: ManifestDiff[];
  totals: {
    new: number;
    modified: number;
    deleted: number;
    unchanged: number;
  };
  timestamp: Date;
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

/**
 * Check if manifests directory exists
 */
export async function manifestsDirExists(): Promise<boolean> {
  try {
    await fs.access(MANIFESTS_DIR);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the manifests directory path
 */
export function getManifestsPath(): string {
  return MANIFESTS_DIR;
}

// =============================================================================
// INDIVIDUAL MANIFEST IMPORTERS
// =============================================================================

/**
 * Import items from items.json manifest
 */
export async function importItems(
  forgeAssets: RegistryAsset[],
): Promise<ManifestImportResult> {
  log.info("Importing items from manifest");

  const items = await readManifestFile<ItemDefinition[]>("items.json");
  if (!items) {
    return {
      success: false,
      manifestType: "items",
      status: { added: [], updated: [], skipped: [], failed: [{ id: "items.json", error: "Failed to read file" }] },
      timestamp: new Date(),
    };
  }

  const parsed = parseItemsManifest(items);
  return processImport("items", parsed, forgeAssets);
}

/**
 * Import NPCs from npcs.json manifest
 */
export async function importNpcs(
  forgeAssets: RegistryAsset[],
): Promise<ManifestImportResult> {
  log.info("Importing NPCs from manifest");

  const npcs = await readManifestFile<NpcDefinition[]>("npcs.json");
  if (!npcs) {
    return {
      success: false,
      manifestType: "npcs",
      status: { added: [], updated: [], skipped: [], failed: [{ id: "npcs.json", error: "Failed to read file" }] },
      timestamp: new Date(),
    };
  }

  const parsed = parseNPCsManifest(npcs);
  return processImport("npcs", parsed, forgeAssets);
}

/**
 * Import resources from resources.json manifest
 */
export async function importResources(
  forgeAssets: RegistryAsset[],
): Promise<ManifestImportResult> {
  log.info("Importing resources from manifest");

  const resources = await readManifestFile<ResourceDefinition[]>("resources.json");
  if (!resources) {
    return {
      success: false,
      manifestType: "resources",
      status: { added: [], updated: [], skipped: [], failed: [{ id: "resources.json", error: "Failed to read file" }] },
      timestamp: new Date(),
    };
  }

  const parsed = parseResourcesManifest(resources);
  return processImport("resources", parsed, forgeAssets);
}

/**
 * Import stores from stores.json manifest
 */
export async function importStores(
  forgeAssets: RegistryAsset[],
): Promise<ManifestImportResult> {
  log.info("Importing stores from manifest");

  const stores = await readManifestFile<StoreDefinition[]>("stores.json");
  if (!stores) {
    return {
      success: false,
      manifestType: "stores",
      status: { added: [], updated: [], skipped: [], failed: [{ id: "stores.json", error: "Failed to read file" }] },
      timestamp: new Date(),
    };
  }

  const parsed = parseStoresManifest(stores);
  return processImport("stores", parsed, forgeAssets);
}

/**
 * Import music from music.json manifest
 */
export async function importMusic(
  forgeAssets: RegistryAsset[],
): Promise<ManifestImportResult> {
  log.info("Importing music from manifest");

  const music = await readManifestFile<MusicTrack[]>("music.json");
  if (!music) {
    return {
      success: false,
      manifestType: "music",
      status: { added: [], updated: [], skipped: [], failed: [{ id: "music.json", error: "Failed to read file" }] },
      timestamp: new Date(),
    };
  }

  const parsed = parseMusicManifest(music);
  return processImport("music", parsed, forgeAssets);
}

// =============================================================================
// CORE IMPORT LOGIC
// =============================================================================

/**
 * Process import for a single manifest type
 */
function processImport(
  manifestType: ManifestType,
  parsedAssets: ParsedGameAsset[],
  forgeAssets: RegistryAsset[],
): ManifestImportResult {
  const status: ImportStatus = {
    added: [],
    updated: [],
    skipped: [],
    failed: [],
  };

  const forgeAssetMap = new Map(forgeAssets.map((a) => [a.id, a]));

  for (const parsed of parsedAssets) {
    const id = parsed.asset.id;
    const existing = forgeAssetMap.get(id);

    try {
      if (!existing) {
        // New asset - would be added to registry
        status.added.push(id);
      } else if (hasAssetChanged(parsed, existing)) {
        // Modified asset - would be updated
        status.updated.push(id);
      } else {
        // No changes
        status.skipped.push(id);
      }
    } catch (error) {
      status.failed.push({
        id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  log.info(`Processed ${manifestType} import`, {
    added: status.added.length,
    updated: status.updated.length,
    skipped: status.skipped.length,
    failed: status.failed.length,
  });

  return {
    success: status.failed.length === 0,
    manifestType,
    status,
    timestamp: new Date(),
  };
}

/**
 * Check if a game asset differs from its forge counterpart
 */
function hasAssetChanged(
  gameAsset: ParsedGameAsset,
  forgeAsset: RegistryAsset,
): boolean {
  // Compare key fields
  if (gameAsset.asset.name !== forgeAsset.name) return true;
  const forgeDescription = forgeAsset.metadata?.["description"] as string | undefined;
  if (gameAsset.asset.description !== forgeDescription) return true;
  if (gameAsset.asset.modelPath !== forgeAsset.url && gameAsset.asset.modelPath !== forgeAsset.path) return true;

  return false;
}

// =============================================================================
// BATCH IMPORT
// =============================================================================

/**
 * Import all manifests at once
 */
export async function importFromManifests(
  forgeAssets: RegistryAsset[],
): Promise<ImportSummary> {
  log.info("Importing all manifests");

  const exists = await manifestsDirExists();
  if (!exists) {
    log.error("Manifests directory not found", { dir: MANIFESTS_DIR });
    return {
      success: false,
      results: [],
      totals: { added: 0, updated: 0, skipped: 0, failed: 1 },
      timestamp: new Date(),
    };
  }

  // Import all manifests in parallel
  const results = await Promise.all([
    importItems(forgeAssets),
    importNpcs(forgeAssets),
    importResources(forgeAssets),
    importStores(forgeAssets),
    importMusic(forgeAssets),
  ]);

  // Calculate totals
  const totals = {
    added: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  for (const result of results) {
    totals.added += result.status.added.length;
    totals.updated += result.status.updated.length;
    totals.skipped += result.status.skipped.length;
    totals.failed += result.status.failed.length;
  }

  const success = results.every((r) => r.success);

  log.info("All manifests imported", { totals, success });

  return {
    success,
    results,
    totals,
    timestamp: new Date(),
  };
}

// =============================================================================
// DIFF DETECTION
// =============================================================================

/**
 * Get diff between a single manifest and HyperForge assets
 */
export async function getManifestDiff(
  manifestType: ManifestType,
  forgeAssets: RegistryAsset[],
): Promise<ManifestDiff> {
  let parsed: ParsedGameAsset[] = [];

  switch (manifestType) {
    case "items": {
      const items = await readManifestFile<ItemDefinition[]>("items.json");
      parsed = items ? parseItemsManifest(items) : [];
      break;
    }
    case "npcs": {
      const npcs = await readManifestFile<NpcDefinition[]>("npcs.json");
      parsed = npcs ? parseNPCsManifest(npcs) : [];
      break;
    }
    case "resources": {
      const resources = await readManifestFile<ResourceDefinition[]>("resources.json");
      parsed = resources ? parseResourcesManifest(resources) : [];
      break;
    }
    case "stores": {
      const stores = await readManifestFile<StoreDefinition[]>("stores.json");
      parsed = stores ? parseStoresManifest(stores) : [];
      break;
    }
    case "music": {
      const music = await readManifestFile<MusicTrack[]>("music.json");
      parsed = music ? parseMusicManifest(music) : [];
      break;
    }
  }

  // Filter forge assets by category relevant to this manifest type
  const relevantForgeAssets = forgeAssets.filter((a) =>
    isAssetRelevantToManifest(a, manifestType),
  );

  const forgeAssetMap = new Map(relevantForgeAssets.map((a) => [a.id, a]));
  const gameAssetIds = new Set(parsed.map((p) => p.asset.id));

  const newAssets: AssetComparison[] = [];
  const modifiedAssets: AssetComparison[] = [];
  const unchangedAssets: AssetComparison[] = [];
  const deletedAssets: AssetComparison[] = [];

  // Check game assets
  for (const gameAsset of parsed) {
    const forgeAsset = forgeAssetMap.get(gameAsset.asset.id);
    const comparison: AssetComparison = {
      id: gameAsset.asset.id,
      name: gameAsset.asset.name,
      category: gameAsset.asset.category as string,
      manifestType,
      existsInForge: Boolean(forgeAsset),
      existsInGame: true,
      isModified: forgeAsset ? hasAssetChanged(gameAsset, forgeAsset) : false,
      gameAsset,
      forgeAsset: forgeAsset ?? undefined,
    };

    if (!forgeAsset) {
      newAssets.push(comparison);
    } else if (comparison.isModified) {
      modifiedAssets.push(comparison);
    } else {
      unchangedAssets.push(comparison);
    }
  }

  // Check for deleted assets (in forge but not in game)
  for (const forgeAsset of relevantForgeAssets) {
    if (!gameAssetIds.has(forgeAsset.id)) {
      deletedAssets.push({
        id: forgeAsset.id,
        name: forgeAsset.name,
        category: forgeAsset.category as string,
        manifestType,
        existsInForge: true,
        existsInGame: false,
        isModified: false,
        forgeAsset,
        gameAsset: undefined,
      });
    }
  }

  return {
    manifestType,
    newAssets,
    modifiedAssets,
    deletedAssets,
    unchangedAssets,
    summary: {
      new: newAssets.length,
      modified: modifiedAssets.length,
      deleted: deletedAssets.length,
      unchanged: unchangedAssets.length,
    },
  };
}

/**
 * Check if a forge asset is relevant to a manifest type
 */
function isAssetRelevantToManifest(
  asset: RegistryAsset,
  manifestType: ManifestType,
): boolean {
  switch (manifestType) {
    case "items":
      return ["weapon", "armor", "tool", "item", "prop"].includes(asset.category);
    case "npcs":
      return ["npc", "mob", "character"].includes(asset.category);
    case "resources":
      return asset.category === "item" && asset.metadata?.["type"] === "resource";
    case "stores":
      return asset.category === "building";
    case "music":
      return asset.type === "audio" && asset.category === "music";
    default:
      return false;
  }
}

/**
 * Get full diff across all manifests
 */
export async function getFullManifestDiff(
  forgeAssets: RegistryAsset[],
): Promise<FullManifestDiff> {
  log.info("Calculating full manifest diff");

  const manifestTypes: ManifestType[] = ["items", "npcs", "resources", "stores", "music"];

  const manifests = await Promise.all(
    manifestTypes.map((type) => getManifestDiff(type, forgeAssets)),
  );

  const totals = {
    new: 0,
    modified: 0,
    deleted: 0,
    unchanged: 0,
  };

  for (const manifest of manifests) {
    totals.new += manifest.summary.new;
    totals.modified += manifest.summary.modified;
    totals.deleted += manifest.summary.deleted;
    totals.unchanged += manifest.summary.unchanged;
  }

  log.info("Full diff calculated", { totals });

  return {
    manifests,
    totals,
    timestamp: new Date(),
  };
}

// =============================================================================
// SYNC OPERATIONS
// =============================================================================

/**
 * Sync from game manifests to HyperForge
 * This imports all new and modified assets
 */
export async function syncFromGame(
  forgeAssets: RegistryAsset[],
): Promise<ImportSummary> {
  log.info("Syncing from game manifests");
  return importFromManifests(forgeAssets);
}

/**
 * Get raw manifest data for a specific type
 */
export async function getRawManifest(
  manifestType: ManifestType,
): Promise<unknown | null> {
  switch (manifestType) {
    case "items":
      return readManifestFile<ItemDefinition[]>("items.json");
    case "npcs":
      return readManifestFile<NpcDefinition[]>("npcs.json");
    case "resources":
      return readManifestFile<ResourceDefinition[]>("resources.json");
    case "stores":
      return readManifestFile<StoreDefinition[]>("stores.json");
    case "music":
      return readManifestFile<MusicTrack[]>("music.json");
    default:
      return null;
  }
}

/**
 * Get all raw manifests
 */
export async function getAllRawManifests(): Promise<{
  items: ItemDefinition[] | null;
  npcs: NpcDefinition[] | null;
  resources: ResourceDefinition[] | null;
  stores: StoreDefinition[] | null;
  music: MusicTrack[] | null;
}> {
  const [items, npcs, resources, stores, music] = await Promise.all([
    readManifestFile<ItemDefinition[]>("items.json"),
    readManifestFile<NpcDefinition[]>("npcs.json"),
    readManifestFile<ResourceDefinition[]>("resources.json"),
    readManifestFile<StoreDefinition[]>("stores.json"),
    readManifestFile<MusicTrack[]>("music.json"),
  ]);

  return { items, npcs, resources, stores, music };
}

/**
 * Get parsed manifests with asset conversion
 */
export async function getParsedManifests(): Promise<ParsedManifests | null> {
  const raw = await getAllRawManifests();

  if (!raw.items && !raw.npcs && !raw.resources && !raw.stores && !raw.music) {
    return null;
  }

  const items = raw.items ? parseItemsManifest(raw.items) : [];
  const npcs = raw.npcs ? parseNPCsManifest(raw.npcs) : [];
  const resources = raw.resources ? parseResourcesManifest(raw.resources) : [];
  const stores = raw.stores ? parseStoresManifest(raw.stores) : [];
  const music = raw.music ? parseMusicManifest(raw.music) : [];

  return {
    items,
    npcs,
    resources,
    stores,
    music,
    totalCount: items.length + npcs.length + resources.length + stores.length + music.length,
    parsedAt: new Date(),
  };
}
