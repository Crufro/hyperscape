/**
 * Meshy API Client
 * Handles all Meshy 3D generation API calls
 *
 * API Versions:
 * - v1: Image-to-3D, Retexture, Rigging
 * - v2: Text-to-3D (two-stage: preview → refine)
 */

import type {
  MeshyTask as MeshyTaskType,
  ImageTo3DOptions,
  TextTo3DOptions,
  RetextureOptions,
  RiggingOptions,
  RiggingTaskResult,
  MeshyTaskResponse,
} from "./types";

// Re-export MeshyTask for use by other modules
export type { MeshyTask } from "./types";
type MeshyTask = MeshyTaskType;

const MESHY_API_BASE_V1 = "https://api.meshy.ai/openapi/v1";
const MESHY_API_BASE_V2 = "https://api.meshy.ai/openapi/v2";

function getApiKey(): string {
  const key = process.env.MESHY_API_KEY;
  if (!key) {
    throw new Error("MESHY_API_KEY environment variable is required");
  }
  return key;
}

async function meshyRequest<T>(
  endpoint: string,
  options: RequestInit & { baseUrl?: string } = {},
): Promise<T> {
  const baseUrl = options.baseUrl || MESHY_API_BASE_V1;
  const { baseUrl: _, ...fetchOptions } = options;

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...fetchOptions,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(
      `Meshy API error (${response.status}): ${JSON.stringify(error)}`,
    );
  }

  return response.json();
}

/**
 * Create Image-to-3D task (v1 API)
 * Returns task ID string from { result: "task-id" } response
 */
export async function createImageTo3DTask(
  options: ImageTo3DOptions,
): Promise<string> {
  const response = await meshyRequest<MeshyTaskResponse>("/image-to-3d", {
    method: "POST",
    baseUrl: MESHY_API_BASE_V1,
    body: JSON.stringify({
      image_url: options.image_url,
      enable_pbr: options.enable_pbr ?? true,
      ai_model: options.ai_model ?? "meshy-4",
      topology: options.topology ?? "quad",
      target_polycount: options.target_polycount ?? 30000,
      texture_resolution: options.texture_resolution ?? 2048,
    }),
  });

  // Extract task ID from response
  return response.result || response.task_id || response.id || "";
}

/**
 * Create Text-to-3D Preview task (v2 API - Stage 1)
 * Returns task ID string from { result: "task-id" } response
 */
export async function createTextTo3DPreviewTask(
  options: TextTo3DOptions,
): Promise<string> {
  const response = await meshyRequest<MeshyTaskResponse>("/text-to-3d", {
    method: "POST",
    baseUrl: MESHY_API_BASE_V2,
    body: JSON.stringify({
      mode: "preview",
      prompt: options.prompt,
      art_style: options.art_style ?? "realistic",
      ai_model: options.ai_model ?? "latest", // Default to latest (Meshy-6)
      topology: options.topology ?? "triangle",
      target_polycount: options.target_polycount ?? 30000,
      should_remesh: true,
      seed: options.seed,
      symmetry_mode: options.symmetry_mode ?? "auto",
      pose_mode: options.pose_mode ?? "",
    }),
  });

  return response.result || response.task_id || response.id || "";
}

/**
 * Create Text-to-3D Refine task (v2 API - Stage 2)
 * Requires a completed preview task ID
 *
 * Per Meshy docs: https://docs.meshy.ai/en/api/text-to-3d
 * Valid params: mode, preview_task_id, enable_pbr, texture_prompt, texture_image_url, ai_model, moderation
 * Note: texture_resolution is NOT valid for refine - texturing happens at original resolution
 */
export async function createTextTo3DRefineTask(
  previewTaskId: string,
  options: TextTo3DOptions,
): Promise<string> {
  const body: Record<string, unknown> = {
    mode: "refine",
    preview_task_id: previewTaskId,
    enable_pbr: options.enable_pbr ?? true,
  };

  // Add texture_prompt if provided (guides texture generation)
  if (options.texture_prompt) {
    body.texture_prompt = options.texture_prompt;
  }

  // Add texture_image_url if provided (alternative to texture_prompt)
  if (options.texture_image_url) {
    body.texture_image_url = options.texture_image_url;
  }

  // Pass ai_model if specified (must match preview task's model for meshy-5/latest)
  if (options.ai_model) {
    body.ai_model = options.ai_model;
  }

  const response = await meshyRequest<MeshyTaskResponse>("/text-to-3d", {
    method: "POST",
    baseUrl: MESHY_API_BASE_V2,
    body: JSON.stringify(body),
  });

  return response.result || response.task_id || response.id || "";
}

/**
 * Get task status (v1 API)
 * For image-to-3d, retexture, rigging tasks
 */
export async function getTaskStatusV1(
  taskId: string,
  endpoint: "image-to-3d" | "retexture" | "rigging",
): Promise<MeshyTask> {
  return meshyRequest<MeshyTask>(`/${endpoint}/${taskId}`, {
    method: "GET",
    baseUrl: MESHY_API_BASE_V1,
  });
}

/**
 * Get rigging task status (v1 API)
 * Returns RiggingTaskResult with result.rigged_character_glb_url
 */
export async function getRiggingTaskStatus(
  taskId: string,
): Promise<RiggingTaskResult> {
  return meshyRequest<RiggingTaskResult>(`/rigging/${taskId}`, {
    method: "GET",
    baseUrl: MESHY_API_BASE_V1,
  });
}

/**
 * Get task status (v2 API)
 * For text-to-3d tasks using unified tasks endpoint
 */
export async function getTaskStatusV2(taskId: string): Promise<MeshyTask> {
  return meshyRequest<MeshyTask>(`/tasks/${taskId}`, {
    method: "GET",
    baseUrl: MESHY_API_BASE_V2,
  });
}

/**
 * Get task status (auto-detect API version)
 * Tries v2 first, falls back to v1 if needed
 */
export async function getTaskStatus(taskId: string): Promise<MeshyTask> {
  try {
    return await getTaskStatusV2(taskId);
  } catch {
    // Fallback to v1 endpoints
    for (const endpoint of ["image-to-3d", "retexture", "rigging"] as const) {
      try {
        return await getTaskStatusV1(taskId, endpoint);
      } catch {
        // Try next endpoint
      }
    }
    throw new Error(`Failed to get task status for ${taskId}`);
  }
}

/**
 * Create retexture task (v1 API)
 * Returns task ID string from { result: "task-id" } response
 */
export async function createRetextureTask(
  options: RetextureOptions,
): Promise<string> {
  const body: Record<string, unknown> = {
    art_style: options.art_style ?? "realistic",
    ai_model: options.ai_model ?? "meshy-5",
    enable_original_uv: options.enable_original_uv ?? true,
  };

  if (options.input_task_id) {
    body.input_task_id = options.input_task_id;
  } else if (options.model_url) {
    body.model_url = options.model_url;
  } else {
    throw new Error("Either input_task_id or model_url must be provided");
  }

  if (options.text_style_prompt) {
    body.text_style_prompt = options.text_style_prompt;
  } else if (options.image_style_url) {
    body.image_style_url = options.image_style_url;
  } else {
    throw new Error(
      "Either text_style_prompt or image_style_url must be provided",
    );
  }

  const response = await meshyRequest<MeshyTaskResponse>("/retexture", {
    method: "POST",
    baseUrl: MESHY_API_BASE_V1,
    body: JSON.stringify(body),
  });

  return response.result || response.task_id || response.id || "";
}

/**
 * Create rigging task (v1 API)
 * Returns task ID string from { result: "task-id" } response
 */
export async function createRiggingTask(
  options: RiggingOptions,
): Promise<string> {
  const body: Record<string, unknown> = {
    height_meters: options.height_meters ?? 1.7,
  };

  if (options.input_task_id) {
    body.input_task_id = options.input_task_id;
  } else if (options.model_url) {
    body.model_url = options.model_url;
  } else {
    throw new Error("Either input_task_id or model_url must be provided");
  }

  const response = await meshyRequest<MeshyTaskResponse>("/rigging", {
    method: "POST",
    baseUrl: MESHY_API_BASE_V1,
    body: JSON.stringify(body),
  });

  return response.result || response.task_id || response.id || "";
}
