/**
 * World Areas Manifest API
 *
 * GET /api/game/manifests/areas - Get all world areas
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/utils";
import { getAllAreas, loadAllManifests, loadWorldAreas } from "@/lib/game/manifests";
import { convertWorldAreasToEditor } from "@/lib/world/tile-service";

const log = logger.child("API:game:manifests:areas");

export async function GET() {
  try {
    await loadAllManifests();
    const areas = await getAllAreas();
    return NextResponse.json(areas);
  } catch (error) {
    log.error("Failed to get areas", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get areas" },
      { status: 500 }
    );
  }
}

/**
 * Get areas in editor format (with tiles)
 */
export async function POST() {
  try {
    await loadAllManifests();
    const worldAreasConfig = await loadWorldAreas();
    
    if (!worldAreasConfig) {
      return NextResponse.json(
        { error: "World areas configuration not found" },
        { status: 404 }
      );
    }
    
    // Convert to editor format
    const editorAreas = convertWorldAreasToEditor(worldAreasConfig);
    
    return NextResponse.json({
      success: true,
      areas: editorAreas.map((area) => ({
        ...area,
        // Convert Map to object for JSON serialization
        tiles: Object.fromEntries(area.tiles),
      })),
    });
  } catch (error) {
    log.error("Failed to get areas in editor format", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get areas" },
      { status: 500 }
    );
  }
}
