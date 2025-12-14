/**
 * Image-to-3D Pipeline
 * Complete workflow for converting images to 3D models
 *
 * Single-stage process (v1 API)
 */

import { createImageTo3DTask, getTaskStatusV1, type MeshyTask } from "./client";
import type { ImageTo3DOptions } from "./types";

export interface ImageTo3DPipelineResult {
  taskId: string;
  modelUrl: string;
  thumbnailUrl?: string;
  status: MeshyTask["status"];
}

/**
 * Start Image-to-3D generation
 */
export async function startImageTo3D(
  imageUrl: string,
  options?: Partial<ImageTo3DOptions>,
): Promise<{ taskId: string }> {
  const taskId = await createImageTo3DTask({
    image_url: imageUrl,
    enable_pbr: options?.enable_pbr ?? true,
    ai_model: options?.ai_model ?? "meshy-4",
    topology: options?.topology ?? "quad",
    target_polycount: options?.target_polycount ?? 30000,
    texture_resolution: options?.texture_resolution ?? 2048,
  });

  if (!taskId) {
    throw new Error("Failed to create image-to-3d task");
  }

  return { taskId };
}

/**
 * Poll task status until completion
 * Also works for text-to-3d tasks (Meshy uses same status endpoint)
 */
export async function pollTaskStatus(
  taskId: string,
  onProgress?: (progress: number) => void,
): Promise<ImageTo3DPipelineResult> {
  const maxAttempts = 120; // 10 minutes max (5s intervals)
  let attempts = 0;

  // Try v1 endpoints first (image-to-3d, retexture, rigging)
  const v1Endpoints: Array<"image-to-3d" | "retexture" | "rigging"> = [
    "image-to-3d",
    "retexture",
    "rigging",
  ];

  for (const endpoint of v1Endpoints) {
    try {
      while (attempts < maxAttempts) {
        const task = await getTaskStatusV1(taskId, endpoint);

        if (task.progress !== undefined) {
          onProgress?.(task.progress);
        }

        if (task.status === "SUCCEEDED") {
          const modelUrl = task.model_urls?.glb || task.model_url || "";
          if (!modelUrl) {
            throw new Error("Task completed but no model URL");
          }
          return {
            taskId: task.id || taskId,
            modelUrl,
            thumbnailUrl: task.thumbnail_url,
            status: "SUCCEEDED",
          };
        }

        if (task.status === "FAILED") {
          const errorMessage =
            task.task_error?.message || task.error || "Task failed";
          throw new Error(errorMessage);
        }

        if (task.status === "CANCELED") {
          throw new Error("Task was canceled");
        }

        // Wait 5 seconds before next poll
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;
      }
      break; // If we found the right endpoint, break
    } catch (error) {
      // Try next endpoint
      if (endpoint === v1Endpoints[v1Endpoints.length - 1]) {
        throw error; // Last endpoint, rethrow
      }
      continue;
    }
  }

  throw new Error("Task polling timeout");
}
