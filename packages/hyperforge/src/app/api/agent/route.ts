/**
 * HyperForge Agent API
 *
 * Unified REST API for AI agents to use HyperForge's content generation
 * and asset management capabilities. Designed for autonomous agents that
 * need to generate game content (3D models, images, audio, world entities).
 *
 * Endpoints (all POST /api/agent):
 * - action: "generate-3d" - Generate 3D model from text or image
 * - action: "generate-image" - Generate concept art, sprites, textures
 * - action: "generate-audio" - Generate sound effects, music, voice
 * - action: "list-assets" - List available assets
 * - action: "get-asset" - Get asset details
 * - action: "place-entity" - Place entity in world
 * - action: "get-world" - Get world entities
 * - action: "status" - Check async task status
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils";
import { AgentRequestSchema, validationErrorResponse } from "@/lib/api/schemas";

const log = logger.child("API:agent");

// Game server URL for world operations
const GAME_SERVER_URL =
  process.env.HYPERSCAPE_SERVER_URL || "http://localhost:5555";

interface AgentResponse {
  success: boolean;
  action: string;
  data?: unknown;
  error?: string;
  taskId?: string;
  status?: string;
}

/**
 * POST /api/agent
 *
 * Unified agent endpoint. All actions go through here with an "action" field.
 */
export async function POST(request: NextRequest): Promise<NextResponse<AgentResponse>> {
  try {
    const body: unknown = await request.json();
    const parsed = AgentRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        action: "unknown",
        error: "Invalid request",
        data: validationErrorResponse(parsed.error),
      }, { status: 400 });
    }

    const { action, params = {} } = parsed.data;

    log.info({ action, params: Object.keys(params) }, "Agent request");

    switch (action) {
      // ============================================================
      // 3D MODEL GENERATION
      // ============================================================

      case "generate-3d":
      case "generate-model": {
        /**
         * Generate a 3D model using Meshy AI.
         *
         * Params:
         * - prompt: string (required) - Description of the 3D model
         * - imageUrl: string (optional) - Image URL for image-to-3D
         * - mode: "text" | "image" (default: "text")
         * - style: "realistic" | "stylized" (default: "realistic")
         */
        const { prompt, imageUrl, mode = "text", style = "realistic" } = params as {
          prompt?: string;
          imageUrl?: string;
          mode?: string;
          style?: string;
        };

        if (mode === "image" && imageUrl) {
          // Image to 3D
          const meshyRes = await fetch(`${getBaseUrl(request)}/api/meshy`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "image-to-3d",
              imageUrl,
              aiModel: style === "realistic" ? "meshy-4" : "meshy-3-turbo",
              enablePBR: true,
            }),
          });
          const meshyData = await meshyRes.json();

          return NextResponse.json({
            success: true,
            action: "generate-3d",
            taskId: meshyData.result || meshyData.id,
            status: "processing",
            data: {
              mode: "image-to-3d",
              message: "3D model generation started. Use 'status' action to check progress.",
            },
          });
        } else if (prompt) {
          // Text to 3D (preview stage)
          const meshyRes = await fetch(`${getBaseUrl(request)}/api/meshy`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "text-to-3d-preview",
              prompt,
              aiModel: "latest",
              artStyle: style,
            }),
          });
          const meshyData = await meshyRes.json();

          return NextResponse.json({
            success: true,
            action: "generate-3d",
            taskId: meshyData.taskId,
            status: "processing",
            data: {
              mode: "text-to-3d",
              stage: "preview",
              message: "3D model preview generation started. Use 'status' action to check progress.",
            },
          });
        } else {
          return NextResponse.json({
            success: false,
            action: "generate-3d",
            error: "Missing required: prompt (for text-to-3d) or imageUrl (for image-to-3d)",
          }, { status: 400 });
        }
      }

      case "refine-3d": {
        /**
         * Refine a 3D model preview (add textures).
         *
         * Params:
         * - taskId: string (required) - Preview task ID from generate-3d
         */
        const { taskId } = params as { taskId?: string };

        if (!taskId) {
          return NextResponse.json({
            success: false,
            action: "refine-3d",
            error: "Missing required: taskId (from generate-3d preview)",
          }, { status: 400 });
        }

        const meshyRes = await fetch(`${getBaseUrl(request)}/api/meshy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "text-to-3d-refine",
            previewTaskId: taskId,
            enablePBR: true,
            textureResolution: 2048,
          }),
        });
        const meshyData = await meshyRes.json();

        return NextResponse.json({
          success: true,
          action: "refine-3d",
          taskId: meshyData.taskId,
          status: "processing",
          data: {
            stage: "refine",
            message: "3D model texturing started. Use 'status' action to check progress.",
          },
        });
      }

      // ============================================================
      // IMAGE GENERATION
      // ============================================================

      case "generate-image": {
        /**
         * Generate an image (concept art, sprite, texture).
         *
         * Params:
         * - prompt: string (required) - Description
         * - type: "concept-art" | "sprite" | "texture" (default: "concept-art")
         * - style: string (optional) - Art style
         * - assetType: string (optional) - For concept art: "character", "weapon", "item", etc.
         */
        const { prompt, type = "concept-art", style, assetType } = params as {
          prompt?: string;
          type?: string;
          style?: string;
          assetType?: string;
        };

        if (!prompt) {
          return NextResponse.json({
            success: false,
            action: "generate-image",
            error: "Missing required: prompt",
          }, { status: 400 });
        }

        const imageRes = await fetch(`${getBaseUrl(request)}/api/images/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            prompt,
            options: { style, assetType },
          }),
        });
        const imageData = await imageRes.json();

        if (!imageData.success) {
          return NextResponse.json({
            success: false,
            action: "generate-image",
            error: imageData.error || "Image generation failed",
          }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          action: "generate-image",
          data: {
            id: imageData.image.id,
            url: imageData.image.url,
            type,
            prompt,
          },
        });
      }

      // ============================================================
      // AUDIO GENERATION
      // ============================================================

      case "generate-sfx":
      case "generate-sound": {
        /**
         * Generate a sound effect.
         *
         * Params:
         * - prompt: string (required) - Description of the sound
         * - duration: number (optional) - Duration in seconds (default: 2)
         */
        const { prompt, duration = 2 } = params as {
          prompt?: string;
          duration?: number;
        };

        if (!prompt) {
          return NextResponse.json({
            success: false,
            action: "generate-sfx",
            error: "Missing required: prompt",
          }, { status: 400 });
        }

        const sfxRes = await fetch(`${getBaseUrl(request)}/api/audio/sfx/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, duration_seconds: duration }),
        });
        const sfxData = await sfxRes.json();

        return NextResponse.json({
          success: sfxData.success !== false,
          action: "generate-sfx",
          data: sfxData.success !== false ? {
            id: sfxData.id,
            url: sfxData.url,
            prompt,
          } : undefined,
          error: sfxData.error,
        });
      }

      case "generate-music": {
        /**
         * Generate background music.
         *
         * Params:
         * - prompt: string (required) - Description of the music
         * - duration: number (optional) - Duration in seconds (default: 30)
         */
        const { prompt, duration = 30 } = params as {
          prompt?: string;
          duration?: number;
        };

        if (!prompt) {
          return NextResponse.json({
            success: false,
            action: "generate-music",
            error: "Missing required: prompt",
          }, { status: 400 });
        }

        const musicRes = await fetch(`${getBaseUrl(request)}/api/audio/music/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, duration_seconds: duration }),
        });
        const musicData = await musicRes.json();

        return NextResponse.json({
          success: musicData.success !== false,
          action: "generate-music",
          data: musicData.success !== false ? {
            id: musicData.id,
            url: musicData.url,
            prompt,
          } : undefined,
          error: musicData.error,
        });
      }

      case "generate-voice":
      case "generate-tts": {
        /**
         * Generate voice/speech from text.
         *
         * Params:
         * - text: string (required) - Text to speak
         * - voiceId: string (optional) - ElevenLabs voice ID
         */
        const { text, voiceId } = params as {
          text?: string;
          voiceId?: string;
        };

        if (!text) {
          return NextResponse.json({
            success: false,
            action: "generate-voice",
            error: "Missing required: text",
          }, { status: 400 });
        }

        const voiceRes = await fetch(`${getBaseUrl(request)}/api/audio/voice/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voiceId }),
        });
        const voiceData = await voiceRes.json();

        return NextResponse.json({
          success: voiceData.success !== false,
          action: "generate-voice",
          data: voiceData.success !== false ? {
            id: voiceData.id,
            url: voiceData.url,
            text,
          } : undefined,
          error: voiceData.error,
        });
      }

      // ============================================================
      // CONTENT GENERATION (AI Text)
      // ============================================================

      case "generate-content":
      case "generate-text": {
        /**
         * Generate text content (dialogues, descriptions, lore).
         *
         * Params:
         * - prompt: string (required) - What to generate
         * - type: string (optional) - Content type for formatting
         */
        const { prompt, type = "general" } = params as {
          prompt?: string;
          type?: string;
        };

        if (!prompt) {
          return NextResponse.json({
            success: false,
            action: "generate-content",
            error: "Missing required: prompt",
          }, { status: 400 });
        }

        const contentRes = await fetch(`${getBaseUrl(request)}/api/ai/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, type }),
        });
        const contentData = await contentRes.json();

        return NextResponse.json({
          success: contentData.success !== false,
          action: "generate-content",
          data: contentData,
          error: contentData.error,
        });
      }

      // ============================================================
      // ASSET MANAGEMENT
      // ============================================================

      case "list-assets": {
        /**
         * List available assets from the unified Asset Registry.
         *
         * Params:
         * - source: "CDN" | "FORGE" | "LOCAL" | "all" (default: "all")
         *   - CDN: Official game assets from hyperscapeAI/assets repo
         *   - FORGE: HyperForge-generated assets (stored in Supabase)
         *   - LOCAL: Local filesystem assets (dev only)
         * - category: string (optional) - Filter by category
         * - type: string (optional) - Filter by asset type (model, vrm, audio, image)
         */
        const { source = "all", category, type: assetType } = params as {
          source?: string;
          category?: string;
          type?: string;
        };

        // Build query params for the Asset Registry API
        const registryParams = new URLSearchParams();
        if (source !== "all") {
          registryParams.set("source", source);
        }
        if (category) {
          registryParams.set("category", category);
        }
        if (assetType) {
          registryParams.set("type", assetType);
        }
        if (!registryParams.toString()) {
          registryParams.set("all", "true");
        }

        const registryRes = await fetch(
          `${getBaseUrl(request)}/api/assets/registry?${registryParams.toString()}`
        );

        if (!registryRes.ok) {
          return NextResponse.json({
            success: false,
            action: "list-assets",
            error: "Failed to fetch assets from registry",
          });
        }

        const registryData = await registryRes.json();
        const assets = registryData.assets || [];

        return NextResponse.json({
          success: true,
          action: "list-assets",
          data: {
            assets,
            count: assets.length,
            total: registryData.total || assets.length,
          },
        });
      }

      // ============================================================
      // WORLD OPERATIONS
      // ============================================================

      case "get-world":
      case "list-entities": {
        /**
         * Get world entities from the game server.
         *
         * Params:
         * - page: number (default: 1)
         * - limit: number (default: 50)
         * - type: string (optional) - Filter by entity type (mob, npc, item, resource, player, bank)
         * - search: string (optional) - Search by name
         */
        const { page = 1, limit = 50, type, search } = params as {
          page?: number;
          limit?: number;
          type?: string;
          search?: string;
        };

        const queryParams = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          ...(type && { type }),
          ...(search && { search }),
        });

        const worldRes = await fetch(`${GAME_SERVER_URL}/api/world/entities?${queryParams}`);

        if (!worldRes.ok) {
          return NextResponse.json({
            success: false,
            action: "get-world",
            error: "Game server not available",
          }, { status: 503 });
        }

        const worldData = await worldRes.json();

        return NextResponse.json({
          success: true,
          action: "get-world",
          data: worldData,
        });
      }

      case "get-entity": {
        /**
         * Get a single entity by ID with full details.
         *
         * Params:
         * - id: string (required) - Entity ID
         */
        const { id } = params as { id?: string };

        if (!id) {
          return NextResponse.json({
            success: false,
            action: "get-entity",
            error: "Missing required: id",
          }, { status: 400 });
        }

        const entityRes = await fetch(`${GAME_SERVER_URL}/api/world/entities/${id}`);
        const entityData = await entityRes.json();

        return NextResponse.json({
          success: entityData.success !== false,
          action: "get-entity",
          data: entityData.entity,
          error: entityData.error,
        });
      }

      case "get-players":
      case "list-players": {
        /**
         * Get all currently connected players with their positions.
         */
        const playersRes = await fetch(`${GAME_SERVER_URL}/api/world/players`);

        if (!playersRes.ok) {
          return NextResponse.json({
            success: false,
            action: "get-players",
            error: "Game server not available",
          }, { status: 503 });
        }

        const playersData = await playersRes.json();

        return NextResponse.json({
          success: true,
          action: "get-players",
          data: playersData,
        });
      }

      case "find-nearby": {
        /**
         * Find entities near a specific position.
         *
         * Params:
         * - position: { x, y, z } (required) - Center point
         * - radius: number (default: 50) - Search radius
         * - type: string (optional) - Filter by entity type
         * - limit: number (default: 20) - Max results
         */
        const { position, radius = 50, type, limit: maxResults = 20 } = params as {
          position?: { x?: number; y?: number; z?: number };
          radius?: number;
          type?: string;
          limit?: number;
        };

        if (!position) {
          return NextResponse.json({
            success: false,
            action: "find-nearby",
            error: "Missing required: position",
          }, { status: 400 });
        }

        const centerX = position.x ?? 0;
        const centerY = position.y ?? 0;
        const centerZ = position.z ?? 0;

        // Fetch all entities (with type filter if provided)
        const queryParams = new URLSearchParams({
          limit: "200", // Get more to filter locally
          ...(type && { type }),
        });

        const worldRes = await fetch(`${GAME_SERVER_URL}/api/world/entities?${queryParams}`);
        if (!worldRes.ok) {
          return NextResponse.json({
            success: false,
            action: "find-nearby",
            error: "Game server not available",
          }, { status: 503 });
        }

        const worldData = await worldRes.json();
        const allEntities = worldData.entities || [];

        // Calculate distance and filter
        const nearbyEntities = allEntities
          .map((entity: { id: string; name: string; type: string; position: { x: number; y: number; z: number } }) => {
            const dx = entity.position.x - centerX;
            const dy = entity.position.y - centerY;
            const dz = entity.position.z - centerZ;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            return { ...entity, distance };
          })
          .filter((e: { distance: number }) => e.distance <= radius)
          .sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance)
          .slice(0, maxResults);

        return NextResponse.json({
          success: true,
          action: "find-nearby",
          data: {
            center: { x: centerX, y: centerY, z: centerZ },
            radius,
            entities: nearbyEntities,
            count: nearbyEntities.length,
          },
        });
      }

      case "find-entity": {
        /**
         * Find entity by name (search).
         *
         * Params:
         * - name: string (required) - Name to search for
         * - type: string (optional) - Filter by type
         */
        const { name, type } = params as { name?: string; type?: string };

        if (!name) {
          return NextResponse.json({
            success: false,
            action: "find-entity",
            error: "Missing required: name",
          }, { status: 400 });
        }

        const queryParams = new URLSearchParams({
          search: name,
          limit: "50",
          ...(type && { type }),
        });

        const searchRes = await fetch(`${GAME_SERVER_URL}/api/world/entities?${queryParams}`);
        const searchData = await searchRes.json();

        return NextResponse.json({
          success: true,
          action: "find-entity",
          data: {
            query: name,
            entities: searchData.entities || [],
            count: searchData.entities?.length || 0,
          },
        });
      }

      case "update-entity": {
        /**
         * Update an existing entity (position, scale, etc).
         *
         * Params:
         * - id: string (required) - Entity ID
         * - position: { x, y, z } (optional)
         * - rotation: { x, y, z } (optional)
         * - scale: { x, y, z } (optional)
         * - name: string (optional)
         */
        const { id, position, rotation, scale, name } = params as {
          id?: string;
          position?: { x?: number; y?: number; z?: number };
          rotation?: { x?: number; y?: number; z?: number };
          scale?: { x?: number; y?: number; z?: number };
          name?: string;
        };

        if (!id) {
          return NextResponse.json({
            success: false,
            action: "update-entity",
            error: "Missing required: id",
          }, { status: 400 });
        }

        const updateRes = await fetch(`${GAME_SERVER_URL}/api/world/entities/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position, rotation, scale, name }),
        });
        const updateData = await updateRes.json();

        return NextResponse.json({
          success: updateData.success !== false,
          action: "update-entity",
          data: updateData,
          error: updateData.error,
        });
      }

      case "place-entity": {
        /**
         * Place an entity in the game world.
         *
         * Params:
         * - name: string (required) - Entity name
         * - type: string (optional) - Entity type (default: "prop")
         * - modelPath: string (optional) - Path to 3D model
         * - position: { x, y, z } (optional) - World position
         * - scale: { x, y, z } (optional) - Scale
         */
        const { name, type = "prop", modelPath, position, scale } = params as {
          name?: string;
          type?: string;
          modelPath?: string;
          position?: { x?: number; y?: number; z?: number };
          scale?: { x?: number; y?: number; z?: number };
        };

        if (!name) {
          return NextResponse.json({
            success: false,
            action: "place-entity",
            error: "Missing required: name",
          }, { status: 400 });
        }

        const entityRes = await fetch(`${GAME_SERVER_URL}/api/world/entities`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            type,
            modelPath,
            position: position || { x: 0, y: 0, z: 0 },
            scale: scale || { x: 1, y: 1, z: 1 },
          }),
        });

        if (!entityRes.ok) {
          return NextResponse.json({
            success: false,
            action: "place-entity",
            error: "Failed to place entity in game world",
          }, { status: 500 });
        }

        const entityData = await entityRes.json();

        return NextResponse.json({
          success: true,
          action: "place-entity",
          data: entityData,
        });
      }

      case "remove-entity": {
        /**
         * Remove an entity from the game world.
         *
         * Params:
         * - id: string (required) - Entity ID
         */
        const { id } = params as { id?: string };

        if (!id) {
          return NextResponse.json({
            success: false,
            action: "remove-entity",
            error: "Missing required: id",
          }, { status: 400 });
        }

        const deleteRes = await fetch(`${GAME_SERVER_URL}/api/world/entities/${id}`, {
          method: "DELETE",
        });

        const deleteData = await deleteRes.json();

        return NextResponse.json({
          success: deleteData.success !== false,
          action: "remove-entity",
          data: deleteData,
          error: deleteData.error,
        });
      }

      // ============================================================
      // STATUS / POLLING
      // ============================================================

      case "status": {
        /**
         * Check status of an async task (3D generation, etc).
         *
         * Params:
         * - taskId: string (required) - Task ID from generate-3d
         */
        const { taskId } = params as { taskId?: string };

        if (!taskId) {
          return NextResponse.json({
            success: false,
            action: "status",
            error: "Missing required: taskId",
          }, { status: 400 });
        }

        const statusRes = await fetch(`${getBaseUrl(request)}/api/meshy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "status", taskId }),
        });
        const statusData = await statusRes.json();

        return NextResponse.json({
          success: true,
          action: "status",
          taskId,
          status: statusData.status,
          data: {
            progress: statusData.progress,
            modelUrl: statusData.model_urls?.glb,
            thumbnailUrl: statusData.thumbnail_url,
            textureUrls: statusData.texture_urls,
            error: statusData.task_error,
          },
        });
      }

      case "batch-status": {
        /**
         * Check status of multiple async tasks at once.
         * Useful for monitoring parallel generation jobs.
         *
         * Params:
         * - taskIds: string[] (required) - Array of task IDs
         */
        const { taskIds } = params as { taskIds?: string[] };

        if (!taskIds || taskIds.length === 0) {
          return NextResponse.json({
            success: false,
            action: "batch-status",
            error: "Missing required: taskIds (array)",
          }, { status: 400 });
        }

        const results = await Promise.all(
          taskIds.map(async (taskId) => {
            try {
              const statusRes = await fetch(`${getBaseUrl(request)}/api/meshy`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "status", taskId }),
              });
              const statusData = await statusRes.json();
              return {
                taskId,
                status: statusData.status,
                progress: statusData.progress,
                modelUrl: statusData.model_urls?.glb,
                error: statusData.task_error,
              };
            } catch {
              return { taskId, status: "error", error: "Failed to fetch status" };
            }
          })
        );

        const summary = {
          total: results.length,
          pending: results.filter(r => r.status === "PENDING").length,
          processing: results.filter(r => ["IN_PROGRESS", "PROCESSING"].includes(r.status)).length,
          completed: results.filter(r => r.status === "SUCCEEDED").length,
          failed: results.filter(r => ["FAILED", "error"].includes(r.status)).length,
        };

        return NextResponse.json({
          success: true,
          action: "batch-status",
          data: { tasks: results, summary },
        });
      }

      case "describe": {
        /**
         * Get detailed schema and examples for a specific action.
         * Helps agents understand exactly how to call an action.
         *
         * Params:
         * - actionName: string (required)
         */
        const { actionName } = params as { actionName?: string };

        if (!actionName) {
          return NextResponse.json({
            success: false,
            action: "describe",
            error: "Missing required: actionName",
          }, { status: 400 });
        }

        const actionSchemas: Record<string, object> = {
          "generate-3d": {
            description: "Generate a 3D model using Meshy AI",
            params: {
              prompt: { type: "string", required: true, description: "Description of the 3D model to generate" },
              imageUrl: { type: "string", required: false, description: "Image URL for image-to-3D mode" },
              mode: { type: "string", enum: ["text", "image"], default: "text", description: "Generation mode" },
              style: { type: "string", enum: ["realistic", "stylized"], default: "realistic" },
            },
            returns: { taskId: "string", status: "processing" },
            example: { action: "generate-3d", params: { prompt: "A medieval iron sword with leather-wrapped handle" } },
            notes: "Returns a taskId. Use 'status' action to poll for completion. After preview completes, use 'refine-3d' to add textures.",
            estimatedTime: "2-5 minutes for preview, 2-5 minutes for refine",
          },
          "generate-image": {
            description: "Generate concept art, sprites, or textures",
            params: {
              prompt: { type: "string", required: true, description: "What to generate" },
              type: { type: "string", enum: ["concept-art", "sprite", "texture"], default: "concept-art" },
              style: { type: "string", description: "Art style (realistic, stylized, pixel, painterly)" },
              assetType: { type: "string", description: "For concept-art: character, npc, mob, weapon, armor, item, prop" },
            },
            returns: { id: "string", url: "string" },
            example: { action: "generate-image", params: { prompt: "A fierce goblin warrior", type: "concept-art", assetType: "mob" } },
            estimatedTime: "10-30 seconds",
          },
          "generate-dialogue": {
            description: "Generate full NPC dialogue tree with backstory",
            params: {
              npcName: { type: "string", required: true },
              npcDescription: { type: "string", required: true },
              npcCategory: { type: "string", enum: ["mob", "boss", "neutral", "quest"], default: "neutral" },
              npcRole: { type: "string", description: "e.g., shopkeeper, guard, quest-giver" },
              services: { type: "array", items: "string", description: "e.g., ['shop', 'bank', 'repair']" },
              generateBackstory: { type: "boolean", default: true },
            },
            returns: { dialogue: "DialogueTree", backstory: "string" },
            example: { action: "generate-dialogue", params: { npcName: "Grimshaw", npcDescription: "A grumpy dwarf blacksmith", npcRole: "shopkeeper", services: ["shop", "repair"] } },
          },
          "place-entity": {
            description: "Add a new entity to the live game world",
            params: {
              name: { type: "string", required: true },
              type: { type: "string", enum: ["prop", "npc", "mob", "item", "resource", "bank"], default: "prop" },
              modelPath: { type: "string", description: "Path to 3D model GLB/VRM" },
              position: { type: "object", properties: { x: "number", y: "number", z: "number" }, default: { x: 0, y: 0, z: 0 } },
              scale: { type: "object", properties: { x: "number", y: "number", z: "number" }, default: { x: 1, y: 1, z: 1 } },
              rotation: { type: "object", properties: { x: "number", y: "number", z: "number" } },
            },
            returns: { id: "string", entity: "object" },
            example: { action: "place-entity", params: { name: "Oak Tree", type: "resource", position: { x: 50, y: 0, z: 30 } } },
          },
          "find-nearby": {
            description: "Find entities within a radius of a position",
            params: {
              position: { type: "object", required: true, properties: { x: "number", y: "number", z: "number" } },
              radius: { type: "number", default: 50 },
              type: { type: "string", description: "Filter by entity type" },
              limit: { type: "number", default: 20 },
            },
            returns: { entities: "array", count: "number" },
            example: { action: "find-nearby", params: { position: { x: 100, y: 0, z: 100 }, radius: 30, type: "mob" } },
          },
        };

        const schema = actionSchemas[actionName];
        if (!schema) {
          return NextResponse.json({
            success: false,
            action: "describe",
            error: `Unknown action: ${actionName}. Use 'help' to see all actions.`,
          }, { status: 400 });
        }

        return NextResponse.json({
          success: true,
          action: "describe",
          data: { actionName, ...schema },
        });
      }

      case "validate": {
        /**
         * Validate parameters for an action without executing it.
         * Helps catch errors before wasting API credits.
         *
         * Params:
         * - actionName: string (required)
         * - params: object (required) - Parameters to validate
         */
        const { actionName, params: actionParams } = params as {
          actionName?: string;
          params?: Record<string, unknown>;
        };

        if (!actionName) {
          return NextResponse.json({
            success: false,
            action: "validate",
            error: "Missing required: actionName",
          }, { status: 400 });
        }

        const validationRules: Record<string, { required: string[]; types: Record<string, string> }> = {
          "generate-3d": { required: ["prompt"], types: { prompt: "string", imageUrl: "string", mode: "string", style: "string" } },
          "generate-image": { required: ["prompt"], types: { prompt: "string", type: "string", style: "string", assetType: "string" } },
          "generate-dialogue": { required: ["npcName", "npcDescription"], types: { npcName: "string", npcDescription: "string" } },
          "place-entity": { required: ["name"], types: { name: "string", type: "string", position: "object" } },
          "find-nearby": { required: ["position"], types: { position: "object", radius: "number", type: "string" } },
          "export-asset": { required: ["assetId", "targetType"], types: { assetId: "string", targetType: "string" } },
        };

        const rules = validationRules[actionName];
        if (!rules) {
          return NextResponse.json({
            success: true,
            action: "validate",
            data: { valid: true, message: "No validation rules defined for this action" },
          });
        }

        const errors: string[] = [];
        const warnings: string[] = [];

        // Check required params
        for (const req of rules.required) {
          if (!actionParams || actionParams[req] === undefined) {
            errors.push(`Missing required parameter: ${req}`);
          }
        }

        // Check types
        if (actionParams) {
          for (const [key, expectedType] of Object.entries(rules.types)) {
            if (actionParams[key] !== undefined) {
              const actualType = typeof actionParams[key];
              if (actualType !== expectedType) {
                warnings.push(`Parameter '${key}' should be ${expectedType}, got ${actualType}`);
              }
            }
          }
        }

        return NextResponse.json({
          success: true,
          action: "validate",
          data: {
            valid: errors.length === 0,
            errors,
            warnings,
            checkedParams: Object.keys(actionParams || {}),
          },
        });
      }

      case "estimate": {
        /**
         * Estimate time and cost for an action.
         * Helps agents plan and budget operations.
         *
         * Params:
         * - actionName: string (required)
         * - params: object (optional) - For more accurate estimates
         */
        const { actionName } = params as { actionName?: string };

        if (!actionName) {
          return NextResponse.json({
            success: false,
            action: "estimate",
            error: "Missing required: actionName",
          }, { status: 400 });
        }

        const estimates: Record<string, { timeSeconds: [number, number]; credits?: number; notes?: string }> = {
          "generate-3d": { timeSeconds: [120, 300], credits: 1, notes: "Preview stage. Add another 2-5 min for refine." },
          "refine-3d": { timeSeconds: [120, 300], credits: 1, notes: "Texturing stage after preview." },
          "generate-image": { timeSeconds: [10, 30], notes: "Fast, uses AI Gateway." },
          "generate-sprites": { timeSeconds: [15, 45], notes: "Generates multiple views." },
          "generate-sfx": { timeSeconds: [5, 15], credits: 0.1, notes: "ElevenLabs Sound Effects API." },
          "generate-music": { timeSeconds: [10, 60], credits: 0.5, notes: "Longer music takes more time." },
          "generate-voice": { timeSeconds: [2, 10], credits: 0.05, notes: "ElevenLabs TTS, per character." },
          "generate-dialogue": { timeSeconds: [15, 45], notes: "AI text generation." },
          "generate-content": { timeSeconds: [5, 20], notes: "AI text generation." },
          "create-variant": { timeSeconds: [180, 600], credits: 1, notes: "Meshy retexture API." },
          "retexture-model": { timeSeconds: [180, 600], credits: 1, notes: "Meshy retexture API." },
          "convert-to-avatar": { timeSeconds: [10, 60], notes: "VRM conversion, depends on model complexity." },
          "rig-hands": { timeSeconds: [5, 30], notes: "Server-side processing." },
          "fit-armor": { timeSeconds: [5, 30], notes: "Server-side mesh processing." },
          "export-asset": { timeSeconds: [1, 5], notes: "File copy operations." },
          "place-entity": { timeSeconds: [0.1, 0.5], notes: "Near-instant." },
          "get-world": { timeSeconds: [0.1, 1], notes: "Depends on entity count." },
        };

        const estimate = estimates[actionName];
        if (!estimate) {
          return NextResponse.json({
            success: true,
            action: "estimate",
            data: {
              actionName,
              timeSeconds: [0, 2],
              notes: "Fast operation, no specific estimate available.",
            },
          });
        }

        return NextResponse.json({
          success: true,
          action: "estimate",
          data: {
            actionName,
            estimatedTimeRange: `${estimate.timeSeconds[0]}-${estimate.timeSeconds[1]} seconds`,
            timeSeconds: estimate.timeSeconds,
            credits: estimate.credits,
            notes: estimate.notes,
          },
        });
      }

      case "search": {
        /**
         * Search across all asset types and entities.
         * Unified search for finding anything in the system.
         *
         * Params:
         * - query: string (required) - Search term
         * - types: string[] (optional) - Filter by types ["assets", "entities", "items", "mobs"]
         * - limit: number (default: 20)
         */
        const { query, types, limit = 20 } = params as {
          query?: string;
          types?: string[];
          limit?: number;
        };

        if (!query) {
          return NextResponse.json({
            success: false,
            action: "search",
            error: "Missing required: query",
          }, { status: 400 });
        }

        const results: { category: string; items: unknown[] }[] = [];
        const searchTypes = types || ["entities", "assets"];

        // Search entities in game world
        if (searchTypes.includes("entities") || searchTypes.includes("all")) {
          try {
            const entityRes = await fetch(`${GAME_SERVER_URL}/api/world/entities?search=${encodeURIComponent(query)}&limit=${limit}`);
            if (entityRes.ok) {
              const entityData = await entityRes.json();
              if (entityData.entities?.length > 0) {
                results.push({ category: "World Entities", items: entityData.entities });
              }
            }
          } catch { /* ignore */ }
        }

        // Search game content (items, mobs)
        if (searchTypes.includes("items") || searchTypes.includes("all")) {
          try {
            const contentRes = await fetch(`${getBaseUrl(request)}/api/content/list?type=items&search=${encodeURIComponent(query)}`);
            if (contentRes.ok) {
              const contentData = await contentRes.json();
              if (contentData.items?.length > 0) {
                results.push({ category: "Game Items", items: contentData.items.slice(0, limit) });
              }
            }
          } catch { /* ignore */ }
        }

        return NextResponse.json({
          success: true,
          action: "search",
          data: {
            query,
            results,
            totalCategories: results.length,
            totalItems: results.reduce((sum, cat) => sum + cat.items.length, 0),
          },
        });
      }

      case "recent": {
        /**
         * Get recently created or modified items.
         * Helps agents track their work and find recent assets.
         *
         * Params:
         * - type: "assets" | "entities" | "drafts" (default: "assets")
         * - limit: number (default: 10)
         */
        const { type = "assets", limit = 10 } = params as {
          type?: string;
          limit?: number;
        };

        if (type === "drafts") {
          const draftsRes = await fetch(`${getBaseUrl(request)}/api/export`);
          const draftsData = await draftsRes.json();
          const recentDrafts = Array.isArray(draftsData)
            ? draftsData.sort((a: { exportedAt?: string }, b: { exportedAt?: string }) =>
                new Date(b.exportedAt || 0).getTime() - new Date(a.exportedAt || 0).getTime()
              ).slice(0, limit)
            : [];

          return NextResponse.json({
            success: true,
            action: "recent",
            data: { type, items: recentDrafts, count: recentDrafts.length },
          });
        }

        if (type === "entities") {
          const entitiesRes = await fetch(`${GAME_SERVER_URL}/api/world/entities?limit=${limit}`);
          if (entitiesRes.ok) {
            const entitiesData = await entitiesRes.json();
            return NextResponse.json({
              success: true,
              action: "recent",
              data: { type, items: entitiesData.entities || [], count: entitiesData.entities?.length || 0 },
            });
          }
        }

        // Default: list assets
        const assetsRes = await fetch(`${getBaseUrl(request)}/api/assets/local`);
        if (assetsRes.ok) {
          const assetsData = await assetsRes.json();
          const assets = Array.isArray(assetsData) ? assetsData.slice(0, limit) : [];
          return NextResponse.json({
            success: true,
            action: "recent",
            data: { type, items: assets, count: assets.length },
          });
        }

        return NextResponse.json({
          success: true,
          action: "recent",
          data: { type, items: [], count: 0 },
        });
      }

      // ============================================================
      // HELP / DISCOVERY
      // ============================================================

      // ============================================================
      // DIALOGUE GENERATION
      // ============================================================

      case "generate-dialogue": {
        /**
         * Generate NPC dialogue tree.
         *
         * Params:
         * - npcName: string (required)
         * - npcDescription: string (required)
         * - npcCategory: "mob" | "boss" | "neutral" | "quest" (default: "neutral")
         * - npcPersonality: string (optional)
         * - npcRole: string (optional) - e.g., "shopkeeper", "guard"
         * - services: string[] (optional) - e.g., ["shop", "bank"]
         * - questContext: string (optional)
         * - lore: string (optional) - World lore context
         * - generateBackstory: boolean (default: true)
         */
        const {
          npcName, npcDescription, npcCategory = "neutral",
          npcPersonality, npcRole, services, questContext, lore,
          generateBackstory = true
        } = params as {
          npcName?: string;
          npcDescription?: string;
          npcCategory?: string;
          npcPersonality?: string;
          npcRole?: string;
          services?: string[];
          questContext?: string;
          lore?: string;
          generateBackstory?: boolean;
        };

        if (!npcName || !npcDescription) {
          return NextResponse.json({
            success: false,
            action: "generate-dialogue",
            error: "Missing required: npcName, npcDescription",
          }, { status: 400 });
        }

        const dialogueRes = await fetch(`${getBaseUrl(request)}/api/content/dialogue`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: generateBackstory ? "generateFull" : "generate",
            npcName,
            npcDescription,
            npcCategory,
            npcPersonality,
            npcRole,
            services,
            questContext,
            lore,
          }),
        });
        const dialogueData = await dialogueRes.json();

        return NextResponse.json({
          success: dialogueData.success !== false,
          action: "generate-dialogue",
          data: dialogueData,
          error: dialogueData.error,
        });
      }

      // ============================================================
      // GAME DATA MANAGEMENT
      // ============================================================

      case "get-game-data": {
        /**
         * Get game data (items, mobs, resources from manifests).
         *
         * Params:
         * - type: "item" | "npc" | "mob" | "resource" (required)
         * - id: string (required) - Entity ID
         */
        const { type, id } = params as { type?: string; id?: string };

        if (!type || !id) {
          return NextResponse.json({
            success: false,
            action: "get-game-data",
            error: "Missing required: type, id",
          }, { status: 400 });
        }

        const dataRes = await fetch(`${getBaseUrl(request)}/api/game/data?type=${type}&id=${id}`);
        const data = await dataRes.json();

        return NextResponse.json({
          success: !data.error,
          action: "get-game-data",
          data: data.error ? undefined : data,
          error: data.error,
        });
      }

      case "list-game-content": {
        /**
         * List all game content (items, mobs, resources).
         *
         * Params:
         * - type: "items" | "npcs" | "resources" | "all" (default: "all")
         */
        const { type = "all" } = params as { type?: string };

        const contentRes = await fetch(`${getBaseUrl(request)}/api/content/list?type=${type}`);
        const contentData = await contentRes.json();

        return NextResponse.json({
          success: true,
          action: "list-game-content",
          data: contentData,
        });
      }

      // ============================================================
      // EXPORT & PROMOTION
      // ============================================================

      case "export-asset": {
        /**
         * Export a generated asset to the game server for testing.
         *
         * Params:
         * - assetId: string (required) - ID of generated asset
         * - targetType: "item" | "npc" | "resource" | "avatar" (required)
         * - manifestEntry: object (optional) - Manifest data
         *   - id, name, type, description, rarity, value, equipSlot, category, level
         * - isDraft: boolean (default: true)
         */
        const { assetId, targetType, manifestEntry, isDraft = true } = params as {
          assetId?: string;
          targetType?: string;
          manifestEntry?: Record<string, unknown>;
          isDraft?: boolean;
        };

        if (!assetId || !targetType) {
          return NextResponse.json({
            success: false,
            action: "export-asset",
            error: "Missing required: assetId, targetType",
          }, { status: 400 });
        }

        const exportRes = await fetch(`${getBaseUrl(request)}/api/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId, targetType, manifestEntry, isDraft }),
        });
        const exportData = await exportRes.json();

        return NextResponse.json({
          success: exportData.success !== false,
          action: "export-asset",
          data: exportData,
          error: exportData.error,
        });
      }

      case "promote-asset": {
        /**
         * Promote a draft asset to production (adds to manifest).
         *
         * Params:
         * - assetId: string (required)
         * - manifestEntry: object (required) - Full manifest entry data
         */
        const { assetId, manifestEntry } = params as {
          assetId?: string;
          manifestEntry?: Record<string, unknown>;
        };

        if (!assetId || !manifestEntry) {
          return NextResponse.json({
            success: false,
            action: "promote-asset",
            error: "Missing required: assetId, manifestEntry",
          }, { status: 400 });
        }

        const promoteRes = await fetch(`${getBaseUrl(request)}/api/export/promote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId, manifestEntry }),
        });
        const promoteData = await promoteRes.json();

        return NextResponse.json({
          success: promoteData.success !== false,
          action: "promote-asset",
          data: promoteData,
          error: promoteData.error,
        });
      }

      case "list-drafts": {
        /**
         * List exported draft assets awaiting promotion.
         */
        const draftsRes = await fetch(`${getBaseUrl(request)}/api/export`);
        const draftsData = await draftsRes.json();

        return NextResponse.json({
          success: true,
          action: "list-drafts",
          data: { drafts: draftsData },
        });
      }

      // ============================================================
      // TEXTURE VARIANTS
      // ============================================================

      case "create-variant": {
        /**
         * Create a texture variant of an existing 3D model.
         *
         * Params:
         * - baseModelId: string (required) - Original model ID
         * - baseModelUrl: string (required) - URL to base model GLB
         * - variantName: string (required) - Name for the variant
         * - prompt: string (optional) - Texture style prompt
         * - artStyle: "realistic" | "stylized" (default: "realistic")
         */
        const { baseModelId, baseModelUrl, variantName, prompt, artStyle = "realistic" } = params as {
          baseModelId?: string;
          baseModelUrl?: string;
          variantName?: string;
          prompt?: string;
          artStyle?: string;
        };

        if (!baseModelId || !baseModelUrl || !variantName) {
          return NextResponse.json({
            success: false,
            action: "create-variant",
            error: "Missing required: baseModelId, baseModelUrl, variantName",
          }, { status: 400 });
        }

        const variantRes = await fetch(`${getBaseUrl(request)}/api/variants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            baseModelId,
            baseModelUrl,
            variant: { name: variantName, prompt },
            artStyle,
          }),
        });
        const variantData = await variantRes.json();

        return NextResponse.json({
          success: variantData.success !== false,
          action: "create-variant",
          data: variantData.variant,
          error: variantData.error,
        });
      }

      // ============================================================
      // IMAGE ENHANCEMENT
      // ============================================================

      case "enhance-image": {
        /**
         * Enhance/upscale an image.
         *
         * Params:
         * - imageUrl: string (required) - URL of image to enhance
         * - type: "upscale" | "regenerate" (default: "upscale")
         */
        const { imageUrl, type = "upscale" } = params as {
          imageUrl?: string;
          type?: string;
        };

        if (!imageUrl) {
          return NextResponse.json({
            success: false,
            action: "enhance-image",
            error: "Missing required: imageUrl",
          }, { status: 400 });
        }

        const endpoint = type === "regenerate"
          ? "/api/enhancement/regenerate"
          : "/api/enhancement";

        const enhanceRes = await fetch(`${getBaseUrl(request)}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl }),
        });
        const enhanceData = await enhanceRes.json();

        return NextResponse.json({
          success: enhanceData.success !== false,
          action: "enhance-image",
          data: enhanceData,
          error: enhanceData.error,
        });
      }

      case "retexture-model": {
        /**
         * Retexture a 3D model with new materials.
         *
         * Params:
         * - modelUrl: string (required) - URL of model to retexture
         * - prompt: string (required) - Texture style prompt
         * - artStyle: "realistic" | "stylized" (default: "realistic")
         */
        const { modelUrl, prompt, artStyle = "realistic" } = params as {
          modelUrl?: string;
          prompt?: string;
          artStyle?: string;
        };

        if (!modelUrl || !prompt) {
          return NextResponse.json({
            success: false,
            action: "retexture-model",
            error: "Missing required: modelUrl, prompt",
          }, { status: 400 });
        }

        const retextureRes = await fetch(`${getBaseUrl(request)}/api/enhancement/retexture`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelUrl, prompt, artStyle }),
        });
        const retextureData = await retextureRes.json();

        return NextResponse.json({
          success: retextureData.success !== false,
          action: "retexture-model",
          taskId: retextureData.taskId,
          status: retextureData.taskId ? "processing" : undefined,
          data: retextureData,
          error: retextureData.error,
        });
      }

      // ============================================================
      // AVATAR / VRM CONVERSION
      // ============================================================

      case "convert-to-avatar": {
        /**
         * Convert a 3D model to VRM avatar format.
         *
         * Params:
         * - modelUrl: string (required) - URL of model to convert
         * - avatarName: string (optional)
         */
        const { modelUrl, avatarName } = params as {
          modelUrl?: string;
          avatarName?: string;
        };

        if (!modelUrl) {
          return NextResponse.json({
            success: false,
            action: "convert-to-avatar",
            error: "Missing required: modelUrl",
          }, { status: 400 });
        }

        const vrmRes = await fetch(`${getBaseUrl(request)}/api/vrm/convert`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelUrl, name: avatarName }),
        });
        const vrmData = await vrmRes.json();

        return NextResponse.json({
          success: vrmData.success !== false,
          action: "convert-to-avatar",
          data: vrmData,
          error: vrmData.error,
        });
      }

      // ============================================================
      // GAME STORES / SHOPS
      // ============================================================

      case "list-stores": {
        /**
         * List all in-game stores/shops.
         */
        const storesRes = await fetch(`${getBaseUrl(request)}/api/game/stores`);
        const storesData = await storesRes.json();

        return NextResponse.json({
          success: true,
          action: "list-stores",
          data: storesData,
        });
      }

      case "update-store": {
        /**
         * Update an in-game store's inventory.
         *
         * Params:
         * - storeId: string (required)
         * - inventory: array of { itemId, stock, price }
         */
        const { storeId, inventory } = params as {
          storeId?: string;
          inventory?: Array<{ itemId: string; stock: number; price: number }>;
        };

        if (!storeId) {
          return NextResponse.json({
            success: false,
            action: "update-store",
            error: "Missing required: storeId",
          }, { status: 400 });
        }

        const storeRes = await fetch(`${getBaseUrl(request)}/api/game/stores`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeId, inventory }),
        });
        const storeData = await storeRes.json();

        return NextResponse.json({
          success: storeData.success !== false,
          action: "update-store",
          data: storeData,
          error: storeData.error,
        });
      }

      // ============================================================
      // BULK WORLD OPERATIONS
      // ============================================================

      case "bulk-place-entities": {
        /**
         * Place multiple entities at once.
         *
         * Params:
         * - entities: array of { name, type, modelPath, position, scale, rotation }
         */
        const { entities } = params as {
          entities?: Array<{
            name: string;
            type?: string;
            modelPath?: string;
            position?: { x?: number; y?: number; z?: number };
            scale?: { x?: number; y?: number; z?: number };
            rotation?: { x?: number; y?: number; z?: number };
          }>;
        };

        if (!entities || entities.length === 0) {
          return NextResponse.json({
            success: false,
            action: "bulk-place-entities",
            error: "Missing required: entities array",
          }, { status: 400 });
        }

        const bulkRes = await fetch(`${GAME_SERVER_URL}/api/world/entities/bulk`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entities }),
        });
        const bulkData = await bulkRes.json();

        return NextResponse.json({
          success: bulkData.success !== false,
          action: "bulk-place-entities",
          data: bulkData,
          error: bulkData.error,
        });
      }

      case "bulk-remove-entities": {
        /**
         * Remove multiple entities at once.
         *
         * Params:
         * - ids: string[] - Array of entity IDs
         */
        const { ids } = params as { ids?: string[] };

        if (!ids || ids.length === 0) {
          return NextResponse.json({
            success: false,
            action: "bulk-remove-entities",
            error: "Missing required: ids array",
          }, { status: 400 });
        }

        const bulkDeleteRes = await fetch(`${GAME_SERVER_URL}/api/world/entities/bulk`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        const bulkDeleteData = await bulkDeleteRes.json();

        return NextResponse.json({
          success: bulkDeleteData.success !== false,
          action: "bulk-remove-entities",
          data: bulkDeleteData,
          error: bulkDeleteData.error,
        });
      }

      // ============================================================
      // VOICE LIBRARY
      // ============================================================

      case "list-voices": {
        /**
         * List available TTS voices from ElevenLabs.
         */
        const voicesRes = await fetch(`${getBaseUrl(request)}/api/audio/voices`);
        const voicesData = await voicesRes.json();

        return NextResponse.json({
          success: true,
          action: "list-voices",
          data: voicesData,
        });
      }

      // ============================================================
      // TEST IN GAME
      // ============================================================

      case "test-in-game": {
        /**
         * Test an asset in the running game.
         *
         * Params:
         * - assetId: string (required)
         * - position: { x, y, z } (optional)
         */
        const { assetId, position } = params as {
          assetId?: string;
          position?: { x?: number; y?: number; z?: number };
        };

        if (!assetId) {
          return NextResponse.json({
            success: false,
            action: "test-in-game",
            error: "Missing required: assetId",
          }, { status: 400 });
        }

        const testRes = await fetch(`${getBaseUrl(request)}/api/test-in-game`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId, position }),
        });
        const testData = await testRes.json();

        return NextResponse.json({
          success: testData.success !== false,
          action: "test-in-game",
          data: testData,
          error: testData.error,
        });
      }

      // ============================================================
      // STORAGE MANAGEMENT
      // ============================================================

      case "storage-status": {
        /**
         * Get status of all storage backends.
         * Shows which storage options are available and configured.
         */
        const statusRes = await fetch(`${getBaseUrl(request)}/api/settings/status`);
        const statusData = await statusRes.json();

        // Check if game server is available for CDN info
        let gameServerAvailable = false;
        try {
          const gameRes = await fetch(`${GAME_SERVER_URL}/health`, { signal: AbortSignal.timeout(2000) });
          gameServerAvailable = gameRes.ok;
        } catch { /* ignore */ }

        return NextResponse.json({
          success: true,
          action: "storage-status",
          data: {
            backends: {
              local: {
                available: true,
                description: "Local filesystem storage (assets/ folder)",
                usage: "Development, temporary storage",
              },
              supabase: {
                available: statusData.supabase?.configured || false,
                buckets: statusData.supabase?.configured ? [
                  "image-generation",
                  "audio-generations",
                  "content-generations",
                  "meshy-models",
                  "vrm-conversion",
                  "concept-art-pipeline",
                ] : [],
                description: "Supabase S3-compatible storage",
                usage: "Production asset storage, persisted across deployments",
              },
              cdn: {
                available: gameServerAvailable,
                url: process.env.CDN_URL || "https://cdn.hyperscape.dev",
                description: "Cloudflare CDN for production game assets",
                usage: "Serving assets to players in-game",
              },
              gameServer: {
                available: gameServerAvailable,
                url: GAME_SERVER_URL,
                assetsPath: "/world/assets/",
                description: "Game server local assets (for testing)",
              },
            },
            defaultStorage: statusData.supabase?.configured ? "supabase" : "local",
          },
        });
      }

      case "list-storage": {
        /**
         * List assets from a specific storage backend.
         *
         * Params:
         * - storage: "local" | "supabase" | "cdn" | "game-server" (default: auto-detect)
         * - folder: string (optional) - Subfolder to list
         * - limit: number (default: 50)
         */
        const { storage = "auto", folder, limit = 50 } = params as {
          storage?: string;
          folder?: string;
          limit?: number;
        };

        const results: { storage: string; assets: unknown[]; count: number }[] = [];

        // List from local storage
        if (storage === "local" || storage === "auto" || storage === "all") {
          try {
            const localRes = await fetch(`${getBaseUrl(request)}/api/assets/local?limit=${limit}`);
            if (localRes.ok) {
              const localData = await localRes.json();
              results.push({
                storage: "local",
                assets: Array.isArray(localData) ? localData : [],
                count: Array.isArray(localData) ? localData.length : 0,
              });
            }
          } catch { /* ignore */ }
        }

        // List from Supabase (FORGE assets)
        if (storage === "supabase" || storage === "forge" || storage === "auto" || storage === "all") {
          try {
            const forgeRes = await fetch(`${getBaseUrl(request)}/api/assets/forge?folder=${folder || ""}&limit=${limit}`);
            if (forgeRes.ok) {
              const forgeData = await forgeRes.json();
              results.push({
                storage: "supabase",
                assets: Array.isArray(forgeData) ? forgeData : forgeData.assets || [],
                count: Array.isArray(forgeData) ? forgeData.length : forgeData.assets?.length || 0,
              });
            }
          } catch { /* ignore */ }
        }

        // List from CDN
        if (storage === "cdn" || storage === "all") {
          try {
            const cdnRes = await fetch(`${getBaseUrl(request)}/api/assets/cdn?limit=${limit}`);
            if (cdnRes.ok) {
              const cdnData = await cdnRes.json();
              results.push({
                storage: "cdn",
                assets: Array.isArray(cdnData) ? cdnData : cdnData.assets || [],
                count: Array.isArray(cdnData) ? cdnData.length : cdnData.assets?.length || 0,
              });
            }
          } catch { /* ignore */ }
        }

        return NextResponse.json({
          success: true,
          action: "list-storage",
          data: {
            queried: storage,
            results,
            totalAssets: results.reduce((sum, r) => sum + r.count, 0),
          },
        });
      }

      case "get-asset": {
        /**
         * Get detailed info about an asset including all URLs.
         *
         * Params:
         * - assetId: string (required)
         */
        const { assetId } = params as { assetId?: string };

        if (!assetId) {
          return NextResponse.json({
            success: false,
            action: "get-asset",
            error: "Missing required: assetId",
          }, { status: 400 });
        }

        const assetRes = await fetch(`${getBaseUrl(request)}/api/assets/${assetId}`);
        if (!assetRes.ok) {
          return NextResponse.json({
            success: false,
            action: "get-asset",
            error: "Asset not found",
          }, { status: 404 });
        }

        const assetData = await assetRes.json();

        return NextResponse.json({
          success: true,
          action: "get-asset",
          data: {
            ...assetData,
            urls: {
              model: assetData.modelUrl,
              thumbnail: assetData.thumbnailUrl,
              vrm: assetData.vrmUrl,
              preview: assetData.previewUrl,
            },
            storage: assetData.source || "unknown",
          },
        });
      }

      case "save-asset": {
        /**
         * Save/upload an asset to storage.
         *
         * Params:
         * - assetId: string (optional - auto-generated if not provided)
         * - modelData: string (required) - Base64-encoded GLB/VRM data
         * - modelFormat: "glb" | "vrm" (default: "glb")
         * - thumbnailData: string (optional) - Base64-encoded thumbnail
         * - storage: "local" | "supabase" (default: auto - supabase if configured)
         * - metadata: object (optional) - Asset metadata
         */
        const {
          assetId: providedId,
          modelData,
          modelFormat = "glb",
          thumbnailData,
          metadata = {}
        } = params as {
          assetId?: string;
          modelData?: string;
          modelFormat?: string;
          thumbnailData?: string;
          storage?: string;
          metadata?: Record<string, unknown>;
        };

        if (!modelData) {
          return NextResponse.json({
            success: false,
            action: "save-asset",
            error: "Missing required: modelData (base64-encoded model file)",
          }, { status: 400 });
        }

        const assetId = providedId || `asset_${Date.now().toString(36).slice(-6)}_${Math.random().toString(36).substring(2, 6)}`;

        // Use the generation API which handles storage automatically
        const saveRes = await fetch(`${getBaseUrl(request)}/api/generation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save",
            assetId,
            modelData,
            modelFormat,
            thumbnailData,
            metadata: {
              ...metadata,
              savedAt: new Date().toISOString(),
              savedBy: "agent-api",
            },
          }),
        });
        const saveData = await saveRes.json();

        return NextResponse.json({
          success: saveData.success !== false,
          action: "save-asset",
          data: {
            assetId,
            ...saveData,
          },
          error: saveData.error,
        });
      }

      case "delete-asset": {
        /**
         * Delete an asset from storage.
         *
         * Params:
         * - assetId: string (required)
         */
        const { assetId } = params as { assetId?: string };

        if (!assetId) {
          return NextResponse.json({
            success: false,
            action: "delete-asset",
            error: "Missing required: assetId",
          }, { status: 400 });
        }

        const deleteRes = await fetch(`${getBaseUrl(request)}/api/assets/${assetId}`, {
          method: "DELETE",
        });
        const deleteData = await deleteRes.json();

        return NextResponse.json({
          success: deleteData.success !== false,
          action: "delete-asset",
          data: deleteData,
          error: deleteData.error,
        });
      }

      case "copy-asset": {
        /**
         * Duplicate an asset with a new ID.
         *
         * Params:
         * - sourceId: string (required) - Asset to copy
         * - newName: string (optional) - Name for the copy
         */
        const { sourceId, newName } = params as { sourceId?: string; newName?: string };

        if (!sourceId) {
          return NextResponse.json({
            success: false,
            action: "copy-asset",
            error: "Missing required: sourceId",
          }, { status: 400 });
        }

        const duplicateRes = await fetch(`${getBaseUrl(request)}/api/assets/${sourceId}/duplicate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newName }),
        });
        const duplicateData = await duplicateRes.json();

        return NextResponse.json({
          success: duplicateData.success !== false,
          action: "copy-asset",
          data: duplicateData,
          error: duplicateData.error,
        });
      }

      case "get-storage-url": {
        /**
         * Get the correct URL for accessing an asset file.
         *
         * Params:
         * - assetId: string (required)
         * - fileType: "model" | "thumbnail" | "vrm" | "preview" (default: "model")
         * - format: "glb" | "vrm" | "gltf" (default: "glb")
         */
        const { assetId, fileType = "model", format = "glb" } = params as {
          assetId?: string;
          fileType?: string;
          format?: string;
        };

        if (!assetId) {
          return NextResponse.json({
            success: false,
            action: "get-storage-url",
            error: "Missing required: assetId",
          }, { status: 400 });
        }

        // Get asset to determine storage location
        const assetRes = await fetch(`${getBaseUrl(request)}/api/assets/${assetId}`);
        if (!assetRes.ok) {
          return NextResponse.json({
            success: false,
            action: "get-storage-url",
            error: "Asset not found",
          }, { status: 404 });
        }

        const assetData = await assetRes.json();

        // Build URLs based on storage type
        const baseUrl = getBaseUrl(request);
        const cdnUrl = process.env.CDN_URL || "https://cdn.hyperscape.dev";

        const urls: Record<string, string> = {};

        if (fileType === "model" || fileType === "all") {
          urls.model = assetData.modelUrl || `${baseUrl}/api/assets/${assetId}/model.${format}`;
          urls.modelCdn = `${cdnUrl}/assets/models/${assetId}/${assetId}.${format}`;
        }
        if (fileType === "thumbnail" || fileType === "all") {
          urls.thumbnail = assetData.thumbnailUrl || `${baseUrl}/api/assets/${assetId}/concept-art.png`;
        }
        if (fileType === "vrm" || fileType === "all") {
          urls.vrm = assetData.vrmUrl || `${baseUrl}/api/assets/${assetId}/model.vrm`;
        }
        if (fileType === "preview" || fileType === "all") {
          urls.preview = assetData.previewUrl || `${baseUrl}/api/assets/${assetId}/preview.glb`;
        }

        return NextResponse.json({
          success: true,
          action: "get-storage-url",
          data: {
            assetId,
            storage: assetData.source || "unknown",
            urls,
          },
        });
      }

      case "move-to-cdn": {
        /**
         * Promote an asset to CDN/production.
         * Copies from Supabase/local to the game server's assets folder.
         *
         * Params:
         * - assetId: string (required)
         * - targetPath: string (optional) - Custom path in CDN
         */
        const { assetId, targetPath } = params as {
          assetId?: string;
          targetPath?: string;
        };

        if (!assetId) {
          return NextResponse.json({
            success: false,
            action: "move-to-cdn",
            error: "Missing required: assetId",
          }, { status: 400 });
        }

        // Use the export/promote API
        const promoteRes = await fetch(`${getBaseUrl(request)}/api/export/promote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetId,
            targetPath,
            toCdn: true,
          }),
        });
        const promoteData = await promoteRes.json();

        return NextResponse.json({
          success: promoteData.success !== false,
          action: "move-to-cdn",
          data: promoteData,
          error: promoteData.error,
        });
      }

      // ============================================================
      // SPRITE GENERATION
      // ============================================================

      case "generate-sprites": {
        /**
         * Generate 2D sprites for an asset (icons, thumbnails).
         *
         * Params:
         * - assetId: string (required)
         * - assetName: string (required)
         * - assetDescription: string (optional)
         * - assetCategory: string (optional)
         * - views: string[] (optional) - ["front", "side", "isometric"]
         * - style: "pixel" | "clean" | "detailed" (default: "clean")
         */
        const { assetId, assetName, assetDescription, assetCategory, views, style = "clean" } = params as {
          assetId?: string;
          assetName?: string;
          assetDescription?: string;
          assetCategory?: string;
          views?: string[];
          style?: string;
        };

        if (!assetId || !assetName) {
          return NextResponse.json({
            success: false,
            action: "generate-sprites",
            error: "Missing required: assetId, assetName",
          }, { status: 400 });
        }

        const spriteRes = await fetch(`${getBaseUrl(request)}/api/sprites/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetId,
            assetName,
            assetDescription,
            assetCategory,
            views,
            style,
            updateThumbnail: true,
          }),
        });
        const spriteData = await spriteRes.json();

        return NextResponse.json({
          success: spriteData.success !== false,
          action: "generate-sprites",
          data: spriteData,
          error: spriteData.error,
        });
      }

      // ============================================================
      // RIGGING & FITTING (Studio Features)
      // ============================================================

      case "rig-hands": {
        /**
         * Add hand/finger bones to a 3D model for animation.
         *
         * Params:
         * - glbData: string (required) - Base64-encoded GLB file
         * - palmBoneLength: number (optional, default: 300)
         * - fingerBoneLength: number (optional, default: 400)
         */
        const { glbData, palmBoneLength = 300, fingerBoneLength = 400 } = params as {
          glbData?: string;
          palmBoneLength?: number;
          fingerBoneLength?: number;
        };

        if (!glbData) {
          return NextResponse.json({
            success: false,
            action: "rig-hands",
            error: "Missing required: glbData (base64-encoded GLB)",
          }, { status: 400 });
        }

        const rigRes = await fetch(`${getBaseUrl(request)}/api/hand-rigging/simple`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ glbData, options: { palmBoneLength, fingerBoneLength } }),
        });
        const rigData = await rigRes.json();

        return NextResponse.json({
          success: rigData.success !== false,
          action: "rig-hands",
          data: {
            riggedGlbData: rigData.riggedGlbData,
            leftHandBones: rigData.leftHandBones,
            rightHandBones: rigData.rightHandBones,
            metadata: rigData.metadata,
          },
          error: rigData.error,
        });
      }

      case "fit-armor": {
        /**
         * Fit armor mesh to an avatar body.
         *
         * Params:
         * - avatarUrl: string (required) - URL to avatar GLB/VRM
         * - armorUrl: string (required) - URL to armor GLB
         * - equipmentSlot: string (optional) - "Spine2", "Head", "Pelvis"
         * - margin: number (optional) - Gap between armor and body
         */
        const { avatarUrl, armorUrl, equipmentSlot = "Spine2", margin = 0.02 } = params as {
          avatarUrl?: string;
          armorUrl?: string;
          equipmentSlot?: string;
          margin?: number;
        };

        if (!avatarUrl || !armorUrl) {
          return NextResponse.json({
            success: false,
            action: "fit-armor",
            error: "Missing required: avatarUrl, armorUrl",
          }, { status: 400 });
        }

        const fitRes = await fetch(`${getBaseUrl(request)}/api/armor/fit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarUrl, armorUrl, config: { equipmentSlot, margin } }),
        });
        const fitData = await fitRes.json();

        return NextResponse.json({
          success: fitData.success !== false,
          action: "fit-armor",
          data: fitData,
          error: fitData.error,
        });
      }

      case "detect-weapon-handle": {
        /**
         * Detect handle position on a weapon model for grip placement.
         *
         * Params:
         * - modelUrl: string (required) - URL to weapon GLB
         */
        const { modelUrl } = params as { modelUrl?: string };

        if (!modelUrl) {
          return NextResponse.json({
            success: false,
            action: "detect-weapon-handle",
            error: "Missing required: modelUrl",
          }, { status: 400 });
        }

        const handleRes = await fetch(`${getBaseUrl(request)}/api/weapon-handle-detect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelUrl }),
        });
        const handleData = await handleRes.json();

        return NextResponse.json({
          success: handleData.success !== false,
          action: "detect-weapon-handle",
          data: handleData,
          error: handleData.error,
        });
      }

      case "detect-weapon-orientation": {
        /**
         * Detect correct orientation for a weapon model.
         *
         * Params:
         * - modelUrl: string (required) - URL to weapon GLB
         */
        const { modelUrl } = params as { modelUrl?: string };

        if (!modelUrl) {
          return NextResponse.json({
            success: false,
            action: "detect-weapon-orientation",
            error: "Missing required: modelUrl",
          }, { status: 400 });
        }

        const orientRes = await fetch(`${getBaseUrl(request)}/api/weapon-orientation-detect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelUrl }),
        });
        const orientData = await orientRes.json();

        return NextResponse.json({
          success: orientData.success !== false,
          action: "detect-weapon-orientation",
          data: orientData,
          error: orientData.error,
        });
      }

      // ============================================================
      // EMOTES & ANIMATIONS
      // ============================================================

      case "list-emotes": {
        /**
         * List available character emotes/animations.
         */
        const emotesRes = await fetch(`${getBaseUrl(request)}/api/emotes`);
        const emotesData = await emotesRes.json();

        return NextResponse.json({
          success: true,
          action: "list-emotes",
          data: { emotes: emotesData },
        });
      }

      // ============================================================
      // IMAGE UPLOAD
      // ============================================================

      case "upload-image": {
        /**
         * Upload an image (for use as reference in image-to-3D, etc).
         *
         * Params:
         * - imageData: string (required) - Base64-encoded image
         * - filename: string (optional)
         * - mediaType: string (optional) - "image/png", "image/jpeg"
         */
        const { imageData, filename, mediaType = "image/png" } = params as {
          imageData?: string;
          filename?: string;
          mediaType?: string;
        };

        if (!imageData) {
          return NextResponse.json({
            success: false,
            action: "upload-image",
            error: "Missing required: imageData (base64)",
          }, { status: 400 });
        }

        const uploadRes = await fetch(`${getBaseUrl(request)}/api/upload/image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageData, filename, mediaType }),
        });
        const uploadData = await uploadRes.json();

        return NextResponse.json({
          success: uploadData.success !== false,
          action: "upload-image",
          data: uploadData,
          error: uploadData.error,
        });
      }

      // ============================================================
      // SETTINGS & CONFIGURATION
      // ============================================================

      case "get-settings": {
        /**
         * Get current HyperForge settings/status.
         */
        const statusRes = await fetch(`${getBaseUrl(request)}/api/settings/status`);
        const statusData = await statusRes.json();

        return NextResponse.json({
          success: true,
          action: "get-settings",
          data: statusData,
        });
      }

      case "get-preferences": {
        /**
         * Get user preferences (AI model settings, etc).
         *
         * Params:
         * - userId: string (optional, default: "default")
         */
        const { userId = "default" } = params as { userId?: string };

        const prefRes = await fetch(`${getBaseUrl(request)}/api/settings/preferences?type=model-preferences&userId=${userId}`);
        const prefData = await prefRes.json();

        return NextResponse.json({
          success: prefData.success !== false,
          action: "get-preferences",
          data: prefData,
          error: prefData.error,
        });
      }

      case "set-preferences": {
        /**
         * Save user preferences.
         *
         * Params:
         * - userId: string (optional)
         * - preferences: object (required) - Preference data
         */
        const { userId = "default", preferences } = params as {
          userId?: string;
          preferences?: Record<string, unknown>;
        };

        if (!preferences) {
          return NextResponse.json({
            success: false,
            action: "set-preferences",
            error: "Missing required: preferences",
          }, { status: 400 });
        }

        const savePrefRes = await fetch(`${getBaseUrl(request)}/api/settings/preferences`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "model-preferences", userId, data: preferences }),
        });
        const savePrefData = await savePrefRes.json();

        return NextResponse.json({
          success: savePrefData.success !== false,
          action: "set-preferences",
          data: savePrefData,
          error: savePrefData.error,
        });
      }

      case "get-ai-models": {
        /**
         * Get available AI models from the gateway.
         */
        const modelsRes = await fetch(`${getBaseUrl(request)}/api/settings/ai-gateway/models`);
        const modelsData = await modelsRes.json();

        return NextResponse.json({
          success: true,
          action: "get-ai-models",
          data: modelsData,
        });
      }

      case "get-balance": {
        /**
         * Get API credit balance (Meshy, ElevenLabs, etc).
         */
        const balanceRes = await fetch(`${getBaseUrl(request)}/api/settings/balance`);
        const balanceData = await balanceRes.json();

        return NextResponse.json({
          success: true,
          action: "get-balance",
          data: balanceData,
        });
      }

      // ============================================================
      // VERSION CONTROL
      // ============================================================

      case "list-versions":
      case "list-snapshots": {
        /**
         * List all manifest snapshots for version control.
         */
        const versionsRes = await fetch(`${getBaseUrl(request)}/api/versions`);
        const versionsData = await versionsRes.json();

        return NextResponse.json({
          success: true,
          action: "list-versions",
          data: versionsData,
        });
      }

      case "create-snapshot": {
        /**
         * Create a new manifest snapshot.
         *
         * Params:
         * - description: string (optional) - Description for the snapshot
         */
        const { description } = params as { description?: string };

        const snapshotRes = await fetch(`${getBaseUrl(request)}/api/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description }),
        });
        const snapshotData = await snapshotRes.json();

        return NextResponse.json({
          success: snapshotData.success !== false,
          action: "create-snapshot",
          data: snapshotData,
          error: snapshotData.error,
        });
      }

      case "compare-versions":
      case "compare-snapshots": {
        /**
         * Compare two snapshots to see differences.
         *
         * Params:
         * - from: string (required) - First snapshot ID
         * - to: string (required) - Second snapshot ID
         */
        const { from, to } = params as { from?: string; to?: string };

        if (!from || !to) {
          return NextResponse.json({
            success: false,
            action: "compare-versions",
            error: "Missing required: from, to (snapshot IDs)",
          }, { status: 400 });
        }

        const compareRes = await fetch(`${getBaseUrl(request)}/api/versions?compare=${from}&to=${to}`);
        const compareData = await compareRes.json();

        return NextResponse.json({
          success: compareData.success !== false,
          action: "compare-versions",
          data: compareData,
          error: compareData.error,
        });
      }

      case "restore-version":
      case "restore-snapshot": {
        /**
         * Restore a specific snapshot.
         *
         * Params:
         * - snapshotId: string (required) - Snapshot ID to restore
         */
        const { snapshotId } = params as { snapshotId?: string };

        if (!snapshotId) {
          return NextResponse.json({
            success: false,
            action: "restore-version",
            error: "Missing required: snapshotId",
          }, { status: 400 });
        }

        const restoreRes = await fetch(`${getBaseUrl(request)}/api/versions`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshotId }),
        });
        const restoreData = await restoreRes.json();

        return NextResponse.json({
          success: restoreData.success !== false,
          action: "restore-version",
          data: restoreData,
          error: restoreData.error,
        });
      }

      // ============================================================
      // TEMPLATES
      // ============================================================

      case "list-templates": {
        /**
         * List available asset templates (tier sets, mob packs, bundles).
         */
        const templatesRes = await fetch(`${getBaseUrl(request)}/api/templates/create`);
        const templatesData = await templatesRes.json();

        return NextResponse.json({
          success: true,
          action: "list-templates",
          data: templatesData,
        });
      }

      case "create-from-template": {
        /**
         * Create assets from a template.
         *
         * Params:
         * - templateId: string (required) - Template ID
         * - templateType: "tier_set" | "mob_pack" | "asset_bundle" (required)
         * - materials: string[] (required for tier_set) - Material tiers
         */
        const { templateId, templateType, materials } = params as {
          templateId?: string;
          templateType?: string;
          materials?: string[];
        };

        if (!templateId || !templateType) {
          return NextResponse.json({
            success: false,
            action: "create-from-template",
            error: "Missing required: templateId, templateType",
          }, { status: 400 });
        }

        const createRes = await fetch(`${getBaseUrl(request)}/api/templates/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId, templateType, materials }),
        });
        const createData = await createRes.json();

        return NextResponse.json({
          success: createData.success !== false,
          action: "create-from-template",
          data: createData,
          error: createData.error,
        });
      }

      // ============================================================
      // BULK OPERATIONS
      // ============================================================

      case "list-materials": {
        /**
         * List available material tiers and templates for bulk operations.
         */
        const materialsRes = await fetch(`${getBaseUrl(request)}/api/bulk/variants`);
        const materialsData = await materialsRes.json();

        return NextResponse.json({
          success: true,
          action: "list-materials",
          data: materialsData,
        });
      }

      case "create-bulk-variants": {
        /**
         * Create multiple material variants of an asset at once.
         *
         * Params:
         * - action: "create_variants" | "create_tier_set" | "preview"
         * - baseAsset: object (for create_variants) - Base asset data
         * - templateId: string (optional) - Template ID
         * - materials: string[] (required) - Material tier IDs
         * - categories: string[] (optional) - Categories for tier_set
         * - updateManifest: boolean (default: true)
         */
        const bulkParams = params as {
          action?: string;
          baseAsset?: unknown;
          templateId?: string;
          materials?: string[];
          categories?: string[];
          updateManifest?: boolean;
        };

        if (!bulkParams.materials || bulkParams.materials.length === 0) {
          return NextResponse.json({
            success: false,
            action: "create-bulk-variants",
            error: "Missing required: materials array",
          }, { status: 400 });
        }

        const bulkRes = await fetch(`${getBaseUrl(request)}/api/bulk/variants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bulkParams),
        });
        const bulkData = await bulkRes.json();

        return NextResponse.json({
          success: bulkData.success !== false,
          action: "create-bulk-variants",
          data: bulkData,
          error: bulkData.error,
        });
      }

      // ============================================================
      // SYNC
      // ============================================================

      case "get-sync-status": {
        /**
         * Get sync status between HyperForge and game manifests.
         */
        const syncStatusRes = await fetch(`${getBaseUrl(request)}/api/sync`);
        const syncStatusData = await syncStatusRes.json();

        return NextResponse.json({
          success: syncStatusData.success !== false,
          action: "get-sync-status",
          data: syncStatusData,
          error: syncStatusData.error,
        });
      }

      case "sync": {
        /**
         * Sync changes between HyperForge and game manifests.
         *
         * Params:
         * - direction: "from_game" | "to_game" | "bidirectional" (required)
         * - assetIds: string[] (optional) - Only sync specific assets
         */
        const { direction, assetIds } = params as {
          direction?: string;
          assetIds?: string[];
        };

        if (!direction) {
          return NextResponse.json({
            success: false,
            action: "sync",
            error: "Missing required: direction (from_game, to_game, or bidirectional)",
          }, { status: 400 });
        }

        const syncRes = await fetch(`${getBaseUrl(request)}/api/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction, assetIds }),
        });
        const syncData = await syncRes.json();

        return NextResponse.json({
          success: syncData.success !== false,
          action: "sync",
          data: syncData,
          error: syncData.error,
        });
      }

      // ============================================================
      // RELATIONSHIPS
      // ============================================================

      case "get-relationships": {
        /**
         * Get asset relationship graph.
         *
         * Params:
         * - assetId: string (optional) - Get relationships for specific asset
         * - assetTypes: string[] (optional) - Filter by asset categories
         * - relationshipTypes: string[] (optional) - Filter by relationship types
         * - stats: boolean (optional) - Return stats only
         */
        const { assetId, assetTypes, relationshipTypes, stats } = params as {
          assetId?: string;
          assetTypes?: string[];
          relationshipTypes?: string[];
          stats?: boolean;
        };

        const queryParams = new URLSearchParams();
        if (assetId) queryParams.set("assetId", assetId);
        if (assetTypes) queryParams.set("assetTypes", assetTypes.join(","));
        if (relationshipTypes) queryParams.set("relationshipTypes", relationshipTypes.join(","));
        if (stats) queryParams.set("stats", "true");

        const relRes = await fetch(`${getBaseUrl(request)}/api/relationships?${queryParams}`);
        const relData = await relRes.json();

        return NextResponse.json({
          success: relData.success !== false,
          action: "get-relationships",
          data: relData,
          error: relData.error,
        });
      }

      case "add-relationship": {
        /**
         * Add a relationship between two assets.
         *
         * Params:
         * - sourceId: string (required)
         * - sourceType: string (required) - item, npc, resource, etc.
         * - sourceName: string (required)
         * - targetId: string (required)
         * - targetType: string (required)
         * - targetName: string (required)
         * - relationshipType: string (required) - drops, yields, sells, spawns, etc.
         * - metadata: object (optional)
         */
        const relParams = params as {
          sourceId?: string;
          sourceType?: string;
          sourceName?: string;
          targetId?: string;
          targetType?: string;
          targetName?: string;
          relationshipType?: string;
          metadata?: unknown;
        };

        if (!relParams.sourceId || !relParams.targetId || !relParams.relationshipType) {
          return NextResponse.json({
            success: false,
            action: "add-relationship",
            error: "Missing required: sourceId, sourceType, sourceName, targetId, targetType, targetName, relationshipType",
          }, { status: 400 });
        }

        const addRelRes = await fetch(`${getBaseUrl(request)}/api/relationships`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(relParams),
        });
        const addRelData = await addRelRes.json();

        return NextResponse.json({
          success: addRelData.success !== false,
          action: "add-relationship",
          data: addRelData,
          error: addRelData.error,
        });
      }

      case "remove-relationship": {
        /**
         * Remove a relationship by ID.
         *
         * Params:
         * - relationshipId: string (required)
         */
        const { relationshipId } = params as { relationshipId?: string };

        if (!relationshipId) {
          return NextResponse.json({
            success: false,
            action: "remove-relationship",
            error: "Missing required: relationshipId",
          }, { status: 400 });
        }

        const removeRelRes = await fetch(`${getBaseUrl(request)}/api/relationships?id=${relationshipId}`, {
          method: "DELETE",
        });
        const removeRelData = await removeRelRes.json();

        return NextResponse.json({
          success: removeRelData.success !== false,
          action: "remove-relationship",
          data: removeRelData,
          error: removeRelData.error,
        });
      }

      // ============================================================
      // IMPORT
      // ============================================================

      case "get-game-manifests": {
        /**
         * Get all assets from game manifests for import.
         */
        const importRes = await fetch(`${getBaseUrl(request)}/api/import`);
        const importData = await importRes.json();

        return NextResponse.json({
          success: importData.success !== false,
          action: "get-game-manifests",
          data: importData,
          error: importData.error,
        });
      }

      case "import-assets": {
        /**
         * Import assets from game manifests into HyperForge.
         *
         * Params:
         * - assetIds: string[] (required) - Asset IDs to import
         */
        const { assetIds: importAssetIds } = params as { assetIds?: string[] };

        if (!importAssetIds || importAssetIds.length === 0) {
          return NextResponse.json({
            success: false,
            action: "import-assets",
            error: "Missing required: assetIds array",
          }, { status: 400 });
        }

        const doImportRes = await fetch(`${getBaseUrl(request)}/api/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetIds: importAssetIds }),
        });
        const doImportData = await doImportRes.json();

        return NextResponse.json({
          success: doImportData.success !== false,
          action: "import-assets",
          data: doImportData,
          error: doImportData.error,
        });
      }

      // ============================================================
      // SERVER CONTROL
      // ============================================================

      case "server-status": {
        /**
         * Check if the game server is running.
         */
        const serverStatusRes = await fetch(`${getBaseUrl(request)}/api/server/reload`);
        const serverStatusData = await serverStatusRes.json();

        return NextResponse.json({
          success: true,
          action: "server-status",
          data: serverStatusData,
        });
      }

      case "reload-server": {
        /**
         * Trigger hot reload of the game server.
         *
         * Params:
         * - force: boolean (optional) - Force restart instead of hot reload
         */
        const { force } = params as { force?: boolean };

        const reloadRes = await fetch(`${getBaseUrl(request)}/api/server/reload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force }),
        });
        const reloadData = await reloadRes.json();

        return NextResponse.json({
          success: reloadData.success !== false,
          action: "reload-server",
          data: reloadData,
          error: reloadData.error,
        });
      }

      // ============================================================
      // WORLD CONFIG
      // ============================================================

      case "get-world-config": {
        /**
         * Get world areas configuration for tile editor.
         */
        const worldConfigRes = await fetch(`${getBaseUrl(request)}/api/world/config`);
        const worldConfigData = await worldConfigRes.json();

        return NextResponse.json({
          success: true,
          action: "get-world-config",
          data: worldConfigData,
        });
      }

      case "save-world-config": {
        /**
         * Save world areas configuration.
         *
         * Params:
         * - config: object (required) - World areas configuration
         */
        const { config } = params as { config?: unknown };

        if (!config) {
          return NextResponse.json({
            success: false,
            action: "save-world-config",
            error: "Missing required: config object",
          }, { status: 400 });
        }

        const saveConfigRes = await fetch(`${getBaseUrl(request)}/api/world/config`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });
        const saveConfigData = await saveConfigRes.json();

        return NextResponse.json({
          success: saveConfigData.success !== false,
          action: "save-world-config",
          data: saveConfigData,
          error: saveConfigData.error,
        });
      }

      // ============================================================
      // MANIFEST EXPORT
      // ============================================================

      case "export-manifest": {
        /**
         * Export game manifests (items, NPCs, resources).
         *
         * Params:
         * - type: "items" | "npcs" | "resources" | "all" (default: "all")
         */
        const { type = "all" } = params as { type?: string };

        const manifestRes = await fetch(`${getBaseUrl(request)}/api/manifest/export`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        });
        const manifestData = await manifestRes.json();

        return NextResponse.json({
          success: manifestData.success !== false,
          action: "export-manifest",
          data: manifestData,
          error: manifestData.error,
        });
      }

      // ============================================================
      // HELP / DISCOVERY
      // ============================================================

      case "help":
      case "actions": {
        return NextResponse.json({
          success: true,
          action: "help",
          data: {
            categories: {
              "3D Generation": [
                { action: "generate-3d", description: "Generate 3D model from text or image", params: ["prompt", "imageUrl", "mode", "style"] },
                { action: "refine-3d", description: "Add textures to 3D preview", params: ["taskId"] },
                { action: "create-variant", description: "Create texture variant of model", params: ["baseModelId", "baseModelUrl", "variantName", "prompt"] },
                { action: "retexture-model", description: "Retexture 3D model", params: ["modelUrl", "prompt", "artStyle"] },
                { action: "convert-to-avatar", description: "Convert to VRM avatar", params: ["modelUrl", "avatarName"] },
              ],
              "Image Generation": [
                { action: "generate-image", description: "Generate concept art, sprite, or texture", params: ["prompt", "type", "style", "assetType"] },
                { action: "generate-sprites", description: "Generate 2D sprites for asset", params: ["assetId", "assetName", "views", "style"] },
                { action: "enhance-image", description: "Enhance/upscale image", params: ["imageUrl", "type"] },
                { action: "upload-image", description: "Upload reference image", params: ["imageData", "filename", "mediaType"] },
              ],
              "Audio Generation": [
                { action: "generate-sfx", description: "Generate sound effect", params: ["prompt", "duration"] },
                { action: "generate-music", description: "Generate background music", params: ["prompt", "duration"] },
                { action: "generate-voice", description: "Text-to-speech", params: ["text", "voiceId"] },
                { action: "list-voices", description: "List available TTS voices", params: [] },
              ],
              "Content Generation": [
                { action: "generate-content", description: "Generate text content", params: ["prompt", "type"] },
                { action: "generate-dialogue", description: "Generate NPC dialogue tree", params: ["npcName", "npcDescription", "npcCategory", "services"] },
              ],
              "Studio (Rigging & Fitting)": [
                { action: "rig-hands", description: "Add hand/finger bones to model", params: ["glbData", "palmBoneLength", "fingerBoneLength"] },
                { action: "fit-armor", description: "Fit armor mesh to avatar", params: ["avatarUrl", "armorUrl", "equipmentSlot", "margin"] },
                { action: "detect-weapon-handle", description: "Detect weapon grip position", params: ["modelUrl"] },
                { action: "detect-weapon-orientation", description: "Detect weapon orientation", params: ["modelUrl"] },
                { action: "list-emotes", description: "List character animations", params: [] },
              ],
              "Asset Management": [
                { action: "list-assets", description: "List available assets", params: ["source", "category"] },
                { action: "get-asset", description: "Get asset details and URLs", params: ["assetId"] },
                { action: "save-asset", description: "Save asset to storage", params: ["assetId", "modelData", "storage", "metadata"] },
                { action: "delete-asset", description: "Delete an asset", params: ["assetId"] },
                { action: "copy-asset", description: "Duplicate an asset", params: ["sourceId", "newName"] },
                { action: "export-asset", description: "Export asset to game server", params: ["assetId", "targetType", "manifestEntry", "isDraft"] },
                { action: "promote-asset", description: "Promote draft to production", params: ["assetId", "manifestEntry"] },
                { action: "list-drafts", description: "List draft assets", params: [] },
                { action: "test-in-game", description: "Test asset in game", params: ["assetId", "position"] },
                { action: "export-manifest", description: "Export game manifests", params: ["type"] },
              ],
              "Storage": [
                { action: "storage-status", description: "Get storage backends status", params: [] },
                { action: "list-storage", description: "List assets from specific storage", params: ["storage", "folder", "limit"] },
                { action: "get-storage-url", description: "Get proper URL for an asset", params: ["assetId", "fileType", "storage"] },
                { action: "move-to-cdn", description: "Promote asset to CDN/production", params: ["assetId"] },
              ],
              "Game Data": [
                { action: "get-game-data", description: "Get item/mob/resource data", params: ["type", "id"] },
                { action: "list-game-content", description: "List all game content", params: ["type"] },
                { action: "list-stores", description: "List in-game stores", params: [] },
                { action: "update-store", description: "Update store inventory", params: ["storeId", "inventory"] },
              ],
              "World Editing": [
                { action: "get-world", description: "Get world entities (paginated)", params: ["page", "limit", "type", "search"] },
                { action: "get-entity", description: "Get single entity by ID", params: ["id"] },
                { action: "get-players", description: "Get all connected players", params: [] },
                { action: "find-nearby", description: "Find entities near position", params: ["position", "radius", "type", "limit"] },
                { action: "find-entity", description: "Search entities by name", params: ["name", "type"] },
                { action: "update-entity", description: "Update entity position/scale", params: ["id", "position", "rotation", "scale"] },
                { action: "place-entity", description: "Place entity in world", params: ["name", "type", "modelPath", "position", "scale"] },
                { action: "remove-entity", description: "Remove entity from world", params: ["id"] },
                { action: "bulk-place-entities", description: "Place multiple entities", params: ["entities"] },
                { action: "bulk-remove-entities", description: "Remove multiple entities", params: ["ids"] },
              ],
              "Settings & Configuration": [
                { action: "get-settings", description: "Get HyperForge status", params: [] },
                { action: "get-preferences", description: "Get user preferences", params: ["userId"] },
                { action: "set-preferences", description: "Save user preferences", params: ["userId", "preferences"] },
                { action: "get-ai-models", description: "List available AI models", params: [] },
                { action: "get-balance", description: "Get API credit balance", params: [] },
              ],
              "Version Control": [
                { action: "list-versions", description: "List all manifest snapshots", params: [] },
                { action: "create-snapshot", description: "Create a new snapshot", params: ["description"] },
                { action: "compare-versions", description: "Compare two snapshots", params: ["from", "to"] },
                { action: "restore-version", description: "Restore a snapshot", params: ["snapshotId"] },
              ],
              "Templates & Bulk": [
                { action: "list-templates", description: "List available templates", params: [] },
                { action: "create-from-template", description: "Create assets from template", params: ["templateId", "templateType", "materials"] },
                { action: "list-materials", description: "List material tiers", params: [] },
                { action: "create-bulk-variants", description: "Create material variants", params: ["materials", "baseAsset", "action"] },
              ],
              "Sync & Import": [
                { action: "get-sync-status", description: "Get sync status", params: [] },
                { action: "sync", description: "Sync with game manifests", params: ["direction", "assetIds"] },
                { action: "get-game-manifests", description: "Get game manifest assets", params: [] },
                { action: "import-assets", description: "Import from game", params: ["assetIds"] },
              ],
              "Relationships": [
                { action: "get-relationships", description: "Get asset relationships", params: ["assetId", "assetTypes"] },
                { action: "add-relationship", description: "Add asset relationship", params: ["sourceId", "targetId", "relationshipType"] },
                { action: "remove-relationship", description: "Remove relationship", params: ["relationshipId"] },
              ],
              "Server Control": [
                { action: "server-status", description: "Check game server status", params: [] },
                { action: "reload-server", description: "Hot reload game server", params: ["force"] },
                { action: "get-world-config", description: "Get world areas config", params: [] },
                { action: "save-world-config", description: "Save world areas config", params: ["config"] },
              ],
              "Utility": [
                { action: "status", description: "Check async task status", params: ["taskId"] },
                { action: "batch-status", description: "Check multiple task statuses", params: ["taskIds"] },
                { action: "describe", description: "Get detailed action schema with examples", params: ["actionName"] },
                { action: "validate", description: "Validate params before executing", params: ["actionName", "params"] },
                { action: "estimate", description: "Estimate time/cost for action", params: ["actionName", "params"] },
                { action: "search", description: "Search across all assets and entities", params: ["query", "types"] },
                { action: "recent", description: "Get recently created/modified items", params: ["type", "limit"] },
                { action: "help", description: "Show this help", params: [] },
              ],
            },
          },
        });
      }

      default:
        return NextResponse.json({
          success: false,
          action,
          error: `Unknown action: ${action}. Use action: "help" to see available actions.`,
        }, { status: 400 });
    }
  } catch (error) {
    log.error({ error }, "Agent API error");
    return NextResponse.json({
      success: false,
      action: "unknown",
      error: error instanceof Error ? error.message : "Request failed",
    }, { status: 500 });
  }
}

/**
 * GET /api/agent
 *
 * Returns available actions and usage information.
 */
export async function GET(): Promise<NextResponse<AgentResponse>> {
  return NextResponse.json({
    success: true,
    action: "info",
    data: {
      name: "HyperForge Agent API",
      version: "1.0.0",
      description: "Unified API for AI agents (Game Masters) to generate and manage game content",
      usage: "POST /api/agent with { action: string, params: {} }",
      categories: {
        "3D Generation": ["generate-3d", "refine-3d", "create-variant", "retexture-model", "convert-to-avatar"],
        "Image Generation": ["generate-image", "generate-sprites", "enhance-image", "upload-image"],
        "Audio Generation": ["generate-sfx", "generate-music", "generate-voice", "list-voices"],
        "Content Generation": ["generate-content", "generate-dialogue"],
        "Studio (Rigging & Fitting)": ["rig-hands", "fit-armor", "detect-weapon-handle", "detect-weapon-orientation", "list-emotes"],
        "Asset Management": ["list-assets", "get-asset", "save-asset", "delete-asset", "copy-asset", "export-asset", "promote-asset", "list-drafts", "test-in-game", "export-manifest"],
        "Storage": ["storage-status", "list-storage", "get-storage-url", "move-to-cdn"],
        "Game Data": ["get-game-data", "list-game-content", "list-stores", "update-store"],
        "World Editing": ["get-world", "get-entity", "get-players", "find-nearby", "find-entity", "update-entity", "place-entity", "remove-entity", "bulk-place-entities", "bulk-remove-entities"],
        "Settings & Configuration": ["get-settings", "get-preferences", "set-preferences", "get-ai-models", "get-balance"],
        "Version Control": ["list-versions", "create-snapshot", "compare-versions", "restore-version"],
        "Templates & Bulk": ["list-templates", "create-from-template", "list-materials", "create-bulk-variants"],
        "Sync & Import": ["get-sync-status", "sync", "get-game-manifests", "import-assets"],
        "Relationships": ["get-relationships", "add-relationship", "remove-relationship"],
        "Server Control": ["server-status", "reload-server", "get-world-config", "save-world-config"],
        "Utility": ["status", "batch-status", "describe", "validate", "estimate", "search", "recent", "help"],
      },
      examples: [
        {
          description: "Generate a 3D weapon model",
          request: { action: "generate-3d", params: { prompt: "medieval steel sword with ornate hilt" } },
        },
        {
          description: "Generate NPC dialogue",
          request: { action: "generate-dialogue", params: { npcName: "Blacksmith Bob", npcDescription: "A gruff but kind blacksmith", npcRole: "shopkeeper", services: ["shop", "repair"] } },
        },
        {
          description: "Place a tree in the world",
          request: { action: "place-entity", params: { name: "Oak Tree", type: "resource", position: { x: 10, y: 0, z: 5 } } },
        },
        {
          description: "Export asset to game",
          request: { action: "export-asset", params: { assetId: "sword_123", targetType: "item", manifestEntry: { id: "iron_sword", name: "Iron Sword", type: "weapon" } } },
        },
      ],
    },
  });
}

/**
 * Helper to get base URL for internal API calls
 */
function getBaseUrl(request: NextRequest): string {
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("host") || "localhost:3500";
  return `${protocol}://${host}`;
}
