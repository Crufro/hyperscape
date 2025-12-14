/**
 * Generation Service
 * Unified orchestrator for all generation types (3D, Audio, Content)
 */

import type { GenerationConfig } from "@/components/generation/GenerationFormRouter";
import {
  startTextTo3DPreview,
  startTextTo3DRefine,
} from "@/lib-core/meshy/text-to-3d";
import { startImageTo3D } from "@/lib-core/meshy/image-to-3d";
import { pollTaskStatus as pollTaskStatusUnified } from "@/lib-core/meshy/poll-task";
import {
  createRiggingTask,
  getRiggingTaskStatus,
} from "@/lib-core/meshy/client";
import type { GenerationProgress } from "@/stores/generation-store";
import {
  downloadAndSaveModel,
  saveAssetFiles,
  downloadFile,
} from "@/lib/storage/asset-storage";
import { enhancePromptWithGPT4 } from "@/lib/ai/openai-service";

export interface GenerationResult {
  taskId: string;
  modelUrl: string;
  thumbnailUrl?: string;
  vrmUrl?: string; // VRM format URL if conversion was performed
  hasVRM?: boolean; // Whether VRM was saved locally
  hasHandRigging?: boolean; // Whether hand bones were added
  localModelUrl?: string; // Local API URL for the model
  localVrmUrl?: string; // Local API URL for the VRM
  localThumbnailUrl?: string; // Local API URL for the thumbnail
  metadata: Record<string, unknown>;
}

/**
 * Generate 3D model using Meshy
 */
export async function generate3DModel(
  config: GenerationConfig,
  onProgress?: (progress: GenerationProgress) => void,
): Promise<GenerationResult> {
  const { prompt, pipeline, imageUrl, quality, metadata } = config;

  // Map quality to Meshy AI model options
  // See: https://docs.meshy.ai/en/api/text-to-3d
  // As of Dec 2024, "latest" = Meshy-6, the newest and best model
  const qualityOptions = {
    // Preview / Meshy-4: Fast, lower quality (for quick iterations)
    preview: {
      targetPolycount: 10000,
      textureResolution: 1024,
      enablePBR: true,
      aiModel: "meshy-4",
      textureRichness: "medium",
    },
    // Medium / Meshy-6: High quality with latest model
    medium: {
      targetPolycount: 30000,
      textureResolution: 2048,
      enablePBR: true,
      aiModel: "latest", // Meshy-6 - best quality
      textureRichness: "high",
    },
    // High / Meshy-6: Maximum quality settings
    high: {
      targetPolycount: 50000,
      textureResolution: 4096,
      enablePBR: true,
      aiModel: "latest", // Meshy-6 - best quality
      textureRichness: "high",
    },
  };

  const options = qualityOptions[quality] || qualityOptions.medium;

  try {
    // Stage 0: GPT-4 Prompt Enhancement (if enabled)
    let effectivePrompt = prompt;

    if (config.useGPT4Enhancement !== false) {
      onProgress?.({
        status: "generating",
        progress: 0,
        currentStep: "Enhancing prompt with AI...",
      });

      const isAvatar =
        config.category === "npc" || config.category === "character";
      const enhancementResult = await enhancePromptWithGPT4(prompt, {
        assetType: config.category || "item",
        isAvatar,
      });

      if (!enhancementResult.error) {
        effectivePrompt = enhancementResult.enhancedPrompt;
        console.log("[Generation] Enhanced prompt:", effectivePrompt);
      } else {
        console.warn("[Generation] Prompt enhancement failed, using original");
      }
    }

    // Stage 1: Start 3D generation
    onProgress?.({
      status: "generating",
      progress: 5,
      currentStep: "Starting 3D generation...",
    });

    let result: { taskId: string; modelUrl: string; thumbnailUrl?: string };

    if (pipeline === "text-to-3d") {
      // Two-stage text-to-3D workflow
      onProgress?.({
        status: "generating",
        progress: 5,
        currentStep: "Starting preview stage...",
      });

      // Stage 1: Preview
      const { previewTaskId } = await startTextTo3DPreview(effectivePrompt, {
        ai_model: options.aiModel,
        topology: "triangle",
        target_polycount: options.targetPolycount,
        art_style: "realistic",
      });

      onProgress?.({
        status: "generating",
        progress: 10,
        currentStep: "Generating preview mesh...",
      });

      // Poll preview completion
      await pollTaskStatusUnified(previewTaskId, {
        pollIntervalMs: 5000,
        timeoutMs: 300000,
        onProgress: (progress, precedingTasks) => {
          const queueInfo =
            precedingTasks !== undefined
              ? ` (${precedingTasks} tasks ahead)`
              : "";
          onProgress?.({
            status: "generating",
            progress: 10 + Math.floor(progress * 0.35), // 10-45%
            currentStep: `Preview stage: ${progress}%${queueInfo}`,
          });
        },
      });

      // Stage 2: Refine
      onProgress?.({
        status: "generating",
        progress: 45,
        currentStep: "Starting refine stage...",
      });

      const { refineTaskId } = await startTextTo3DRefine(previewTaskId, {
        enable_pbr: options.enablePBR,
        texture_resolution: options.textureResolution,
      });

      onProgress?.({
        status: "generating",
        progress: 50,
        currentStep: "Adding textures...",
      });

      // Poll refine completion
      const refineResult = await pollTaskStatusUnified(refineTaskId, {
        pollIntervalMs: 5000,
        timeoutMs: 300000,
        onProgress: (progress, precedingTasks) => {
          const queueInfo =
            precedingTasks !== undefined
              ? ` (${precedingTasks} tasks ahead)`
              : "";
          onProgress?.({
            status: "generating",
            progress: 50 + Math.floor(progress * 0.45), // 50-95%
            currentStep: `Refine stage: ${progress}%${queueInfo}`,
          });
        },
      });

      // Stage 3: Meshy Auto-Rigging (if this is an avatar/character)
      const needsRigging = config.convertToVRM || config.enableHandRigging;
      const isCharacter =
        config.category === "npc" || config.category === "character";

      if (needsRigging && isCharacter && refineResult.modelUrl) {
        onProgress?.({
          status: "generating",
          progress: 70,
          currentStep: "Sending to Meshy for auto-rigging...",
        });

        try {
          // Start Meshy rigging task
          const riggingTaskId = await createRiggingTask({
            model_url: refineResult.modelUrl,
            height_meters: 1.7, // Standard adult human height
          });

          console.log(
            "[Generation] Started Meshy rigging task:",
            riggingTaskId,
          );

          // Poll rigging task completion
          let riggingStatus = await getRiggingTaskStatus(riggingTaskId);
          let riggingAttempts = 0;
          const maxRiggingAttempts = 60; // 5 minutes max (5s * 60)

          while (
            riggingStatus.status !== "SUCCEEDED" &&
            riggingStatus.status !== "FAILED" &&
            riggingAttempts < maxRiggingAttempts
          ) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
            riggingStatus = await getRiggingTaskStatus(riggingTaskId);
            riggingAttempts++;

            const progress =
              riggingStatus.progress ??
              Math.floor((riggingAttempts / maxRiggingAttempts) * 100);
            onProgress?.({
              status: "generating",
              progress: 70 + Math.floor(progress * 0.15), // 70-85%
              currentStep: `Meshy rigging: ${progress}%`,
            });
          }

          // Rigging API returns model in result.rigged_character_glb_url
          const riggedModelUrl = riggingStatus.result?.rigged_character_glb_url;

          if (riggingStatus.status === "SUCCEEDED" && riggedModelUrl) {
            console.log("[Generation] Meshy rigging completed successfully");
            console.log("[Generation] Rigged model URL:", riggedModelUrl);
            result = {
              taskId: riggingTaskId,
              modelUrl: riggedModelUrl,
              thumbnailUrl: refineResult.thumbnailUrl, // Keep original thumbnail
            };
          } else {
            console.warn(
              "[Generation] Meshy rigging failed with status:",
              riggingStatus.status,
            );
            console.warn(
              "[Generation] Rigging error details:",
              riggingStatus.task_error?.message || "Unknown",
            );
            result = {
              taskId: refineResult.taskId,
              modelUrl: refineResult.modelUrl,
              thumbnailUrl: refineResult.thumbnailUrl,
            };
          }
        } catch (riggingError) {
          console.error("[Generation] Meshy rigging error:", riggingError);
          // Continue with unrigged model
          result = {
            taskId: refineResult.taskId,
            modelUrl: refineResult.modelUrl,
            thumbnailUrl: refineResult.thumbnailUrl,
          };
        }
      } else {
        result = {
          taskId: refineResult.taskId,
          modelUrl: refineResult.modelUrl,
          thumbnailUrl: refineResult.thumbnailUrl,
        };
      }
    } else {
      // Single-stage image-to-3D workflow
      if (!imageUrl) {
        throw new Error("Image URL required for image-to-3d pipeline");
      }

      const { taskId } = await startImageTo3D(imageUrl, {
        enable_pbr: options.enablePBR,
        ai_model: options.aiModel,
        topology: "quad",
        target_polycount: options.targetPolycount,
        texture_resolution: options.textureResolution,
      });

      onProgress?.({
        status: "generating",
        progress: 10,
        currentStep: "Generating 3D model...",
      });

      // Poll for completion
      const imageResult = await pollTaskStatusUnified(taskId, {
        pollIntervalMs: 5000,
        timeoutMs: 300000,
        onProgress: (progress, precedingTasks) => {
          const queueInfo =
            precedingTasks !== undefined
              ? ` (${precedingTasks} tasks ahead)`
              : "";
          onProgress?.({
            status: "generating",
            progress: 10 + Math.floor(progress * 0.85), // 10-95%
            currentStep: `Processing: ${progress}%${queueInfo}`,
          });
        },
      });

      result = {
        taskId: imageResult.taskId,
        modelUrl: imageResult.modelUrl,
        thumbnailUrl: imageResult.thumbnailUrl,
      };
    }

    // Generate asset ID from metadata or task ID
    const assetId = (metadata?.id as string) || `asset_${result.taskId}`;

    // Download and save the GLB model
    onProgress?.({
      status: "generating",
      progress: 90,
      currentStep: "Saving 3D model locally...",
    });

    // Download the model and thumbnail
    const modelBuffer = await downloadFile(result.modelUrl);
    let thumbnailBuffer: Buffer | undefined;
    if (result.thumbnailUrl) {
      try {
        thumbnailBuffer = await downloadFile(result.thumbnailUrl);
      } catch {
        console.warn("Failed to download thumbnail");
      }
    }

    // Pipeline order: Hand Rigging (GLB) → VRM Conversion (last)
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3500";

    // Step 1: Hand rigging on GLB (if enabled)
    let processedModelBuffer = modelBuffer;
    let hasHandRigging = false;
    const shouldAddHandRigging =
      config.enableHandRigging &&
      (config.category === "npc" || config.category === "character");

    if (shouldAddHandRigging) {
      try {
        onProgress?.({
          status: "generating",
          progress: 92,
          currentStep: "Adding hand bones to model...",
        });

        // Call hand rigging API with GLB data
        const handRigResponse = await fetch(
          `${baseUrl}/api/hand-rigging/simple`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              glbData: modelBuffer.toString("base64"),
              options: {
                addFingerBones: true,
                fingerBoneLength: 0.1,
              },
            }),
          },
        );

        if (handRigResponse.ok) {
          const handRigData = await handRigResponse.json();

          // Use hand-rigged GLB for subsequent processing
          if (handRigData.riggedGlbData) {
            processedModelBuffer = Buffer.from(
              handRigData.riggedGlbData,
              "base64",
            );
            hasHandRigging = true;
            console.log("✅ Hand rigging complete:", {
              leftHandBones: handRigData.leftHandBones?.length || 0,
              rightHandBones: handRigData.rightHandBones?.length || 0,
            });
          }

          if (handRigData.warnings && handRigData.warnings.length > 0) {
            console.warn("Hand rigging warnings:", handRigData.warnings);
          }
        } else {
          console.error("Hand rigging failed:", await handRigResponse.text());
          // Don't fail - continue with original GLB
        }
      } catch (error) {
        console.error("Hand rigging error:", error);
        // Don't fail the whole generation if hand rigging fails
      }
    }

    // Step 2: VRM conversion (always last in pipeline, if enabled)
    let vrmUrl: string | undefined;
    let vrmBuffer: Buffer | undefined;
    const shouldConvertToVRM =
      config.convertToVRM &&
      (config.category === "npc" || config.category === "character");

    if (shouldConvertToVRM) {
      try {
        onProgress?.({
          status: "generating",
          progress: 95,
          currentStep: "Converting to VRM format...",
        });

        // Call VRM conversion API with processed GLB (may have hand rigging)
        const vrmResponse = await fetch(`${baseUrl}/api/vrm/convert`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // Use processed model (with hand rigging if applied) or original URL
            glbData: hasHandRigging
              ? processedModelBuffer.toString("base64")
              : undefined,
            modelUrl: hasHandRigging ? undefined : result.modelUrl,
            avatarName: (metadata?.name as string) || "Generated Avatar",
            author: "HyperForge",
          }),
        });

        if (vrmResponse.ok) {
          const vrmData = await vrmResponse.json();
          vrmUrl = vrmData.vrmDataUrl;

          // Decode base64 VRM data to buffer for saving
          if (vrmData.vrmData) {
            vrmBuffer = Buffer.from(vrmData.vrmData, "base64");
          }

          // Log warnings if any
          if (vrmData.warnings && vrmData.warnings.length > 0) {
            console.warn("VRM conversion warnings:", vrmData.warnings);
          }
        } else {
          console.error("VRM conversion failed:", await vrmResponse.text());
          // Don't fail the whole generation if VRM conversion fails
        }
      } catch (error) {
        console.error("VRM conversion error:", error);
        // Don't fail the whole generation if VRM conversion fails
      }
    }

    // Use the processed model buffer (with hand rigging if applied)
    const finalModelBuffer = processedModelBuffer;
    const finalVrmBuffer = vrmBuffer;

    onProgress?.({
      status: "generating",
      progress: 97,
      currentStep: "Saving assets to library...",
    });

    // Save all files (GLB with hand rigging if applied, thumbnail, and optionally VRM)
    const savedFiles = await saveAssetFiles({
      assetId,
      modelBuffer: finalModelBuffer,
      modelFormat: "glb",
      thumbnailBuffer,
      vrmBuffer: finalVrmBuffer,
      metadata: {
        ...metadata,
        meshyTaskId: result.taskId,
        meshyModelUrl: result.modelUrl,
        meshyThumbnailUrl: result.thumbnailUrl,
        hasVRM: !!finalVrmBuffer,
        hasHandRigging,
        convertToVRM: config.convertToVRM,
        enableHandRigging: config.enableHandRigging,
        pipeline: config.pipeline,
        quality: config.quality,
        prompt: config.prompt,
        createdAt: new Date().toISOString(),
      },
    });

    onProgress?.({
      status: "completed",
      progress: 100,
      currentStep: "Generation complete!",
    });

    return {
      taskId: result.taskId,
      modelUrl: result.modelUrl,
      thumbnailUrl: result.thumbnailUrl,
      vrmUrl,
      hasVRM: !!finalVrmBuffer,
      hasHandRigging,
      localModelUrl: savedFiles.modelUrl,
      localVrmUrl: savedFiles.vrmUrl,
      localThumbnailUrl: savedFiles.thumbnailUrl,
      metadata: {
        ...metadata,
        assetId,
        hasVRM: !!finalVrmBuffer,
        hasHandRigging,
      },
    };
  } catch (error) {
    onProgress?.({
      status: "failed",
      progress: 0,
      error: error instanceof Error ? error.message : "Generation failed",
    });
    throw error;
  }
}

/**
 * Generate batch of variations
 */
export async function generateBatch(
  baseConfig: GenerationConfig,
  count: number,
  onProgress?: (progress: GenerationProgress) => void,
): Promise<GenerationResult[]> {
  const results: GenerationResult[] = [];

  for (let i = 0; i < count; i++) {
    onProgress?.({
      status: "generating",
      progress: Math.floor((i / count) * 100),
      currentStep: `Generating variation ${i + 1} of ${count}...`,
    });

    // Modify prompt slightly for variation
    const variationPrompt = `${baseConfig.prompt} (variation ${i + 1})`;
    const variationConfig = {
      ...baseConfig,
      prompt: variationPrompt,
    };

    try {
      const result = await generate3DModel(variationConfig);
      results.push(result);
    } catch (error) {
      console.error(`Failed to generate variation ${i + 1}:`, error);
      // Continue with other variations
    }
  }

  return results;
}
