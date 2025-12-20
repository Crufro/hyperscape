/**
 * Relationships Search API
 *
 * Search for assets to use in relationship creation.
 *
 * GET /api/relationships/search?q=<query> - Search assets by name
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils";
import {
  getAllItems,
  getAllNpcs,
  getAllResources,
  getAllAreas,
  loadAllManifests,
} from "@/lib/game/manifests";
import type { AssetCategory } from "@/types/core";

const log = logger.child("API:relationships:search");

interface AssetSearchResult {
  id: string;
  name: string;
  category: AssetCategory;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase() || "";
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        assets: [],
        message: "Query must be at least 2 characters",
      });
    }

    // Ensure manifests are loaded
    await loadAllManifests();

    // Search across all asset types
    const [items, npcs, resources, areas] = await Promise.all([
      getAllItems(),
      getAllNpcs(),
      getAllResources(),
      getAllAreas(),
    ]);

    const results: AssetSearchResult[] = [];

    // Search items
    for (const item of items) {
      if (
        item.name.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      ) {
        let category: AssetCategory = "item";
        if (item.type === "weapon") category = "weapon";
        else if (item.type === "armor") category = "armor";
        else if (item.type === "tool") category = "tool";
        else if (item.type === "currency") category = "currency";

        results.push({
          id: item.id,
          name: item.name,
          category,
        });
      }
    }

    // Search NPCs
    for (const npc of npcs) {
      if (
        npc.name.toLowerCase().includes(query) ||
        npc.id.toLowerCase().includes(query)
      ) {
        results.push({
          id: npc.id,
          name: npc.name,
          category: npc.category === "mob" ? "mob" : "npc",
        });
      }
    }

    // Search resources
    for (const resource of resources) {
      if (
        resource.name.toLowerCase().includes(query) ||
        resource.id.toLowerCase().includes(query)
      ) {
        results.push({
          id: resource.id,
          name: resource.name,
          category: "resource",
        });
      }
    }

    // Search areas
    for (const area of areas) {
      if (
        area.name.toLowerCase().includes(query) ||
        area.id.toLowerCase().includes(query)
      ) {
        results.push({
          id: area.id,
          name: area.name,
          category: "biome",
        });
      }
    }

    // Sort by relevance (exact matches first, then by name length)
    results.sort((a, b) => {
      const aExact =
        a.name.toLowerCase() === query || a.id.toLowerCase() === query;
      const bExact =
        b.name.toLowerCase() === query || b.id.toLowerCase() === query;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.name.length - b.name.length;
    });

    // Limit results
    const limitedResults = results.slice(0, limit);

    return NextResponse.json({
      success: true,
      query,
      assets: limitedResults,
      totalMatches: results.length,
      showing: limitedResults.length,
    });
  } catch (error) {
    log.error("Asset search failed", { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Search failed",
      },
      { status: 500 },
    );
  }
}
