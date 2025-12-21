/**
 * World Entity Schemas
 *
 * Zod schemas for /api/world/entities endpoint
 */

import { z } from "zod";
import { Vector3Schema } from "./common";

// =============================================================================
// ENTITY SCHEMAS
// =============================================================================

/**
 * Create entity request schema
 */
export const CreateEntitySchema = z.object({
  /** Unique entity ID */
  id: z.string().min(1),
  /** Display name */
  name: z.string().min(1),
  /** Entity type (e.g., "npc", "resource", "item") */
  type: z.string().optional(),
  /** Blueprint ID for entity template */
  blueprint: z.string().optional(),
  /** Path to 3D model */
  modelPath: z.string().optional(),
  /** Position in world */
  position: Vector3Schema.optional(),
  /** Rotation (Euler angles) */
  rotation: Vector3Schema.optional(),
  /** Scale */
  scale: Vector3Schema.optional(),
  /** Additional entity data */
  data: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Update entity request schema
 */
export const UpdateEntitySchema = z.object({
  /** Entity ID to update */
  id: z.string().min(1),
  /** Updated name */
  name: z.string().optional(),
  /** Updated position */
  position: Vector3Schema.optional(),
  /** Updated rotation */
  rotation: Vector3Schema.optional(),
  /** Updated scale */
  scale: Vector3Schema.optional(),
  /** Updated model path */
  modelPath: z.string().optional(),
  /** Additional data to merge */
  data: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Delete entity request schema
 */
export const DeleteEntitySchema = z.object({
  /** Entity ID to delete */
  id: z.string().min(1),
});

/**
 * Bulk place entities request
 */
export const BulkPlaceEntitiesSchema = z.object({
  entities: z.array(CreateEntitySchema).min(1).max(100),
});

/**
 * Bulk remove entities request
 */
export const BulkRemoveEntitiesSchema = z.object({
  entityIds: z.array(z.string().min(1)).min(1).max(100),
});

/**
 * Find nearby entities request
 */
export const FindNearbySchema = z.object({
  position: z.object({
    x: z.number(),
    y: z.number().optional(),
    z: z.number(),
  }),
  radius: z.number().positive(),
  type: z.string().optional(),
  limit: z.number().positive().max(100).optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CreateEntityRequest = z.infer<typeof CreateEntitySchema>;
export type UpdateEntityRequest = z.infer<typeof UpdateEntitySchema>;
export type DeleteEntityRequest = z.infer<typeof DeleteEntitySchema>;
export type BulkPlaceEntitiesRequest = z.infer<typeof BulkPlaceEntitiesSchema>;
export type BulkRemoveEntitiesRequest = z.infer<typeof BulkRemoveEntitiesSchema>;
export type FindNearbyRequest = z.infer<typeof FindNearbySchema>;
