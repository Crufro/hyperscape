/**
 * Resources Manifest API
 *
 * GET /api/game/manifests/resources - Get all resources
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/utils";
import { getAllResources, loadAllManifests } from "@/lib/game/manifests";

const log = logger.child("API:game:manifests:resources");

export async function GET() {
  try {
    await loadAllManifests();
    const resources = await getAllResources();
    return NextResponse.json(resources);
  } catch (error) {
    log.error("Failed to get resources", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get resources" },
      { status: 500 }
    );
  }
}
