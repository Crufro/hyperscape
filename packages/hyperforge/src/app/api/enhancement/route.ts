import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils";
import { getAssetById, updateAsset } from "@/lib/db/asset-queries";
import { createRetextureTask } from "@/lib/meshy/client";
import { pollTaskStatus } from "@/lib/meshy/poll-task";
import { saveAssetFiles, downloadFile } from "@/lib/storage/asset-storage";
import type { MeshyArtStyle } from "@/lib/meshy/types";

const log = logger.child("API:enhancement");

interface EnhancementRequest {
  action: "retexture" | "regenerate" | "modify_metadata";
  assetId: string;
  // Retexture params
  styleType?: "text" | "image";
  textPrompt?: string;
  imageUrl?: string;
  artStyle?: MeshyArtStyle;
  // Regenerate params
  variationStrength?: number;
  prompt?: string;
  // Metadata params
  metadata?: Record<string, unknown>;
  name?: string;
  description?: string;
  tags?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EnhancementRequest;
    const { action, assetId, ...params } = body;

    // Validate required fields
    if (!action || !assetId) {
      return NextResponse.json(
        { error: "Missing required fields: action and assetId" },
        { status: 400 },
      );
    }

    log.info({ action, assetId, params }, "Enhancement request received");

    switch (action) {
      case "retexture": {
        // Validate retexture params
        const { styleType, textPrompt, imageUrl, artStyle } = params;
        
        if (!styleType || (styleType === "text" && !textPrompt) || (styleType === "image" && !imageUrl)) {
          return NextResponse.json(
            { error: "Retexture requires styleType and either textPrompt or imageUrl" },
            { status: 400 },
          );
        }

        // Get the source asset
        const sourceAsset = await getAssetById(assetId);
        if (!sourceAsset) {
          return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        const generationParams = sourceAsset.generationParams as Record<string, unknown> | null;
        const modelUrl = sourceAsset.cdnUrl || (generationParams?.modelUrl as string | undefined);
        const meshyTaskId = generationParams?.meshyTaskId as string | undefined;

        if (!modelUrl && !meshyTaskId) {
          return NextResponse.json(
            { error: "Asset does not have a model URL or Meshy task ID for retexturing" },
            { status: 400 },
          );
        }

        log.info({ assetId, styleType }, "Starting retexture enhancement");

        // Create retexture task
        const resolvedArtStyle: MeshyArtStyle = artStyle || "realistic";
        const taskId = await createRetextureTask({
          input_task_id: meshyTaskId,
          model_url: meshyTaskId ? undefined : modelUrl,
          text_style_prompt: styleType === "text" ? textPrompt : undefined,
          image_style_url: styleType === "image" ? imageUrl : undefined,
          art_style: resolvedArtStyle,
          ai_model: "meshy-5",
          enable_original_uv: true,
        });

        // Poll for completion
        const result = await pollTaskStatus(taskId, {
          pollIntervalMs: 5000,
          timeoutMs: 600000,
        });

        // Download and save the retextured model
        const modelBuffer = await downloadFile(result.modelUrl);
        const variantId = `${assetId}_retextured_${Date.now().toString(36).slice(-4)}`;
        
        const savedFiles = await saveAssetFiles({
          assetId: variantId,
          modelBuffer,
          modelFormat: "glb",
          metadata: {
            name: `${sourceAsset.name} (Retextured)`,
            type: sourceAsset.type,
            source: "FORGE",
            sourceAssetId: assetId,
            meshyTaskId: taskId,
            prompt: textPrompt,
            artStyle: artStyle || "realistic",
            pipeline: "retexture",
            status: "completed",
          },
        });

        return NextResponse.json({
          success: true,
          action: "retexture",
          assetId: variantId,
          taskId,
          modelUrl: savedFiles.modelUrl,
          thumbnailUrl: savedFiles.thumbnailUrl,
          message: "Asset retextured successfully",
        });
      }

      case "regenerate": {
        // Redirect to regenerate endpoint for full regeneration logic
        const regenerateUrl = new URL("/api/enhancement/regenerate", request.url);
        const regenerateResponse = await fetch(regenerateUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetId,
            prompt: params.prompt,
            variationStrength: params.variationStrength || 50,
          }),
        });

        const regenerateResult = await regenerateResponse.json();
        
        if (!regenerateResponse.ok) {
          return NextResponse.json(regenerateResult, { status: regenerateResponse.status });
        }

        return NextResponse.json({
          success: true,
          action: "regenerate",
          ...regenerateResult,
        });
      }

      case "modify_metadata": {
        // Update asset metadata in database
        const { metadata, name, description, tags } = params;

        const updateData: Record<string, unknown> = {};
        if (name) updateData.name = name;
        if (description) updateData.description = description;
        if (tags) updateData.tags = tags;
        if (metadata) updateData.generationParams = metadata;

        if (Object.keys(updateData).length === 0) {
          return NextResponse.json(
            { error: "No metadata fields provided to update" },
            { status: 400 },
          );
        }

        const updatedAsset = await updateAsset(assetId, updateData);
        
        if (!updatedAsset) {
          return NextResponse.json({ error: "Asset not found" }, { status: 404 });
        }

        log.info({ assetId, updates: Object.keys(updateData) }, "Asset metadata updated");

        return NextResponse.json({
          success: true,
          action: "modify_metadata",
          assetId,
          updatedFields: Object.keys(updateData),
          message: "Asset metadata updated successfully",
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    log.error({ error }, "Enhancement failed");
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Enhancement failed",
      },
      { status: 500 },
    );
  }
}
