/**
 * Text-to-3D Pipeline
 * Complete workflow for generating 3D models from text prompts
 *
 * Two-stage process:
 * 1. Preview stage: Generates mesh without texture
 * 2. Refine stage: Adds texture to preview mesh
 */

import {
  createTextTo3DPreviewTask,
  createTextTo3DRefineTask,
  getTaskStatusV2,
  type MeshyTask,
} from "./client";
import type { TextTo3DOptions } from "./types";

export interface TextTo3DPipelineResult {
  taskId: string;
  modelUrl: string;
  thumbnailUrl?: string;
  status: MeshyTask["status"];
}

/**
 * Start Text-to-3D Preview stage
 * Generates base mesh without texture
 */
export async function startTextTo3DPreview(
  prompt: string,
  options?: Partial<TextTo3DOptions>,
): Promise<{ previewTaskId: string }> {
  const previewTaskId = await createTextTo3DPreviewTask({
    prompt,
    art_style: options?.art_style ?? "realistic",
    ai_model: options?.ai_model ?? "latest",
    topology: options?.topology ?? "triangle",
    target_polycount: options?.target_polycount ?? 30000,
    should_remesh: options?.should_remesh ?? true,
    symmetry_mode: options?.symmetry_mode ?? "auto",
    pose_mode: options?.pose_mode ?? "",
    seed: options?.seed,
    moderation: options?.moderation ?? false,
  });

  if (!previewTaskId) {
    throw new Error("Failed to create preview task");
  }

  return { previewTaskId };
}

/**
 * Start Text-to-3D Refine stage
 * Adds texture to completed preview mesh
 */
export async function startTextTo3DRefine(
  previewTaskId: string,
  options?: Partial<TextTo3DOptions>,
): Promise<{ refineTaskId: string }> {
  const refineTaskId = await createTextTo3DRefineTask(previewTaskId, {
    prompt: "", // Not used in refine stage
    enable_pbr: options?.enable_pbr ?? true,
    texture_resolution: options?.texture_resolution ?? 2048,
    texture_prompt: options?.texture_prompt,
    texture_image_url: options?.texture_image_url,
  });

  if (!refineTaskId) {
    throw new Error("Failed to create refine task");
  }

  return { refineTaskId };
}

/**
 * Poll Text-to-3D task status until completion
 */
export async function pollTextTo3DStatus(
  taskId: string,
  onProgress?: (progress: number) => void,
): Promise<TextTo3DPipelineResult> {
  const maxAttempts = 120; // 10 minutes max (5s intervals)
  let attempts = 0;

  while (attempts < maxAttempts) {
    const task = await getTaskStatusV2(taskId);

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

  throw new Error("Task polling timeout");
}

/**
 * Complete Text-to-3D workflow (Preview + Refine)
 * Automatically handles both stages
 */
export async function startTextTo3D(
  prompt: string,
  options?: Partial<TextTo3DOptions>,
  onProgress?: (stage: "preview" | "refine", progress: number) => void,
): Promise<TextTo3DPipelineResult> {
  // Stage 1: Preview
  onProgress?.("preview", 0);
  const { previewTaskId } = await startTextTo3DPreview(prompt, options);

  // Poll preview completion
  await pollTextTo3DStatus(previewTaskId, (progress) => {
    onProgress?.("preview", progress);
  });

  // Stage 2: Refine
  onProgress?.("refine", 0);
  const { refineTaskId } = await startTextTo3DRefine(previewTaskId, options);

  // Poll refine completion
  const result = await pollTextTo3DStatus(refineTaskId, (progress) => {
    onProgress?.("refine", progress);
  });

  return result;
}
