/**
 * Manifest Import API Endpoint
 *
 * Handles reading game manifests and syncing with HyperForge.
 *
 * GET /api/import/manifests - Get current manifest state and diff
 * POST /api/import/manifests - Import/sync manifests into HyperForge
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils";
import {
  manifestsDirExists,
  getManifestsPath,
  getFullManifestDiff,
  getParsedManifests,
  importFromManifests,
  importItems,
  importNpcs,
  importResources,
  importStores,
  importMusic,
  type ManifestType,
} from "@/lib/import/manifest-importer";
import { getAllAssets } from "@/lib/assets/registry";

const log = logger.child("API:import/manifests");

// =============================================================================
// GET - Get manifest state and diff
// =============================================================================

export async function GET(_request: NextRequest) {
  try {
    log.info("Fetching manifest state");

    // Check if manifests directory exists
    const exists = await manifestsDirExists();
    if (!exists) {
      const dir = getManifestsPath();
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

    // Get parsed manifests
    const parsed = await getParsedManifests();
    if (!parsed) {
      return NextResponse.json(
        { error: "Failed to parse manifests" },
        { status: 500 },
      );
    }

    // Get HyperForge assets for comparison
    const forgeAssets = await getAllAssets();

    // Calculate diff
    const diff = await getFullManifestDiff(forgeAssets);

    // Calculate counts
    const counts = {
      items: parsed.items.length,
      npcs: parsed.npcs.length,
      resources: parsed.resources.length,
      stores: parsed.stores.length,
      music: parsed.music.length,
      total: parsed.totalCount,
    };

    // Count assets with models
    const withModels = {
      items: parsed.items.filter((a) => a.asset.modelPath && a.asset.modelPath !== "").length,
      npcs: parsed.npcs.filter((a) => a.asset.modelPath && a.asset.modelPath !== "").length,
      resources: parsed.resources.filter((a) => a.asset.modelPath && a.asset.modelPath !== "").length,
    };

    log.info("Manifest state fetched", {
      counts,
      diff: diff.totals,
    });

    return NextResponse.json({
      success: true,
      counts,
      withModels,
      diff: {
        manifests: diff.manifests.map((m) => ({
          manifestType: m.manifestType,
          newAssets: m.newAssets.map(serializeComparison),
          modifiedAssets: m.modifiedAssets.map(serializeComparison),
          deletedAssets: m.deletedAssets.map(serializeComparison),
          unchangedAssets: m.unchangedAssets.map(serializeComparison),
          summary: m.summary,
        })),
        totals: diff.totals,
        timestamp: diff.timestamp.toISOString(),
      },
      parsedAt: parsed.parsedAt.toISOString(),
    });
  } catch (error) {
    log.error("Failed to fetch manifest state", { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch manifests",
      },
      { status: 500 },
    );
  }
}

/**
 * Serialize asset comparison for JSON response
 */
function serializeComparison(comparison: {
  id: string;
  name: string;
  category: string;
  manifestType: string;
  existsInForge: boolean;
  existsInGame: boolean;
  isModified: boolean;
}) {
  return {
    id: comparison.id,
    name: comparison.name,
    category: comparison.category,
    manifestType: comparison.manifestType,
    existsInForge: comparison.existsInForge,
    existsInGame: comparison.existsInGame,
    isModified: comparison.isModified,
  };
}

// =============================================================================
// POST - Import/sync manifests
// =============================================================================

interface ImportRequest {
  direction: "from_game" | "to_game";
  manifestTypes?: ManifestType[];
  assetIds?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ImportRequest;
    const { direction, manifestTypes, assetIds } = body;

    if (!direction || !["from_game", "to_game"].includes(direction)) {
      return NextResponse.json(
        { error: "Invalid direction. Must be 'from_game' or 'to_game'" },
        { status: 400 },
      );
    }

    log.info("Starting manifest sync", {
      direction,
      manifestTypes: manifestTypes || "all",
      assetCount: assetIds?.length || "all",
    });

    // Get HyperForge assets for comparison
    const forgeAssets = await getAllAssets();

    if (direction === "from_game") {
      // Import from game manifests to HyperForge
      if (manifestTypes && manifestTypes.length > 0) {
        // Import specific manifest types
        const results = await Promise.all(
          manifestTypes.map((type) => {
            switch (type) {
              case "items":
                return importItems(forgeAssets);
              case "npcs":
                return importNpcs(forgeAssets);
              case "resources":
                return importResources(forgeAssets);
              case "stores":
                return importStores(forgeAssets);
              case "music":
                return importMusic(forgeAssets);
              default:
                return null;
            }
          }),
        );

        const validResults = results.filter(Boolean);
        const totals = {
          added: 0,
          updated: 0,
          skipped: 0,
          failed: 0,
        };

        for (const result of validResults) {
          if (result) {
            totals.added += result.status.added.length;
            totals.updated += result.status.updated.length;
            totals.skipped += result.status.skipped.length;
            totals.failed += result.status.failed.length;
          }
        }

        log.info("Partial import complete", { totals });

        return NextResponse.json({
          success: totals.failed === 0,
          direction,
          manifestTypes,
          totals,
          results: validResults,
        });
      } else {
        // Import all manifests
        const result = await importFromManifests(forgeAssets);

        log.info("Full import complete", { totals: result.totals });

        return NextResponse.json({
          success: result.success,
          direction,
          totals: result.totals,
          results: result.results.map((r) => ({
            manifestType: r.manifestType,
            success: r.success,
            added: r.status.added.length,
            updated: r.status.updated.length,
            skipped: r.status.skipped.length,
            failed: r.status.failed.length,
          })),
          timestamp: result.timestamp.toISOString(),
        });
      }
    } else {
      // Export to game manifests
      // This would write to the manifest JSON files
      // For now, return a placeholder response
      log.warn("Sync to game not fully implemented - use manifest exporter");

      return NextResponse.json({
        success: false,
        direction,
        message: "Sync to game should use the manifest exporter at /api/manifest/export",
        suggestion: "Use the manifest exporter to write changes to game manifest files",
      });
    }
  } catch (error) {
    log.error("Failed to sync manifests", { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to sync manifests",
      },
      { status: 500 },
    );
  }
}
