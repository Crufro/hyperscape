/**
 * Version Control API Routes
 *
 * Manages manifest snapshots for version control.
 *
 * GET /api/versions - List all snapshots or compare two snapshots
 * POST /api/versions - Create a new snapshot
 * PUT /api/versions - Restore a specific snapshot
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils";
import {
  listSnapshots,
  createSnapshot,
  compareSnapshots,
  restoreSnapshot,
  getVersionControlStats,
} from "@/lib/versioning/version-control";
import {
  getAllItems,
  getAllNpcs,
  getAllResources,
  getAllStores,
  getAllMusic,
  loadAllManifests,
} from "@/lib/game/manifests";
import type { ItemManifest, NPCManifest, ResourceManifest, MusicTrackManifest } from "@/types/manifest";

const log = logger.child("API:versions");

/**
 * GET /api/versions
 *
 * Query params:
 * - compare: snapshot ID to compare from
 * - to: snapshot ID to compare to
 *
 * Without params: returns list of all snapshots
 * With compare params: returns diff between two snapshots
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const compareFrom = searchParams.get("compare");
    const compareTo = searchParams.get("to");

    // If comparing snapshots
    if (compareFrom && compareTo) {
      const diff = await compareSnapshots(compareFrom, compareTo);

      if (!diff) {
        return NextResponse.json(
          { error: "One or both snapshots not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        diff,
      });
    }

    // List all snapshots
    const snapshots = await listSnapshots();
    const stats = await getVersionControlStats();

    return NextResponse.json({
      success: true,
      snapshots,
      stats,
    });
  } catch (error) {
    log.error("Failed to get versions", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get versions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/versions
 *
 * Body:
 * - description: optional description for the snapshot
 * - manifests: optional manifest data (if not provided, loads from game manifests)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { description, manifests: providedManifests } = body;

    let manifests;

    if (providedManifests) {
      // Use provided manifests
      manifests = providedManifests;
    } else {
      // Load current manifests from game files
      await loadAllManifests();

      const [items, npcs, resources, stores, music] = await Promise.all([
        getAllItems(),
        getAllNpcs(),
        getAllResources(),
        getAllStores(),
        getAllMusic(),
      ]);

      manifests = {
        items: items as unknown as ItemManifest[],
        npcs: npcs as unknown as NPCManifest[],
        resources: resources as unknown as ResourceManifest[],
        stores,
        music: music as unknown as MusicTrackManifest[],
      };
    }

    const snapshot = await createSnapshot(manifests, description || "Manual snapshot");

    log.info("Created snapshot", {
      snapshotId: snapshot.id,
      totalAssets: snapshot.metadata.totalAssets,
    });

    return NextResponse.json({
      success: true,
      snapshot: {
        id: snapshot.id,
        timestamp: snapshot.timestamp,
        description: snapshot.description,
        metadata: snapshot.metadata,
      },
    });
  } catch (error) {
    log.error("Failed to create snapshot", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create snapshot" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/versions
 *
 * Restore a specific snapshot
 *
 * Body:
 * - snapshotId: the snapshot ID to restore
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { snapshotId } = body;

    if (!snapshotId) {
      return NextResponse.json(
        { error: "snapshotId is required" },
        { status: 400 }
      );
    }

    const manifests = await restoreSnapshot(snapshotId);

    if (!manifests) {
      return NextResponse.json(
        { error: "Snapshot not found" },
        { status: 404 }
      );
    }

    log.info("Restored snapshot", { snapshotId });

    return NextResponse.json({
      success: true,
      message: `Restored snapshot ${snapshotId}`,
      manifests,
    });
  } catch (error) {
    log.error("Failed to restore snapshot", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to restore snapshot" },
      { status: 500 }
    );
  }
}
