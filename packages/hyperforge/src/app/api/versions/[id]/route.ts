/**
 * Version Control API - Single Snapshot Routes
 *
 * GET /api/versions/[id] - Get a specific snapshot with full manifest data
 * DELETE /api/versions/[id] - Delete a snapshot
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils";
import {
  getSnapshot,
  deleteSnapshot,
  getAssetHistory,
} from "@/lib/versioning/version-control";

const log = logger.child("API:versions:[id]");

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/versions/[id]
 *
 * Get a specific snapshot by ID.
 *
 * Query params:
 * - assetHistory: if provided, returns history for that asset ID instead
 * - manifestType: optional filter for asset history (items, npcs, resources, stores, music)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const assetHistoryId = searchParams.get("assetHistory");
    const manifestType = searchParams.get("manifestType") as
      | "items"
      | "npcs"
      | "resources"
      | "stores"
      | "music"
      | null;

    // If requesting asset history
    if (assetHistoryId) {
      const history = await getAssetHistory(
        assetHistoryId,
        manifestType || undefined
      );

      return NextResponse.json({
        success: true,
        assetId: assetHistoryId,
        history,
      });
    }

    // Get the snapshot
    const snapshot = await getSnapshot(id);

    if (!snapshot) {
      return NextResponse.json(
        { error: "Snapshot not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      snapshot,
    });
  } catch (error) {
    log.error("Failed to get snapshot", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get snapshot" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/versions/[id]
 *
 * Delete a specific snapshot.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const deleted = await deleteSnapshot(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Snapshot not found" },
        { status: 404 }
      );
    }

    log.info("Deleted snapshot", { snapshotId: id });

    return NextResponse.json({
      success: true,
      message: `Deleted snapshot ${id}`,
    });
  } catch (error) {
    log.error("Failed to delete snapshot", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete snapshot" },
      { status: 500 }
    );
  }
}
