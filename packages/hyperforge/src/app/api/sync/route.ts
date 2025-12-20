/**
 * Sync API Endpoint
 *
 * Handles synchronization between HyperForge and game manifests.
 *
 * GET /api/sync - Get sync status (what's different)
 * POST /api/sync - Sync changes (pull from game or push to game)
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils";
import {
  getSyncStatus,
  syncWithGame,
  manifestsExist,
  getManifestsDirectory,
} from "@/lib/import";
import type { HyperForgeAsset } from "@/types/asset";

const log = logger.child("API:sync");

// =============================================================================
// HELPER: Get HyperForge Assets
// =============================================================================

/**
 * Get all HyperForge assets for comparison
 * This should ideally query from a database or asset registry
 * For now, returns empty array (all game assets will show as "not imported")
 */
async function getForgeAssets(): Promise<HyperForgeAsset[]> {
  // TODO: Integrate with asset registry or database
  // For now, this returns an empty array which means:
  // - All game assets will show as "not exported" to HyperForge
  // - The sync status will reflect what needs to be imported
  return [];
}

// =============================================================================
// GET - Get sync status
// =============================================================================

export async function GET(_request: NextRequest) {
  try {
    log.info("Fetching sync status");

    // Check if manifests directory exists
    const exists = await manifestsExist();
    if (!exists) {
      const dir = getManifestsDirectory();
      log.warn("Manifests directory not found", { dir });
      return NextResponse.json(
        {
          error: "Manifests directory not found",
          directory: dir,
        },
        { status: 404 },
      );
    }

    // Get HyperForge assets for comparison
    const forgeAssets = await getForgeAssets();

    // Calculate sync status
    const status = await getSyncStatus(forgeAssets);

    log.info("Sync status calculated", {
      totalGameAssets: status.totalGameAssets,
      totalForgeAssets: status.totalForgeAssets,
      totalPendingChanges: status.totalPendingChanges,
    });

    return NextResponse.json({
      success: true,
      status: {
        manifests: status.manifests.map((m) => ({
          manifestType: m.manifestType,
          state: m.state,
          lastSynced: m.lastSynced?.toISOString() || null,
          gameAssetCount: m.gameAssetCount,
          forgeAssetCount: m.forgeAssetCount,
          pendingChanges: m.pendingChanges.map((c) => ({
            assetId: c.assetId,
            assetName: c.assetName,
            category: c.category,
            changeType: c.changeType,
            manifestType: c.manifestType,
            changedFields: c.changedFields,
          })),
        })),
        totalGameAssets: status.totalGameAssets,
        totalForgeAssets: status.totalForgeAssets,
        totalPendingChanges: status.totalPendingChanges,
        lastChecked: status.lastChecked.toISOString(),
      },
    });
  } catch (error) {
    log.error("Failed to get sync status", { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get sync status",
      },
      { status: 500 },
    );
  }
}

// =============================================================================
// POST - Perform sync
// =============================================================================

interface SyncRequest {
  direction: "from_game" | "to_game" | "bidirectional";
  assetIds?: string[]; // Optional: only sync specific assets
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SyncRequest;
    const { direction, assetIds } = body;

    if (!direction || !["from_game", "to_game", "bidirectional"].includes(direction)) {
      return NextResponse.json(
        {
          error: "Invalid direction. Must be 'from_game', 'to_game', or 'bidirectional'",
        },
        { status: 400 },
      );
    }

    log.info("Starting sync", { direction, assetCount: assetIds?.length || "all" });

    // Get HyperForge assets for comparison
    const forgeAssets = await getForgeAssets();

    // Perform sync
    const result = await syncWithGame(direction, forgeAssets);

    log.info("Sync complete", {
      direction,
      appliedChanges: result.appliedChanges.length,
    });

    return NextResponse.json({
      success: true,
      direction,
      appliedChanges: result.appliedChanges.map((c) => ({
        assetId: c.assetId,
        assetName: c.assetName,
        changeType: c.changeType,
        manifestType: c.manifestType,
      })),
      status: {
        totalGameAssets: result.status.totalGameAssets,
        totalForgeAssets: result.status.totalForgeAssets,
        totalPendingChanges: result.status.totalPendingChanges,
        lastChecked: result.status.lastChecked.toISOString(),
      },
      summary: {
        changesApplied: result.appliedChanges.length,
        remainingChanges: result.status.totalPendingChanges,
      },
    });
  } catch (error) {
    log.error("Failed to sync", { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to sync",
      },
      { status: 500 },
    );
  }
}
