/**
 * Import API Endpoint
 *
 * Handles importing assets from game manifests into HyperForge.
 *
 * GET /api/import - Get all assets from game manifests
 * POST /api/import - Import selected assets into HyperForge
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils";
import {
  loadAllGameManifests,
  importSelectedAssets,
  manifestsExist,
  getManifestsDirectory,
  type ParsedGameAsset,
} from "@/lib/import";

const log = logger.child("API:import");

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface GameAssetResponse {
  id: string;
  name: string;
  category: string;
  description?: string;
  manifestType: "items" | "npcs" | "resources" | "stores" | "music";
  hasModel: boolean;
  modelPath?: string;
  thumbnailPath?: string;
}

interface ManifestsResponse {
  items: GameAssetResponse[];
  npcs: GameAssetResponse[];
  resources: GameAssetResponse[];
  stores: GameAssetResponse[];
  music: GameAssetResponse[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert parsed game asset to API response format
 */
function toResponseAsset(parsed: ParsedGameAsset): GameAssetResponse {
  const hasModel =
    Boolean(parsed.asset.modelPath) &&
    parsed.asset.modelPath !== "" &&
    parsed.asset.modelPath !== "null";

  return {
    id: parsed.asset.id,
    name: parsed.asset.name,
    category: parsed.asset.category,
    description: parsed.asset.description,
    manifestType: parsed.manifestType,
    hasModel,
    modelPath: parsed.asset.modelPath,
    thumbnailPath: parsed.asset.thumbnailPath,
  };
}

// =============================================================================
// GET - Fetch all game manifest assets
// =============================================================================

export async function GET(_request: NextRequest) {
  try {
    log.info("Fetching game manifest assets");

    // Check if manifests directory exists
    const exists = await manifestsExist();
    if (!exists) {
      const dir = getManifestsDirectory();
      log.warn("Manifests directory not found", { dir });
      return NextResponse.json(
        {
          error: "Manifests directory not found",
          directory: dir,
          suggestion: "Ensure the game server package is present",
        },
        { status: 404 },
      );
    }

    // Load all manifests
    const parsed = await loadAllGameManifests();

    // Convert to response format
    const manifests: ManifestsResponse = {
      items: parsed.items.map(toResponseAsset),
      npcs: parsed.npcs.map(toResponseAsset),
      resources: parsed.resources.map(toResponseAsset),
      stores: parsed.stores.map(toResponseAsset),
      music: parsed.music.map(toResponseAsset),
    };

    // Calculate counts
    const counts = {
      items: manifests.items.length,
      npcs: manifests.npcs.length,
      resources: manifests.resources.length,
      stores: manifests.stores.length,
      music: manifests.music.length,
      total: parsed.totalCount,
    };

    // Count assets with models
    const withModels = {
      items: manifests.items.filter((a) => a.hasModel).length,
      npcs: manifests.npcs.filter((a) => a.hasModel).length,
      resources: manifests.resources.filter((a) => a.hasModel).length,
      total:
        manifests.items.filter((a) => a.hasModel).length +
        manifests.npcs.filter((a) => a.hasModel).length +
        manifests.resources.filter((a) => a.hasModel).length,
    };

    log.info("Game manifests loaded", {
      counts,
      withModels: withModels.total,
    });

    return NextResponse.json({
      success: true,
      manifests,
      counts,
      withModels,
      parsedAt: parsed.parsedAt.toISOString(),
    });
  } catch (error) {
    log.error("Failed to fetch game manifests", { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch manifests",
      },
      { status: 500 },
    );
  }
}

// =============================================================================
// POST - Import selected assets
// =============================================================================

interface ImportRequest {
  assetIds: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ImportRequest;
    const { assetIds } = body;

    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json(
        { error: "assetIds array is required" },
        { status: 400 },
      );
    }

    log.info("Importing assets from game", { count: assetIds.length });

    // Load all manifests to get asset data
    const parsed = await loadAllGameManifests();
    const allAssets: ParsedGameAsset[] = [
      ...parsed.items,
      ...parsed.npcs,
      ...parsed.resources,
      ...parsed.stores,
      ...parsed.music,
    ];

    // Import selected assets
    const result = await importSelectedAssets(assetIds, allAssets);

    log.info("Import complete", {
      imported: result.imported.length,
      failed: result.failed.length,
      skipped: result.skipped.length,
    });

    return NextResponse.json({
      success: result.success,
      imported: result.imported,
      failed: result.failed,
      skipped: result.skipped,
      summary: {
        requested: assetIds.length,
        imported: result.imported.length,
        failed: result.failed.length,
        skipped: result.skipped.length,
      },
    });
  } catch (error) {
    log.error("Failed to import assets", { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to import assets",
      },
      { status: 500 },
    );
  }
}
