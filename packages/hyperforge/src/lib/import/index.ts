/**
 * Import Module
 *
 * Exports all import-related functionality for game manifest integration.
 */

// Manifest Parser
export {
  parseItemsManifest,
  parseNPCsManifest,
  parseResourcesManifest,
  parseStoresManifest,
  parseMusicManifest,
  parseAllManifests,
  getAssetId,
  hasValidModel,
  getAssetsNeedingModels,
  getCompleteAssets,
  toHyperForgeAsset,
  getStoreItems,
  type ParsedGameAsset,
  type ParsedManifests,
} from "./manifest-parser";

// Import Service
export {
  loadAllGameManifests,
  loadManifest,
  detectChanges,
  detectDeletedAssets,
  getManifestSyncStatus,
  getSyncStatus,
  importSelectedAssets,
  importFromManifests,
  syncWithGame,
  getManifestsDirectory,
  manifestsExist,
  listManifestFiles,
  type SyncState,
  type AssetChange,
  type ManifestSyncStatus,
  type OverallSyncStatus,
  type ImportResult,
} from "./import-service";

// Manifest Importer
export {
  importItems,
  importNpcs,
  importResources,
  importStores,
  importMusic,
  importFromManifests as importAllManifests,
  getManifestDiff,
  getFullManifestDiff,
  syncFromGame,
  manifestsDirExists,
  getManifestsPath,
  getRawManifest,
  getAllRawManifests,
  getParsedManifests,
  type ManifestType,
  type ImportStatus,
  type ManifestImportResult,
  type ImportSummary,
  type AssetComparison,
  type ManifestDiff,
  type FullManifestDiff,
} from "./manifest-importer";
