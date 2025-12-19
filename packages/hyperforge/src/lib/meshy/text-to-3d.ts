/**
 * Text-to-3D Pipeline
 * Complete workflow for generating 3D models from text prompts
 *
 * Two-stage process:
 * 1. Preview stage: Generates mesh without texture
 * 2. Refine stage: Adds texture to preview mesh
 *
 * @see https://docs.meshy.ai/api/text-to-3d
 */

import {
  createTextTo3DPreviewTask,
  createTextTo3DRefineTask,
  getTaskStatusV2,
  type MeshyTask,
} from "./client";
import type { TextTo3DOptions } from "./types";
import { DEFAULT_AI_MODEL, DEFAULT_TOPOLOGY } from "./constants";

export interface TextTo3DPipelineResult {
  taskId: string;
  modelUrl: string;
  thumbnailUrl?: string;
  status: MeshyTask["status"];
}

/**
 * Start Text-to-3D Preview stage
 * Generates base mesh without texture
 *
 * Polycount recommendations for Three.js web MMO:
 * - Small props: 500 - 2,000 triangles
 * - Medium props: 2,000 - 5,000 triangles
 * - NPC Characters: 2,000 - 10,000 triangles
 * - Large props: 5,000 - 10,000 triangles
 * - Small buildings: 5,000 - 15,000 triangles
 * - Large structures: 15,000 - 50,000 triangles
 */
export async function startTextTo3DPreview(
  prompt: string,
  options?: Partial<TextTo3DOptions>,
): Promise<{ previewTaskId: string }> {
  const previewTaskId = await createTextTo3DPreviewTask({
    prompt,
    art_style: options?.art_style ?? "realistic",
    ai_model: options?.ai_model ?? DEFAULT_AI_MODEL,
    topology: options?.topology ?? DEFAULT_TOPOLOGY,
    target_polycount: options?.target_polycount ?? 2000, // Game-optimized default
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
 *
 * Per Meshy docs, the refine stage uses texture_prompt to guide texturing.
 * If no texture_prompt is provided, Meshy will use the original preview prompt.
 */
export async function startTextTo3DRefine(
  previewTaskId: string,
  options?: Partial<TextTo3DOptions>,
): Promise<{ refineTaskId: string }> {
  const refineTaskId = await createTextTo3DRefineTask(previewTaskId, {
    prompt: "", // Not used in refine stage (texture_prompt is used instead)
    enable_pbr: options?.enable_pbr ?? true,
    texture_prompt: options?.texture_prompt, // Guides texture generation
    texture_image_url: options?.texture_image_url,
    ai_model: options?.ai_model, // Must match preview model for meshy-5/latest
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
