/**
 * World Entities API
 * Fetches entities from the LIVE game server for real-time world editing.
 * Falls back to consolidated manifest service if server is not running.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils";
import { getWorldEntities } from "@/lib/game/manifests";
import { CreateEntitySchema, validationErrorResponse } from "@/lib/api/schemas";

const log = logger.child("API:world:entities");

// Live game server URL
const GAME_SERVER_URL =
  process.env.HYPERSCAPE_SERVER_URL || "http://localhost:5555";

// UI-friendly entity format (extends WorldEntity with additional fields)
interface FormattedEntity {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  modelPath?: string;
  spawnArea?: string;
  isActive: boolean;
  loadedAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * Request body for POST /api/world/entities
 * Creates a new entity in the world
 */
interface _CreateEntityRequest {
  id: string;
  name: string;
  type?: string;
  blueprint?: string;
  modelPath?: string;
  position?: { x?: number; y?: number; z?: number };
  rotation?: { x?: number; y?: number; z?: number };
  scale?: { x?: number; y?: number; z?: number };
  data?: Record<string, unknown>;
}

// ============================================================================
// Manifest Data Loading (uses consolidated game manifest service)
// ============================================================================

/**
 * Load entities from manifest files via the consolidated service
 */
async function loadEntitiesFromManifests(): Promise<{
  entities: FormattedEntity[];
  areas: Array<{ id: string; name: string; entityCount: number }>;
}> {
  const { entities: worldEntities, areas } = await getWorldEntities();

  // Convert WorldEntity to FormattedEntity (add isActive, loadedAt)
  const entities: FormattedEntity[] = worldEntities.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    position: e.position,
    scale: e.scale,
    modelPath: e.modelPath,
    spawnArea: e.spawnArea,
    isActive: true,
    loadedAt: new Date().toISOString(),
    metadata: e.metadata,
  }));

  log.info("Loaded entities from manifests", {
    entityCount: entities.length,
    areaCount: areas.length,
  });

  return { entities, areas };
}

/**
 * Fetch entities from the live game server
 */
async function fetchFromLiveServer(): Promise<{
  entities: FormattedEntity[];
  source: "live";
  serverTime: number;
} | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(`${GAME_SERVER_URL}/api/world/entities`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      log.warn(
        `Live server returned status ${response.status}`,
        { url: `${GAME_SERVER_URL}/api/world/entities` },
      );
      return null;
    }

    const data = await response.json();
    return {
      entities: data.entities || [],
      source: "live",
      serverTime: data.serverTime || Date.now(),
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      log.debug("Live server request timed out, falling back to manifests");
    } else {
      log.debug("Live server not available, falling back to manifests", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
  }
}

/**
 * GET /api/world/entities
 * List all entities in the world - fetches from LIVE server first!
 * Falls back to manifest files (world-areas.json + npcs.json + resources.json)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type");
    const areaFilter = searchParams.get("area");
    const forceLocal = searchParams.get("source") === "local";

    // Try to fetch from live server first (unless explicitly requesting local)
    if (!forceLocal) {
      const liveData = await fetchFromLiveServer();
      if (liveData) {
        let entities = liveData.entities;

        // Apply filters
        if (typeFilter) {
          entities = entities.filter((e) => e.type === typeFilter);
        }
        if (areaFilter) {
          entities = entities.filter(
            (e) =>
              (e.metadata as Record<string, unknown> | undefined)?.spawnArea ===
                areaFilter ||
              (e.metadata as Record<string, unknown> | undefined)?.area ===
                areaFilter,
          );
        }

        log.info("Returning live entities from game server", {
          count: entities.length,
          serverTime: liveData.serverTime,
        });

        return NextResponse.json({
          success: true,
          entities,
          areas: [],
          total: entities.length,
          source: "live",
          serverUrl: GAME_SERVER_URL,
          serverTime: liveData.serverTime,
        });
      }
    }

    // Fallback: read from manifest files (world-areas.json + npcs.json + resources.json)
    log.info("Using fallback manifests (game server not running)");

    const { entities: allEntities, areas } = await loadEntitiesFromManifests();
    let entities = allEntities;

    // Apply filters
    if (typeFilter) {
      entities = entities.filter((e) => e.type === typeFilter);
    }
    if (areaFilter) {
      entities = entities.filter((e) => e.spawnArea === areaFilter);
    }

    return NextResponse.json({
      success: true,
      entities,
      areas,
      total: entities.length,
      source: "manifests",
    });
  } catch (error) {
    log.error("GET error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list entities",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/world/entities
 * Add a new entity to the world - sends to LIVE server.
 * Note: Adding entities requires the live game server to be running.
 * Manifest files are read-only source of truth for initial world state.
 */
export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = CreateEntitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(validationErrorResponse(parsed.error), {
        status: 400,
      });
    }

    const { id, name } = parsed.data;

    // Try to send to live server
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${GAME_SERVER_URL}/api/world/entities`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(parsed.data),
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        log.info("Entity added to live server", { id, name });
        return NextResponse.json({
          ...result,
          source: "live",
        });
      } else {
        log.warn(`Live server returned status ${response.status}`);
        const errorText = await response.text();
        return NextResponse.json(
          { 
            error: `Live server error: ${response.status}`,
            details: errorText,
          },
          { status: response.status },
        );
      }
    } catch (error) {
      log.warn("Live server not available for POST", {
        error: error instanceof Error ? error.message : String(error),
      });
      
      // Return helpful error - can't add entities without live server
      return NextResponse.json(
        { 
          error: "Game server not running",
          message: "To add entities dynamically, start the game server with 'bun run dev' in the server package. Entities defined in manifest files (world-areas.json, npcs.json, resources.json) are read-only.",
          hint: "Run: cd packages/server && bun run dev",
        },
        { status: 503 },
      );
    }
  } catch (error) {
    log.error("POST error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to add entity",
      },
      { status: 500 },
    );
  }
}

