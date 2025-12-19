/**
 * Regenerate API Route
 * Creates variations of existing assets using same/modified prompts
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAssetById,
  createAsset,
  updateAssetPaths,
  updateAssetStatus,
} from "@/lib/db/asset-queries";
import { downloadAndSaveModel } from "@/lib/storage/asset-storage";
import {
  startTextTo3DPreview,
  startTextTo3DRefine,
} from "@/lib/meshy/text-to-3d";
import { startImageTo3D } from "@/lib/meshy/image-to-3d";
import { pollTaskStatus } from "@/lib/meshy/poll-task";
import type { MeshyAIModel } from "@/lib/meshy/types";
import { logger } from "@/lib/utils";

const log = logger.child("API:regenerate");

/**
 * Modify prompt based on variation strength
 * Lower strength = subtle changes, Higher strength = more creative
 */
function modifyPrompt(
  originalPrompt: string,
  variationStrength: number,
  customPrompt?: string,
): string {
  if (customPrompt) {
    // Blend custom prompt with original based on strength
    if (variationStrength >= 80) {
      return customPrompt;
    } else if (variationStrength >= 50) {
      return `${customPrompt}, inspired by: ${originalPrompt}`;
    } else {
      return `${originalPrompt}, with elements of: ${customPrompt}`;
    }
  }

  // Auto-variation modifiers based on strength
  const variations = [
    "", // 0-20: No change
    ", slight variation", // 21-40
    ", alternative interpretation", // 41-60
    ", reimagined", // 61-80
    ", creative new take on", // 81-100
  ];

  const index = Math.min(Math.floor(variationStrength / 20), 4);
  const modifier = variations[index];

  if (modifier && variationStrength > 20) {
    return `${originalPrompt}${modifier} (variation ${Math.random().toString(36).slice(2, 6)})`;
  }

  return originalPrompt;
}

interface MeshOptions {
  targetPolycount?: number;
  topology?: "triangle" | "quad";
  shouldRemesh?: boolean;
  enablePBR?: boolean;
}

interface RegenerateRequest {
  assetId: string;
  prompt?: string;
  variationStrength?: number;
  meshOptions?: MeshOptions;
  // CDN asset fields (for assets not in database)
  assetName?: string;
  assetType?: string;
  assetCategory?: string;
  assetDescription?: string;
  thumbnailUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegenerateRequest;
    const {
      assetId,
      prompt: customPrompt,
      variationStrength = 50,
      meshOptions,
      assetName: directAssetName,
      assetType: directAssetType,
      assetCategory: directAssetCategory,
      assetDescription: _directAssetDescription,
      thumbnailUrl: directThumbnailUrl,
    } = body;

    if (!assetId) {
      return NextResponse.json({ error: "Asset ID required" }, { status: 400 });
    }

    // Try to get the source asset from database
    const sourceAsset = await getAssetById(assetId);

    // Determine source info - from database or from request (CDN assets)
    let sourceName: string;
    let sourceType: string;
    let sourceCategory: string | undefined;
    let originalPrompt: string;
    let pipeline: "text-to-3d" | "image-to-3d";
    let quality: "standard" | "high" | "ultra";
    let imageUrl: string | undefined;

    if (sourceAsset) {
      // Database asset - get info from stored data
      const generationParams = sourceAsset.generationParams as Record<
        string,
        unknown
      > | null;
      sourceName = sourceAsset.name;
      sourceType = sourceAsset.type;
      sourceCategory = sourceAsset.category || undefined;
      originalPrompt =
        sourceAsset.prompt || (generationParams?.prompt as string) || "";
      pipeline =
        (generationParams?.pipeline as "text-to-3d" | "image-to-3d") ||
        "text-to-3d";
      quality =
        (generationParams?.quality as "standard" | "high" | "ultra") || "high";
      imageUrl = generationParams?.imageUrl as string | undefined;
    } else if (directAssetName) {
      // CDN asset - use provided info
      sourceName = directAssetName;
      sourceType = directAssetType || "object";
      sourceCategory = directAssetCategory;
      // For CDN assets, we'll use the provided prompt or generate from the name
      originalPrompt =
        customPrompt ||
        `A ${sourceName.toLowerCase()}, high quality 3D game asset`;
      // CDN assets regenerate via text-to-3d since we don't have the original image
      pipeline = "text-to-3d";
      quality = "high";
      imageUrl = directThumbnailUrl; // Could use thumbnail as reference if available

      log.info({ assetId, sourceName }, "Using CDN asset for regeneration");
    } else {
      return NextResponse.json(
        {
          error:
            "Asset not found in database and no asset info provided. For CDN assets, include assetName in request.",
        },
        { status: 404 },
      );
    }

    if (!originalPrompt && !customPrompt && pipeline === "text-to-3d") {
      return NextResponse.json(
        {
          error:
            "No prompt available for regeneration. Please provide a prompt.",
        },
        { status: 400 },
      );
    }

    // Allow image-to-3d without original imageUrl for CDN assets
    if (pipeline === "image-to-3d" && !imageUrl && sourceAsset) {
      return NextResponse.json(
        { error: "Source asset has no image URL for regeneration" },
        { status: 400 },
      );
    }

    log.info(
      { assetId, sourceName, variationStrength },
      "Starting regeneration",
    );

    // Create new asset record first
    const modifiedPrompt = modifyPrompt(
      originalPrompt || `A ${sourceName.toLowerCase()}, high quality 3D model`,
      variationStrength,
      customPrompt,
    );
    const variantNumber = Date.now().toString(36).slice(-4);
    const variantName = `${sourceName}-v${variantNumber}`;

    // Check if database is available
    const hasDatabaseUrl = !!process.env.DATABASE_URL;
    let newAsset: { id: string } | null = null;

    if (hasDatabaseUrl) {
      try {
        newAsset = await createAsset({
          name: variantName,
          description: `Variation of ${sourceName} (${variationStrength}% strength)`,
          type: sourceType,
          category: sourceCategory,
          tags: [...(sourceAsset?.tags || []), "variant", "regenerated"],
          prompt: modifiedPrompt,
          generationParams: {
            pipeline,
            quality,
            originalPrompt,
            modifiedPrompt,
            variationStrength,
            imageUrl: pipeline === "image-to-3d" ? imageUrl : undefined,
            sourceAssetId: assetId,
          },
          aiModel: "meshy-5",
          status: "processing",
          parentAssetId: sourceAsset ? assetId : undefined,
        });
        log.info(
          { newAssetId: newAsset.id },
          "Created asset record for regeneration",
        );
      } catch (dbError) {
        log.warn(
          {
            error: dbError instanceof Error ? dbError.message : String(dbError),
          },
          "Database unavailable, proceeding without asset record",
        );
      }
    }

    const finalAssetId =
      newAsset?.id ||
      `regen-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Quality presets optimized for 60fps RuneScape-style gameplay
    const qualityPresets: Record<
      string,
      {
        targetPolycount: number;
        textureResolution: number;
        enablePBR: boolean;
        aiModel: MeshyAIModel;
        topology: "triangle" | "quad";
        shouldRemesh: boolean;
      }
    > = {
      standard: {
        targetPolycount: 1500, // Game items, props
        textureResolution: 1024,
        enablePBR: false,
        aiModel: "meshy-4",
        topology: "triangle",
        shouldRemesh: true,
      },
      high: {
        targetPolycount: 3000, // Detailed weapons, armor
        textureResolution: 2048,
        enablePBR: true,
        aiModel: "meshy-5",
        topology: "triangle",
        shouldRemesh: true,
      },
      ultra: {
        targetPolycount: 5000, // NPCs, characters (max 10K)
        textureResolution: 2048,
        enablePBR: true,
        aiModel: "meshy-5",
        topology: "quad",
        shouldRemesh: true,
      },
    };

    // Merge preset with user-provided mesh options
    const preset = qualityPresets[quality];
    const options = {
      ...preset,
      // Override with mesh options if provided
      targetPolycount: meshOptions?.targetPolycount ?? preset.targetPolycount,
      topology: meshOptions?.topology ?? preset.topology,
      shouldRemesh: meshOptions?.shouldRemesh ?? preset.shouldRemesh,
      enablePBR: meshOptions?.enablePBR ?? preset.enablePBR,
    };

    log.info({ meshOptions: options }, "Using mesh options");

    let modelUrl: string;
    let thumbnailUrl: string | undefined;
    let meshyTaskId: string;

    try {
      if (pipeline === "text-to-3d") {
        // Two-stage text-to-3D
        log.debug("Starting text-to-3D preview");
        const { previewTaskId } = await startTextTo3DPreview(modifiedPrompt, {
          ai_model: options.aiModel,
          topology: options.topology,
          target_polycount: options.targetPolycount,
          should_remesh: options.shouldRemesh,
          art_style: "realistic",
        });

        // Poll preview completion
        await pollTaskStatus(previewTaskId, {
          pollIntervalMs: 5000,
          timeoutMs: 300000,
          onProgress: (progress) => {
            log.debug({ progress }, "Preview progress");
          },
        });

        log.debug("Starting text-to-3D refine");
        const { refineTaskId } = await startTextTo3DRefine(previewTaskId, {
          enable_pbr: options.enablePBR,
          texture_resolution: options.textureResolution,
        });

        // Poll refine completion
        const result = await pollTaskStatus(refineTaskId, {
          pollIntervalMs: 5000,
          timeoutMs: 300000,
          onProgress: (progress) => {
            log.debug({ progress }, "Refine progress");
          },
        });

        modelUrl = result.modelUrl;
        thumbnailUrl = result.thumbnailUrl;
        meshyTaskId = refineTaskId;
      } else {
        // Image-to-3D
        log.debug("Starting image-to-3D");
        const { taskId } = await startImageTo3D(imageUrl!, {
          enable_pbr: options.enablePBR,
          ai_model: options.aiModel,
          topology: options.topology,
          target_polycount: options.targetPolycount,
          texture_resolution: options.textureResolution,
          should_remesh: options.shouldRemesh,
        });

        const result = await pollTaskStatus(taskId, {
          pollIntervalMs: 5000,
          timeoutMs: 300000,
          onProgress: (progress) => {
            log.debug({ progress }, "Image-to-3D progress");
          },
        });

        modelUrl = result.modelUrl;
        thumbnailUrl = result.thumbnailUrl;
        meshyTaskId = taskId;
      }

      log.info({ modelUrl }, "Regeneration completed");

      // Download and save the model
      const savedFiles = await downloadAndSaveModel(
        finalAssetId,
        modelUrl,
        thumbnailUrl,
        {
          name: variantName,
          type: sourceType,
          category: sourceCategory,
          source: "FORGE",
          sourceAssetId: assetId,
          meshyTaskId,
          prompt: modifiedPrompt,
          variationStrength,
          pipeline: "regenerate",
          status: "completed",
          regeneratedAt: new Date().toISOString(),
        },
      );

      // Update asset with file paths and completed status (if database record exists)
      if (newAsset) {
        try {
          await updateAssetPaths(
            newAsset.id,
            savedFiles.modelPath,
            savedFiles.thumbnailPath,
          );
          await updateAssetStatus(newAsset.id, "completed");
        } catch (dbError) {
          log.warn(
            {
              error:
                dbError instanceof Error ? dbError.message : String(dbError),
            },
            "Failed to update database record",
          );
        }
      }

      return NextResponse.json({
        success: true,
        assetId: finalAssetId,
        name: variantName,
        taskId: meshyTaskId,
        modelUrl: savedFiles.modelUrl,
        thumbnailUrl: savedFiles.thumbnailUrl,
        prompt: modifiedPrompt,
        variationStrength,
        message: "Asset regenerated successfully",
      });
    } catch (generationError) {
      // Update asset status to failed if we have a database record
      if (newAsset) {
        try {
          await updateAssetStatus(newAsset.id, "failed");
        } catch {
          // Ignore db errors during cleanup
        }
      }
      throw generationError;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(
      {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      },
      "Regeneration failed",
    );
    return NextResponse.json(
      {
        error: errorMessage || "Regeneration failed",
      },
      { status: 500 },
    );
  }
}
