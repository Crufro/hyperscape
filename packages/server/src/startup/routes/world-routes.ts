/**
 * World Routes - World Editor API Endpoints
 *
 * REST API endpoints for the HyperForge world editor to read and modify
 * entities in the running game world.
 *
 * Endpoints:
 * - GET /api/world/entities - List all entities (with pagination)
 *     Query params: ?page=1&limit=50&type=mob&search=goblin
 * - GET /api/world/entities/:id - Get single entity by ID
 * - GET /api/world/players - List all connected players
 * - POST /api/world/entities - Add a new entity with model path
 * - PATCH /api/world/entities/:id - Update an entity
 * - DELETE /api/world/entities/:id - Remove an entity
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { World, Entity } from "@hyperscape/shared";

/**
 * Entity data returned by the API
 */
interface WorldEntityData {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  modelPath?: string;
  isActive: boolean;
  loadedAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * Register world editor routes
 *
 * @param fastify - Fastify server instance
 * @param world - Game world instance
 */
export function registerWorldRoutes(
  fastify: FastifyInstance,
  world: World,
): void {
  console.log("[WorldRoutes] Registering world editor routes...");

  /**
   * GET /api/world/entities
   *
   * Returns all entities currently in the game world with pagination.
   *
   * Query Parameters:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 50, max: 200)
   * - type: Filter by entity type (e.g., "mob", "npc", "item", "resource")
   * - search: Search by name (case-insensitive)
   *
   * Response:
   * {
   *   success: true,
   *   entities: [...],
   *   pagination: { page, limit, total, totalPages, hasNext, hasPrev },
   *   serverTime: 1234567890
   * }
   */
  fastify.get(
    "/api/world/entities",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = request.query as {
          page?: string;
          limit?: string;
          type?: string;
          search?: string;
        };

        // Parse pagination params
        const page = Math.max(1, parseInt(query.page || "1", 10));
        const limit = Math.min(200, Math.max(1, parseInt(query.limit || "50", 10)));
        const typeFilter = query.type?.toLowerCase();
        const searchFilter = query.search?.toLowerCase();

        let allEntities: WorldEntityData[] = [];

        // Get all entities from the world
        const entityMap = world.entities?.items;
        if (entityMap) {
          for (const [_id, entity] of entityMap.entries()) {
            const entityData = serializeEntity(entity);
            if (entityData) {
              allEntities.push(entityData);
            }
          }
        }

        // Also include connected players
        const network = world.network as {
          sockets?: Map<string, { player?: Entity }>;
        };
        if (network?.sockets) {
          for (const socket of network.sockets.values()) {
            if (socket.player) {
              const playerData = serializeEntity(socket.player);
              if (playerData && !allEntities.find((e) => e.id === playerData.id)) {
                allEntities.push(playerData);
              }
            }
          }
        }

        // Apply filters
        if (typeFilter) {
          allEntities = allEntities.filter(
            (e) => e.type.toLowerCase() === typeFilter,
          );
        }
        if (searchFilter) {
          allEntities = allEntities.filter((e) =>
            e.name.toLowerCase().includes(searchFilter),
          );
        }

        // Calculate pagination
        const total = allEntities.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedEntities = allEntities.slice(startIndex, endIndex);

        return reply.send({
          success: true,
          entities: paginatedEntities,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
          serverTime: Date.now(),
        });
      } catch (error) {
        console.error("[WorldRoutes] Failed to get entities:", error);
        return reply.status(500).send({
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to get entities",
        });
      }
    },
  );

  /**
   * GET /api/world/entities/:id
   *
   * Get a single entity by ID with full details.
   */
  fastify.get(
    "/api/world/entities/:id",
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const { id } = request.params;
        const entity = world.entities?.get?.(id);

        if (!entity) {
          return reply.status(404).send({
            success: false,
            error: "Entity not found",
          });
        }

        const entityData = serializeEntity(entity);
        return reply.send({
          success: true,
          entity: entityData,
        });
      } catch (error) {
        console.error("[WorldRoutes] Failed to get entity:", error);
        return reply.status(500).send({
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to get entity",
        });
      }
    },
  );

  /**
   * GET /api/world/players
   *
   * Returns all currently connected players.
   */
  fastify.get(
    "/api/world/players",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      try {
        const players: WorldEntityData[] = [];

        const network = world.network as {
          sockets?: Map<string, { player?: Entity }>;
        };
        if (network?.sockets) {
          for (const socket of network.sockets.values()) {
            if (socket.player) {
              const playerData = serializeEntity(socket.player);
              if (playerData) {
                players.push(playerData);
              }
            }
          }
        }

        return reply.send({
          success: true,
          players,
          total: players.length,
        });
      } catch (error) {
        console.error("[WorldRoutes] Failed to get players:", error);
        return reply.status(500).send({
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to get players",
        });
      }
    },
  );

  /**
   * POST /api/world/entities
   *
   * Add a new entity to the world dynamically.
   *
   * Request Body:
   * {
   *   "id": "unique_entity_id",           // Required: Unique identifier
   *   "name": "My Entity",                // Required: Display name
   *   "type": "prop",                     // Optional: Entity type (prop, npc, mob, item, resource, bank)
   *   "modelPath": "/path/to/model.glb",  // Optional: Path to 3D model file
   *   "blueprint": "/path/to/model.glb",  // Optional: Alias for modelPath
   *   "position": { "x": 0, "y": 0, "z": 0 },  // Optional: World position
   *   "rotation": { "x": 0, "y": 0, "z": 0 },  // Optional: Rotation in radians
   *   "scale": { "x": 1, "y": 1, "z": 1 },     // Optional: Scale multiplier
   *   "data": { ... }                     // Optional: Additional metadata
   * }
   *
   * Model Path Examples:
   * - Local: "/assets/models/tree.glb"
   * - CDN: "https://cdn.example.com/models/tree.glb"
   * - VRM: "avatars/avatar-male-01.vrm"
   *
   * Response:
   * {
   *   "success": true,
   *   "message": "Entity added to world",
   *   "entity": { ... }
   * }
   */
  fastify.post(
    "/api/world/entities",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as {
          id?: string;
          name: string;
          type?: string;
          blueprint?: string;
          modelPath?: string;
          position?: { x?: number; y?: number; z?: number };
          rotation?: { x?: number; y?: number; z?: number };
          scale?: { x?: number; y?: number; z?: number };
          data?: Record<string, unknown>;
        };

        // Auto-generate ID if not provided
        const entityId =
          body.id ||
          `entity_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        if (!body.name) {
          return reply.status(400).send({
            success: false,
            error: "Missing required field: name",
            example: {
              name: "My Entity",
              type: "prop",
              modelPath: "/assets/models/rock.glb",
              position: { x: 0, y: 0, z: 0 },
            },
          });
        }

        // Check for duplicate
        if (world.entities?.get?.(entityId)) {
          return reply.status(409).send({
            success: false,
            error: "Entity with this ID already exists",
            id: entityId,
          });
        }

        // Determine model path (support both modelPath and blueprint)
        const modelPath = body.modelPath || body.blueprint;

        // Add entity to world
        const entityData = {
          id: entityId,
          name: body.name,
          type: body.type || "prop",
          blueprint: modelPath,
          position: body.position
            ? [body.position.x ?? 0, body.position.y ?? 0, body.position.z ?? 0]
            : [0, 0, 0],
          quaternion: [0, 0, 0, 1] as [number, number, number, number],
          scale: body.scale
            ? [body.scale.x ?? 1, body.scale.y ?? 1, body.scale.z ?? 1]
            : [1, 1, 1],
          state: {},
          ...(body.data || {}),
        };

        // Handle rotation to quaternion conversion (Y-axis rotation)
        if (body.rotation) {
          const halfY = (body.rotation.y ?? 0) * 0.5;
          entityData.quaternion = [0, Math.sin(halfY), 0, Math.cos(halfY)];
        }

        if (world.entities?.add) {
          world.entities.add(entityData, true);
        }

        // Broadcast to all clients so they see the new entity
        const network = world.network as {
          send?: (name: string, data: unknown) => void;
        };
        if (network?.send) {
          network.send("entityAdded", entityData);
        }

        console.log(
          `[WorldRoutes] Entity added: ${entityId} (${body.name}) at (${entityData.position.join(", ")})`,
        );

        return reply.send({
          success: true,
          message: "Entity added to world",
          entity: {
            id: entityId,
            name: body.name,
            type: entityData.type,
            modelPath,
            position: {
              x: entityData.position[0],
              y: entityData.position[1],
              z: entityData.position[2],
            },
            scale: {
              x: entityData.scale[0],
              y: entityData.scale[1],
              z: entityData.scale[2],
            },
          },
        });
      } catch (error) {
        console.error("[WorldRoutes] Failed to add entity:", error);
        return reply.status(500).send({
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to add entity",
        });
      }
    },
  );

  /**
   * PATCH /api/world/entities/:id
   *
   * Update an existing entity in the world.
   */
  fastify.patch(
    "/api/world/entities/:id",
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const { id } = request.params;
        const body = request.body as {
          name?: string;
          position?: { x?: number; y?: number; z?: number };
          rotation?: { x?: number; y?: number; z?: number };
          scale?: { x?: number; y?: number; z?: number };
          data?: Record<string, unknown>;
        };

        const entity = world.entities?.get?.(id);
        if (!entity) {
          return reply.status(404).send({
            success: false,
            error: "Entity not found",
          });
        }

        // Apply updates to entity
        const changes: Record<string, unknown> = {};

        if (body.name) {
          changes.name = body.name;
          if (entity.data) {
            entity.data.name = body.name;
          }
        }

        if (body.position && entity.node?.position) {
          entity.node.position.set(
            body.position.x ?? entity.node.position.x,
            body.position.y ?? entity.node.position.y,
            body.position.z ?? entity.node.position.z,
          );
          changes.p = [
            entity.node.position.x,
            entity.node.position.y,
            entity.node.position.z,
          ];
        }

        if (body.scale && entity.node?.scale) {
          entity.node.scale.set(
            body.scale.x ?? entity.node.scale.x,
            body.scale.y ?? entity.node.scale.y,
            body.scale.z ?? entity.node.scale.z,
          );
          changes.s = [
            entity.node.scale.x,
            entity.node.scale.y,
            entity.node.scale.z,
          ];
        }

        // Broadcast update to all clients
        const network = world.network as {
          send?: (name: string, data: unknown) => void;
        };
        if (network?.send && Object.keys(changes).length > 0) {
          network.send("entityModified", { id, changes });
        }

        return reply.send({
          success: true,
          message: "Entity updated",
        });
      } catch (error) {
        console.error("[WorldRoutes] Failed to update entity:", error);
        return reply.status(500).send({
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to update entity",
        });
      }
    },
  );

  /**
   * DELETE /api/world/entities/:id
   *
   * Remove an entity from the world.
   */
  fastify.delete(
    "/api/world/entities/:id",
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const { id } = request.params;

        const entity = world.entities?.get?.(id);
        if (!entity) {
          return reply.status(404).send({
            success: false,
            error: "Entity not found",
          });
        }

        // Don't allow deleting players
        if (entity.type === "player") {
          return reply.status(403).send({
            success: false,
            error: "Cannot delete player entities",
          });
        }

        // Remove from world
        if (world.entities?.remove) {
          world.entities.remove(id);
        }

        // Broadcast removal to all clients
        const network = world.network as {
          send?: (name: string, data: unknown) => void;
        };
        if (network?.send) {
          network.send("entityRemoved", { id });
        }

        return reply.send({
          success: true,
          message: "Entity removed",
        });
      } catch (error) {
        console.error("[WorldRoutes] Failed to delete entity:", error);
        return reply.status(500).send({
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to delete entity",
        });
      }
    },
  );

  /**
   * POST /api/world/entities/bulk
   *
   * Add multiple entities at once for efficient batch imports.
   *
   * Request Body:
   * {
   *   "entities": [
   *     { "name": "Tree 1", "type": "resource", "modelPath": "...", "position": {...} },
   *     { "name": "Tree 2", "type": "resource", "modelPath": "...", "position": {...} }
   *   ]
   * }
   *
   * Response:
   * {
   *   "success": true,
   *   "added": 2,
   *   "failed": 0,
   *   "entities": [...]
   * }
   */
  fastify.post(
    "/api/world/entities/bulk",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as {
          entities: Array<{
            id?: string;
            name: string;
            type?: string;
            modelPath?: string;
            blueprint?: string;
            position?: { x?: number; y?: number; z?: number };
            rotation?: { x?: number; y?: number; z?: number };
            scale?: { x?: number; y?: number; z?: number };
            data?: Record<string, unknown>;
          }>;
        };

        if (!body.entities || !Array.isArray(body.entities)) {
          return reply.status(400).send({
            success: false,
            error: "Missing required field: entities (array)",
            example: {
              entities: [
                {
                  name: "Tree",
                  type: "resource",
                  modelPath: "/assets/models/tree.glb",
                  position: { x: 10, y: 0, z: 5 },
                },
              ],
            },
          });
        }

        const results: Array<{ id: string; name: string; success: boolean; error?: string }> = [];
        let added = 0;
        let failed = 0;

        for (const entityInput of body.entities) {
          try {
            const entityId =
              entityInput.id ||
              `entity_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

            if (!entityInput.name) {
              results.push({ id: entityId, name: "", success: false, error: "Missing name" });
              failed++;
              continue;
            }

            if (world.entities?.get?.(entityId)) {
              results.push({
                id: entityId,
                name: entityInput.name,
                success: false,
                error: "Already exists",
              });
              failed++;
              continue;
            }

            const modelPath = entityInput.modelPath || entityInput.blueprint;
            const entityData = {
              id: entityId,
              name: entityInput.name,
              type: entityInput.type || "prop",
              blueprint: modelPath,
              position: entityInput.position
                ? [
                    entityInput.position.x ?? 0,
                    entityInput.position.y ?? 0,
                    entityInput.position.z ?? 0,
                  ]
                : [0, 0, 0],
              quaternion: [0, 0, 0, 1] as [number, number, number, number],
              scale: entityInput.scale
                ? [
                    entityInput.scale.x ?? 1,
                    entityInput.scale.y ?? 1,
                    entityInput.scale.z ?? 1,
                  ]
                : [1, 1, 1],
              state: {},
              ...(entityInput.data || {}),
            };

            if (entityInput.rotation) {
              const halfY = (entityInput.rotation.y ?? 0) * 0.5;
              entityData.quaternion = [0, Math.sin(halfY), 0, Math.cos(halfY)];
            }

            if (world.entities?.add) {
              world.entities.add(entityData, true);
            }

            results.push({ id: entityId, name: entityInput.name, success: true });
            added++;
          } catch (err) {
            results.push({
              id: entityInput.id || "unknown",
              name: entityInput.name || "unknown",
              success: false,
              error: err instanceof Error ? err.message : "Unknown error",
            });
            failed++;
          }
        }

        console.log(`[WorldRoutes] Bulk import: ${added} added, ${failed} failed`);

        return reply.send({
          success: true,
          added,
          failed,
          total: body.entities.length,
          results,
        });
      } catch (error) {
        console.error("[WorldRoutes] Failed bulk import:", error);
        return reply.status(500).send({
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to bulk import entities",
        });
      }
    },
  );

  /**
   * DELETE /api/world/entities/bulk
   *
   * Delete multiple entities at once.
   *
   * Request Body:
   * { "ids": ["entity_1", "entity_2", "entity_3"] }
   */
  fastify.delete(
    "/api/world/entities/bulk",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = request.body as { ids: string[] };

        if (!body.ids || !Array.isArray(body.ids)) {
          return reply.status(400).send({
            success: false,
            error: "Missing required field: ids (array of entity IDs)",
          });
        }

        let deleted = 0;
        let failed = 0;
        const results: Array<{ id: string; success: boolean; error?: string }> = [];

        for (const id of body.ids) {
          const entity = world.entities?.get?.(id);
          if (!entity) {
            results.push({ id, success: false, error: "Not found" });
            failed++;
            continue;
          }

          if (entity.type === "player") {
            results.push({ id, success: false, error: "Cannot delete players" });
            failed++;
            continue;
          }

          if (world.entities?.remove) {
            world.entities.remove(id);
          }
          results.push({ id, success: true });
          deleted++;
        }

        console.log(`[WorldRoutes] Bulk delete: ${deleted} removed, ${failed} failed`);

        return reply.send({
          success: true,
          deleted,
          failed,
          results,
        });
      } catch (error) {
        console.error("[WorldRoutes] Failed bulk delete:", error);
        return reply.status(500).send({
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to bulk delete entities",
        });
      }
    },
  );

  console.log("[WorldRoutes] ✅ World editor routes registered");
}

/**
 * Serialize an entity to the API format
 */
function serializeEntity(entity: Entity): WorldEntityData | null {
  if (!entity || !entity.id) return null;

  const position = entity.node?.position || entity.position;
  const rotation = entity.node?.rotation;
  const scale = entity.node?.scale;

  return {
    id: entity.id,
    name: (entity.data?.name as string) || entity.id,
    type: entity.type || "unknown",
    position: position
      ? { x: position.x || 0, y: position.y || 0, z: position.z || 0 }
      : { x: 0, y: 0, z: 0 },
    rotation: rotation
      ? { x: rotation.x || 0, y: rotation.y || 0, z: rotation.z || 0 }
      : undefined,
    scale: scale
      ? { x: scale.x || 1, y: scale.y || 1, z: scale.z || 1 }
      : undefined,
    modelPath: entity.data?.blueprint as string,
    isActive: true,
    loadedAt: new Date().toISOString(),
    metadata: entity.data as Record<string, unknown>,
  };
}
