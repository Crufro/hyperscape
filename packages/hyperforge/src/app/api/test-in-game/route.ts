import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { logger } from "@/lib/utils";

const log = logger.child("API:test-in-game");

// Paths
const SERVER_PATH = path.resolve(process.cwd(), "../server");
const MODELS_PATH = path.join(SERVER_PATH, "world/assets/models");
const WORLD_JSON_PATH = path.join(SERVER_PATH, "world/world.json");

// Environment URLs
const GAME_URL = process.env.NEXT_PUBLIC_GAME_URL || "http://localhost:3333";
const SERVER_URL = process.env.HYPERSCAPE_SERVER_URL || "http://localhost:5555";
const FORGE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3500";

// Default spawn
const DEFAULT_SPAWN = { x: 2, y: 0, z: 2 };
const DEFAULT_AREA = "central_haven";

interface TestInGameRequest {
  assetId: string;
  assetName?: string;
  category?: string;
  source?: string;
  hasVRM?: boolean;
  spawnPosition?: { x: number; y: number; z: number };
  spawnArea?: string;
}

interface WorldEntity {
  id: string;
  name: string;
  type: string;
  blueprint: string;
  position: [number, number, number];
  data?: Record<string, unknown>;
}

interface WorldConfig {
  entities: WorldEntity[];
}

/**
 * POST /api/test-in-game
 * One-click workflow: Export → Spawn → Reload → Return game URL
 */
export async function POST(request: NextRequest) {
  try {
    const body: TestInGameRequest = await request.json();
    const {
      assetId,
      assetName = assetId,
      category = "prop",
      source = "LOCAL",
      hasVRM = false,
      spawnPosition = DEFAULT_SPAWN,
      spawnArea = DEFAULT_AREA,
    } = body;

    if (!assetId) {
      return NextResponse.json({ error: "assetId required" }, { status: 400 });
    }

    log.info({ assetId, spawnPosition, category }, "🎮 Test in game requested");

    // Step 1: Check if asset exists, export if needed
    const modelDir = path.join(MODELS_PATH, assetId);
    let modelPath = "";

    try {
      await fs.access(modelDir);
      const files = await fs.readdir(modelDir);
      const vrmFile = files.find((f) => f.endsWith(".vrm"));
      const glbFile = files.find((f) => f.endsWith(".glb"));

      modelPath = vrmFile
        ? `asset://models/${assetId}/${vrmFile}`
        : glbFile
          ? `asset://models/${assetId}/${glbFile}`
          : `asset://models/${assetId}/model.glb`;

      log.info({ modelPath }, "Asset found in server");
    } catch {
      // Not in server - export from HyperForge
      if (source === "LOCAL" || source === "FORGE") {
        log.info("Exporting asset to server...");

        const exportRes = await fetch(`${FORGE_URL}/api/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetId,
            includeThumbnail: true,
            includeVRM: hasVRM,
            metadata: { name: assetName, category, testMode: true },
          }),
        });

        if (!exportRes.ok) {
          const err = await exportRes.json().catch(() => ({}));
          throw new Error(err.error || "Export failed");
        }

        modelPath = hasVRM
          ? `asset://models/${assetId}/${assetId}.vrm`
          : `asset://models/${assetId}/${assetId}.glb`;

        log.info({ modelPath }, "Asset exported successfully");
      } else {
        return NextResponse.json(
          { error: `Asset ${assetId} not found in server` },
          { status: 404 },
        );
      }
    }

    // Step 2: Add entity to world.json
    let worldConfig: WorldConfig = { entities: [] };

    try {
      const content = await fs.readFile(WORLD_JSON_PATH, "utf-8");
      worldConfig = JSON.parse(content);
      if (!Array.isArray(worldConfig.entities)) {
        worldConfig.entities = [];
      }
    } catch {
      // Create new world.json
      await fs.mkdir(path.dirname(WORLD_JSON_PATH), { recursive: true });
    }

    // Remove old test spawns for this asset (keep max 2)
    const existingTests = worldConfig.entities.filter(
      (e) => e.data?.assetId === assetId && e.data?.isTestSpawn,
    );
    if (existingTests.length >= 2) {
      const removeIds = new Set(existingTests.slice(0, -1).map((e) => e.id));
      worldConfig.entities = worldConfig.entities.filter(
        (e) => !removeIds.has(e.id),
      );
    }

    // Create test entity
    const testEntityId = `test_${assetId}_${Date.now()}`;
    const entityType =
      category === "npc" || category === "mob" || hasVRM ? "npc" : "app";

    const newEntity: WorldEntity = {
      id: testEntityId,
      name: `[Test] ${assetName}`,
      type: entityType,
      blueprint: modelPath,
      position: [spawnPosition.x, spawnPosition.y, spawnPosition.z],
      data: {
        assetId,
        category,
        spawnArea,
        isTestSpawn: true,
        createdAt: new Date().toISOString(),
      },
    };

    worldConfig.entities.push(newEntity);
    await fs.writeFile(WORLD_JSON_PATH, JSON.stringify(worldConfig, null, 2));
    log.info({ testEntityId }, "Entity added to world.json");

    // Step 3: Reload game server
    let serverReloaded = false;
    try {
      const reloadRes = await fetch(`${SERVER_URL}/api/reload`, {
        method: "POST",
        signal: globalThis.AbortSignal.timeout(3000),
      });
      serverReloaded = reloadRes.ok;
      if (serverReloaded) {
        log.info("Game server reloaded");
      }
    } catch {
      log.warn("Server not running or reload failed");
    }

    return NextResponse.json({
      success: true,
      assetId,
      testEntityId,
      modelPath,
      entityType,
      spawnPosition,
      spawnArea,
      serverReloaded,
      gameUrl: GAME_URL,
    });
  } catch (error) {
    log.error({ error }, "Test in game failed");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Test failed" },
      { status: 500 },
    );
  }
}
