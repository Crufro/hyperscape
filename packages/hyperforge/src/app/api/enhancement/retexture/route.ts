/**
 * Retexture API Route
 * Creates new texture variants of existing 3D models using Meshy API
 * Supports both local database assets AND CDN assets
 */

import { NextRequest, NextResponse } from "next/server";
import { createRetextureTask } from "@/lib/meshy/client";
import { pollTaskStatus } from "@/lib/meshy/poll-task";
import {
  getAssetById,
  createAsset,
  updateAssetPaths,
  updateAssetStatus,
} from "@/lib/db/asset-queries";
import { saveAssetFiles, downloadFile } from "@/lib/storage/asset-storage";
import {
  isSupabaseConfigured,
  BUCKET_NAMES,
  getSupabasePublicUrl,
} from "@/lib/storage/supabase-storage";
import { createClient } from "@supabase/supabase-js";
import { logger } from "@/lib/utils";

const log = logger.child("API:retexture");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      assetId,
      styleType,
      textPrompt,
      imageUrl,
      artStyle,
      outputName,
      // CDN asset fields - passed directly when asset is not in database
      modelUrl: directModelUrl,
      assetName: directAssetName,
      assetType: directAssetType,
      assetCategory: directAssetCategory,
    } = body;

    if (!assetId) {
      return NextResponse.json({ error: "Asset ID required" }, { status: 400 });
    }

    if (styleType === "text" && !textPrompt) {
      return NextResponse.json(
        { error: "Text prompt required for text style type" },
        { status: 400 },
      );
    }

    if (styleType === "image" && !imageUrl) {
      return NextResponse.json(
        { error: "Image URL required for image style type" },
        { status: 400 },
      );
    }

    // Try to get asset from database first (local/forge assets)
    const sourceAsset = await getAssetById(assetId);

    // Determine source info - either from database or from request (for CDN assets)
    let meshyTaskId: string | undefined;
    let modelUrl: string | undefined;
    let sourceName: string;
    let sourceType: string;
    let sourceCategory: string | undefined;

    if (sourceAsset) {
      // Asset found in database (local/forge asset)
      const generationParams = sourceAsset.generationParams as Record<
        string,
        unknown
      > | null;
      meshyTaskId = generationParams?.meshyTaskId as string | undefined;
      modelUrl =
        sourceAsset.cdnUrl ||
        (generationParams?.modelUrl as string | undefined);
      sourceName = sourceAsset.name;
      sourceType = sourceAsset.type;
      sourceCategory = sourceAsset.category || undefined;
    } else if (directModelUrl) {
      // CDN asset - model URL passed directly
      modelUrl = directModelUrl;
      sourceName = directAssetName || assetId;
      sourceType = directAssetType || "object";
      sourceCategory = directAssetCategory;
      log.info({ assetId, modelUrl }, "Using CDN asset for retexture");
    } else {
      return NextResponse.json(
        {
          error:
            "Asset not found in database and no model URL provided. For CDN assets, include modelUrl in request.",
        },
        { status: 404 },
      );
    }

    if (!meshyTaskId && !modelUrl) {
      return NextResponse.json(
        {
          error:
            "Asset does not have a Meshy task ID or model URL for retexturing",
        },
        { status: 400 },
      );
    }

    // Check if model URL is localhost - Meshy cannot access local URLs
    // Upload to Supabase first if available
    if (
      modelUrl &&
      (modelUrl.includes("localhost") || modelUrl.includes("127.0.0.1"))
    ) {
      log.warn(
        { modelUrl },
        "Model URL is localhost - uploading to Supabase for Meshy access",
      );

      if (!isSupabaseConfigured()) {
        return NextResponse.json(
          {
            error:
              "Cannot retexture local CDN assets in development without Supabase. Configure Supabase or deploy to production.",
          },
          { status: 400 },
        );
      }

      try {
        // Download model from localhost
        const modelResponse = await fetch(modelUrl);
        if (!modelResponse.ok) {
          throw new Error(`Failed to download model: ${modelResponse.status}`);
        }
        const modelBuffer = Buffer.from(await modelResponse.arrayBuffer());

        // Upload to Supabase
        const supabaseUrl =
          process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey =
          process.env.SUPABASE_SECRET_KEY ||
          process.env.SUPABASE_SERVICE_KEY ||
          process.env.SUPABASE_PUBLISHABLE_KEY ||
          process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
          throw new Error("Supabase credentials not configured");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const tempPath = `temp-retexture/${assetId}-${Date.now().toString(36).slice(-6)}.glb`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAMES.MESHY_MODELS)
          .upload(tempPath, modelBuffer, {
            contentType: "application/octet-stream",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Failed to upload model: ${uploadError.message}`);
        }

        // Get public URL for Meshy
        modelUrl = getSupabasePublicUrl(BUCKET_NAMES.MESHY_MODELS, tempPath);
        log.info(
          { newModelUrl: modelUrl },
          "Uploaded model to Supabase for Meshy access",
        );
      } catch (uploadError) {
        const msg =
          uploadError instanceof Error
            ? uploadError.message
            : String(uploadError);
        log.error({ error: msg }, "Failed to upload local model to Supabase");
        return NextResponse.json(
          {
            error: `Failed to prepare local model for retexturing: ${msg}`,
          },
          { status: 500 },
        );
      }
    }

    log.info({ assetId, modelUrl, sourceName }, "Starting retexture");

    // Generate variant name - use cleaner suffix
    const styleSuffix =
      styleType === "text"
        ? textPrompt
            .slice(0, 15)
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .replace(/\s+/g, "-")
            .toLowerCase()
        : "retextured";
    const variantName = outputName || `${sourceName}-${styleSuffix}`;
    // Generate snake_case asset ID from variant name (matching game conventions)
    const newAssetId = variantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    // Check if database is available
    const hasDatabaseUrl = !!process.env.DATABASE_URL;

    // Create asset record if database is available
    let newAsset: { id: string } | null = null;
    if (hasDatabaseUrl) {
      try {
        newAsset = await createAsset({
          name: variantName,
          description: `Retextured variant of ${sourceName}`,
          type: sourceType,
          category: sourceCategory,
          tags: [...(sourceAsset?.tags || []), "variant", "retextured"],
          prompt: styleType === "text" ? textPrompt : undefined,
          generationParams: {
            pipeline: "retexture",
            sourceAssetId: assetId,
            sourceModelUrl: modelUrl,
            styleType,
            textPrompt: styleType === "text" ? textPrompt : undefined,
            imageStyleUrl: styleType === "image" ? imageUrl : undefined,
            artStyle: artStyle || "realistic",
          },
          aiModel: "meshy-5",
          status: "processing",
          parentAssetId: sourceAsset ? assetId : undefined,
        });
        log.info(
          { newAssetId: newAsset.id },
          "Created asset record for retexture",
        );
      } catch (dbError) {
        log.warn(
          {
            error: dbError instanceof Error ? dbError.message : String(dbError),
          },
          "Database unavailable, proceeding without asset record",
        );
        // Continue without database record
      }
    }

    const finalAssetId = newAsset?.id || newAssetId;

    try {
      // Create retexture task
      const taskId = await createRetextureTask({
        input_task_id: meshyTaskId,
        model_url: meshyTaskId ? undefined : modelUrl,
        text_style_prompt: styleType === "text" ? textPrompt : undefined,
        image_style_url: styleType === "image" ? imageUrl : undefined,
        art_style: artStyle || "realistic",
        ai_model: "meshy-5",
        enable_original_uv: true,
      });

      log.debug({ taskId }, "Retexture task started");

      // Poll for completion
      const result = await pollTaskStatus(taskId, {
        pollIntervalMs: 5000,
        timeoutMs: 600000, // 10 minutes for retexture
        onProgress: (progress, precedingTasks) => {
          log.debug({ progress, precedingTasks }, "Retexture progress");
        },
      });

      log.info({ resultModelUrl: result.modelUrl }, "Retexture completed");

      // Download the model and thumbnail
      const modelBuffer = await downloadFile(result.modelUrl);
      let thumbnailBuffer: Buffer | undefined;
      if (result.thumbnailUrl) {
        try {
          thumbnailBuffer = await downloadFile(result.thumbnailUrl);
        } catch {
          log.warn("Failed to download thumbnail");
        }
      }

      // Save files (uses Supabase if configured, otherwise local)
      const savedFiles = await saveAssetFiles({
        assetId: finalAssetId,
        modelBuffer,
        modelFormat: "glb",
        thumbnailBuffer,
        metadata: {
          name: variantName,
          type: sourceType,
          category: sourceCategory,
          source: "FORGE",
          sourceAssetId: assetId,
          meshyTaskId: taskId,
          meshyModelUrl: result.modelUrl,
          prompt: styleType === "text" ? textPrompt : undefined,
          artStyle: artStyle || "realistic",
          pipeline: "retexture",
          status: "completed",
          createdAt: new Date().toISOString(),
          retexturedAt: new Date().toISOString(),
        },
      });

      log.info({ modelUrl: savedFiles.modelUrl }, "Model saved to storage");

      // Update database record if it was created
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
        taskId,
        modelUrl: savedFiles.modelUrl,
        thumbnailUrl: savedFiles.thumbnailUrl,
        message: "Asset retextured successfully",
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
      "Retexture failed",
    );
    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
