/**
 * Game Manifests API
 *
 * Provides access to cached game manifest data.
 * Use this endpoint to get items, NPCs, resources, stores, music, buildings, and areas.
 *
 * GET /api/game/manifests - Get manifest status and summary
 * GET /api/game/manifests?type=items - Get all items
 * GET /api/game/manifests?type=npcs - Get all NPCs
 * GET /api/game/manifests?type=resources - Get all resources
 * GET /api/game/manifests?type=stores - Get all stores
 * GET /api/game/manifests?type=music - Get all music tracks
 * GET /api/game/manifests?type=buildings - Get all buildings
 * GET /api/game/manifests?type=areas - Get all world areas
 * GET /api/game/manifests?type=all - Get everything
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils";
import {
  getManifestStatus,
  getAllItems,
  getAllNpcs,
  getAllResources,
  getAllStores,
  getAllMusic,
  getAllBuildings,
  getAllAreas,
  loadAllManifests,
} from "@/lib/game/manifests";

const log = logger.child("API:game:manifests");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    // Ensure manifests are loaded
    await loadAllManifests();

    // If no type specified, return status summary
    if (!type) {
      const status = getManifestStatus();
      return NextResponse.json({
        success: true,
        ...status,
        availableTypes: ["items", "npcs", "resources", "stores", "music", "buildings", "areas", "all"],
        usage: "Add ?type=<type> to get specific data",
      });
    }

    // Get requested data type
    switch (type) {
      case "items": {
        const items = await getAllItems();
        return NextResponse.json({
          success: true,
          type: "items",
          count: items.length,
          data: items,
        });
      }

      case "npcs": {
        const npcs = await getAllNpcs();
        return NextResponse.json({
          success: true,
          type: "npcs",
          count: npcs.length,
          data: npcs,
        });
      }

      case "resources": {
        const resources = await getAllResources();
        return NextResponse.json({
          success: true,
          type: "resources",
          count: resources.length,
          data: resources,
        });
      }

      case "stores": {
        const stores = await getAllStores();
        return NextResponse.json({
          success: true,
          type: "stores",
          count: stores.length,
          data: stores,
        });
      }

      case "music": {
        const music = await getAllMusic();
        return NextResponse.json({
          success: true,
          type: "music",
          count: music.length,
          data: music,
        });
      }

      case "buildings": {
        const buildings = await getAllBuildings();
        return NextResponse.json({
          success: true,
          type: "buildings",
          count: buildings.length,
          data: buildings,
        });
      }

      case "areas": {
        const areas = await getAllAreas();
        return NextResponse.json({
          success: true,
          type: "areas",
          count: areas.length,
          data: areas,
        });
      }

      case "all": {
        const [items, npcs, resources, stores, music, buildings, areas] = await Promise.all([
          getAllItems(),
          getAllNpcs(),
          getAllResources(),
          getAllStores(),
          getAllMusic(),
          getAllBuildings(),
          getAllAreas(),
        ]);

        return NextResponse.json({
          success: true,
          type: "all",
          counts: {
            items: items.length,
            npcs: npcs.length,
            resources: resources.length,
            stores: stores.length,
            music: music.length,
            buildings: buildings.length,
            areas: areas.length,
          },
          data: {
            items,
            npcs,
            resources,
            stores,
            music,
            buildings,
            areas,
          },
        });
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown type: ${type}`,
            availableTypes: ["items", "npcs", "resources", "stores", "music", "buildings", "areas", "all"],
          },
          { status: 400 },
        );
    }
  } catch (error) {
    log.error("Failed to get manifests", { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get manifests",
      },
      { status: 500 },
    );
  }
}
