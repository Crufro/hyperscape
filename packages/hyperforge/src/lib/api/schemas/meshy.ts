/**
 * Meshy Route Schemas
 *
 * Zod schemas for /api/meshy endpoint
 * Uses discriminated unions for action-based dispatching
 */

import { z } from "zod";

// =============================================================================
// RESPONSE SCHEMAS - For validating external API data
// =============================================================================

/**
 * Meshy task status values
 */
export const MeshyTaskStatusSchema = z.enum([
  "PENDING",
  "IN_PROGRESS",
  "SUCCEEDED",
  "FAILED",
  "CANCELED",
]);

/**
 * Meshy task creation response
 * API returns { result: "task-id" } or { task_id: "..." } or { id: "..." }
 */
export const MeshyTaskCreationResponseSchema = z.object({
  result: z.string().optional(),
  task_id: z.string().optional(),
  id: z.string().optional(),
}).refine(
  (data) => data.result || data.task_id || data.id,
  { message: "Response must contain result, task_id, or id" }
);

/**
 * Model URLs returned by Meshy
 */
export const MeshyModelUrlsSchema = z.object({
  glb: z.string().url().optional(),
  fbx: z.string().url().optional(),
  usdz: z.string().url().optional(),
  obj: z.string().url().optional(),
  mtl: z.string().url().optional(),
}).optional();

/**
 * Texture URLs returned by Meshy
 */
export const MeshyTextureUrlSchema = z.object({
  base_color: z.string().url(),
  metallic: z.string().url().optional(),
  normal: z.string().url().optional(),
  roughness: z.string().url().optional(),
});

/**
 * Task error structure
 * Meshy API can return null, which we transform to undefined for type compatibility
 */
export const MeshyTaskErrorSchema = z.union([
  z.object({ message: z.string() }),
  z.null(),
]).optional().transform((val) => val === null ? undefined : val);

/**
 * Meshy Task status response - validates data from Meshy API
 */
export const MeshyTaskResponseSchema = z.object({
  id: z.string(),
  task_id: z.string().optional(),
  status: MeshyTaskStatusSchema,
  progress: z.number().min(0).max(100).optional(),
  model_urls: MeshyModelUrlsSchema,
  model_url: z.string().url().optional(),
  thumbnail_url: z.string().url().optional(),
  video_url: z.string().url().optional(),
  texture_urls: z.array(MeshyTextureUrlSchema).optional(),
  prompt: z.string().optional(),
  art_style: z.string().optional(),
  texture_prompt: z.string().optional(),
  texture_image_url: z.string().url().optional(),
  seed: z.number().optional(),
  started_at: z.number().optional(),
  created_at: z.number().optional(),
  finished_at: z.number().optional(),
  preceding_tasks: z.number().optional(),
  task_error: MeshyTaskErrorSchema,
  error: z.string().optional(),
});

/**
 * Rigging result from Meshy API
 */
export const MeshyRiggingResultSchema = z.object({
  rigged_character_glb_url: z.string().url().optional(),
  rigged_character_fbx_url: z.string().url().optional(),
  basic_animations: z.object({
    walking_glb_url: z.string().url().optional(),
    running_glb_url: z.string().url().optional(),
    walking_fbx_url: z.string().url().optional(),
    running_fbx_url: z.string().url().optional(),
    walking_armature_glb_url: z.string().url().optional(),
    running_armature_glb_url: z.string().url().optional(),
  }).optional(),
}).optional();

/**
 * Rigging task response from Meshy API
 */
export const MeshyRiggingTaskResponseSchema = z.object({
  id: z.string(),
  status: MeshyTaskStatusSchema,
  progress: z.number().min(0).max(100).optional(),
  task_error: MeshyTaskErrorSchema,
  result: MeshyRiggingResultSchema,
});

// Type exports for responses
export type MeshyTaskStatus = z.infer<typeof MeshyTaskStatusSchema>;
export type MeshyTaskCreationResponse = z.infer<typeof MeshyTaskCreationResponseSchema>;
export type MeshyTaskResponse = z.infer<typeof MeshyTaskResponseSchema>;
export type MeshyRiggingTaskResponse = z.infer<typeof MeshyRiggingTaskResponseSchema>;

/**
 * Parse and validate Meshy task creation response
 * @throws ZodError if response is invalid
 */
export function parseMeshyTaskCreation(data: unknown): string {
  const parsed = MeshyTaskCreationResponseSchema.parse(data);
  return parsed.result || parsed.task_id || parsed.id || "";
}

/**
 * Parse and validate Meshy task status response
 * @throws ZodError if response is invalid
 */
export function parseMeshyTaskStatus(data: unknown): MeshyTaskResponse {
  return MeshyTaskResponseSchema.parse(data);
}

/**
 * Parse and validate Meshy rigging task response
 * @throws ZodError if response is invalid
 */
export function parseMeshyRiggingTask(data: unknown): MeshyRiggingTaskResponse {
  return MeshyRiggingTaskResponseSchema.parse(data);
}

// =============================================================================
// REQUEST SCHEMAS - For validating incoming API requests
// =============================================================================

// =============================================================================
// IMAGE TO 3D SCHEMA
// =============================================================================

/**
 * Image to 3D generation request
 */
export const MeshyImageTo3DSchema = z.object({
  action: z.literal("image-to-3d"),
  imageUrl: z.string().url(),
  enablePBR: z.boolean().optional(),
  aiModel: z.string().optional(),
  topology: z.enum(["quad", "triangle"]).optional(),
  targetPolycount: z.number().positive().optional(),
  textureResolution: z.number().positive().optional(),
});

// =============================================================================
// TEXT TO 3D SCHEMAS
// =============================================================================

/**
 * Text to 3D preview generation (Stage 1)
 */
export const MeshyTextTo3DPreviewSchema = z.object({
  action: z.literal("text-to-3d-preview"),
  prompt: z.string().min(1),
  aiModel: z.string().optional(),
  topology: z.enum(["quad", "triangle"]).optional(),
  targetPolycount: z.number().positive().optional(),
  artStyle: z.string().optional(),
  symmetryMode: z.enum(["auto", "on", "off"]).optional(),
  poseMode: z.string().optional(),
  seed: z.number().int().optional(),
});

/**
 * Text to 3D refine request (Stage 2)
 * Adds texture to preview mesh
 */
export const MeshyTextTo3DRefineSchema = z.object({
  action: z.literal("text-to-3d-refine"),
  previewTaskId: z.string().min(1),
  enablePBR: z.boolean().optional(),
  textureResolution: z.number().positive().optional(),
  texturePrompt: z.string().optional(),
  textureImageUrl: z.string().url().optional(),
});

// =============================================================================
// STATUS SCHEMA
// =============================================================================

/**
 * Task status check request
 */
export const MeshyStatusSchema = z.object({
  action: z.literal("status"),
  taskId: z.string().min(1),
});

// =============================================================================
// COMBINED REQUEST SCHEMA
// =============================================================================

/**
 * Combined Meshy request schema using discriminated union
 */
export const MeshyRequestSchema = z.discriminatedUnion("action", [
  MeshyImageTo3DSchema,
  MeshyTextTo3DPreviewSchema,
  MeshyTextTo3DRefineSchema,
  MeshyStatusSchema,
]);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type MeshyImageTo3DRequest = z.infer<typeof MeshyImageTo3DSchema>;
export type MeshyTextTo3DPreviewRequest = z.infer<
  typeof MeshyTextTo3DPreviewSchema
>;
export type MeshyTextTo3DRefineRequest = z.infer<
  typeof MeshyTextTo3DRefineSchema
>;
export type MeshyStatusRequest = z.infer<typeof MeshyStatusSchema>;
export type MeshyRequest = z.infer<typeof MeshyRequestSchema>;
