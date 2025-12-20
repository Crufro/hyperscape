/**
 * NPCs Manifest API
 *
 * GET /api/game/manifests/npcs - Get all NPCs (including mobs)
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/utils";
import { getAllNpcs, loadAllManifests } from "@/lib/game/manifests";

const log = logger.child("API:game:manifests:npcs");

export async function GET() {
  try {
    await loadAllManifests();
    const npcs = await getAllNpcs();
    return NextResponse.json(npcs);
  } catch (error) {
    log.error("Failed to get NPCs", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get NPCs" },
      { status: 500 }
    );
  }
}
