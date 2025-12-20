import { NextRequest, NextResponse } from "next/server";
import type { TextureVariant } from "@/components/generation/GenerationFormRouter";
import { createRetextureTask } from "@/lib/meshy/client";
import { pollTaskStatus } from "@/lib/meshy/poll-task";
import { saveAssetFiles, downloadFile } from "@/lib/storage/asset-storage";
import { logger } from "@/lib/utils";

const log = logger.child("API:variants");

// Enable streaming responses
export const dynamic = "force-dynamic";

interface VariantResult {
  id: string;
  variantId?: string;
  name: string;
  baseModelId: string;
  modelUrl: string;
  thumbnailUrl?: string;
  materialPresetId?: string;
  status: "pending" | "processing" | "completed" | "failed";
  error?: string;
}

/**
 * POST /api/variants - Create a texture variant from a base model
 *
 * Uses Meshy retexture API to create new texture variants.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baseModelId, baseModelUrl, variant, action, artStyle } = body;

    if (action === "create") {
      // Validate input
      if (!baseModelId || !baseModelUrl) {
        return NextResponse.json(
          { error: "baseModelId and baseModelUrl are required" },
          { status: 400 },
        );
      }

      if (!variant || !variant.name) {
        return NextResponse.json(
          { error: "variant with name is required" },
          { status: 400 },
        );
      }

      const variantData = variant as TextureVariant;
      // Generate kebab-case variant ID from name
      // Generate snake_case variant ID (matching game conventions)
      const variantBaseName = variantData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      const variantId = `${variantBaseName}_${Date.now().toString(36).slice(-4)}`;

      log.info(
        { variantName: variantData.name, baseModelId },
        "Creating variant with Meshy retexture",
      );

      try {
        // Create retexture task with Meshy API
        const taskId = await createRetextureTask({
          model_url: baseModelUrl,
          text_style_prompt: variantData.prompt || variantData.name,
          art_style: artStyle || "realistic",
          ai_model: "meshy-5",
          enable_original_uv: true,
        });

        log.info({ taskId }, "Retexture task started");

        // Poll for completion (timeout 10 minutes for retexturing)
        const meshyResult = await pollTaskStatus(taskId, {
          pollIntervalMs: 5000,
          timeoutMs: 600000,
          onProgress: (progress) => {
            log.debug({ progress }, "Retexture progress");
          },
        });

        log.info({ modelUrl: meshyResult.modelUrl }, "Retexture completed");

        // Download and save the variant model
        const modelBuffer = await downloadFile(meshyResult.modelUrl);
        let thumbnailBuffer: Buffer | undefined;
        if (meshyResult.thumbnailUrl) {
          try {
            thumbnailBuffer = await downloadFile(meshyResult.thumbnailUrl);
          } catch {
            log.warn("Failed to download variant thumbnail");
          }
        }

        // Save files
        const savedFiles = await saveAssetFiles({
          assetId: variantId,
          modelBuffer,
          modelFormat: "glb",
          thumbnailBuffer,
          metadata: {
            name: variantData.name,
            type: "variant",
            source: "FORGE",
            baseModelId,
            meshyTaskId: taskId,
            materialPresetId: variantData.materialPresetId,
            prompt: variantData.prompt,
            artStyle: artStyle || "realistic",
            status: "completed",
            createdAt: new Date().toISOString(),
          },
        });

        const result: VariantResult = {
          id: variantId,
          variantId: variantData.id,
          name: variantData.name,
          baseModelId,
          modelUrl: savedFiles.modelUrl,
          thumbnailUrl: savedFiles.thumbnailUrl,
          materialPresetId: variantData.materialPresetId,
          status: "completed",
        };

        return NextResponse.json({
          success: true,
          variant: result,
        });
      } catch (retextureError) {
        log.error({ error: retextureError }, "Retexture failed");

        const result: VariantResult = {
          id: variantId,
          variantId: variantData.id,
          name: variantData.name,
          baseModelId,
          modelUrl: baseModelUrl,
          materialPresetId: variantData.materialPresetId,
          status: "failed",
          error:
            retextureError instanceof Error
              ? retextureError.message
              : "Retexture failed",
        };

        return NextResponse.json({
          success: false,
          variant: result,
          error: result.error,
        });
      }
    }

    if (action === "batch") {
      // Batch create multiple variants
      const variants = body.variants as TextureVariant[];

      if (!baseModelId || !baseModelUrl) {
        return NextResponse.json(
          { error: "baseModelId and baseModelUrl are required" },
          { status: 400 },
        );
      }

      if (!variants || variants.length === 0) {
        return NextResponse.json(
          { error: "variants array is required and must not be empty" },
          { status: 400 },
        );
      }

      log.info(
        { count: variants.length, baseModelId },
        "Batch creating variants",
      );

      // Process variants sequentially (Meshy rate limits)
      const results: VariantResult[] = [];

      for (const v of variants) {
        // Generate kebab-case variant ID from name
        // Generate snake_case variant ID (matching game conventions)
        const variantBaseName = v.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
        const variantId = `${variantBaseName}_${Date.now().toString(36).slice(-4)}`;

        try {
          const taskId = await createRetextureTask({
            model_url: baseModelUrl,
            text_style_prompt: v.prompt || v.name,
            art_style: artStyle || "realistic",
            ai_model: "meshy-5",
            enable_original_uv: true,
          });

          const meshyResult = await pollTaskStatus(taskId, {
            pollIntervalMs: 5000,
            timeoutMs: 600000,
          });

          const modelBuffer = await downloadFile(meshyResult.modelUrl);
          const savedFiles = await saveAssetFiles({
            assetId: variantId,
            modelBuffer,
            modelFormat: "glb",
            metadata: {
              name: v.name,
              type: "variant",
              source: "FORGE",
              baseModelId,
              materialPresetId: v.materialPresetId,
              status: "completed",
            },
          });

          results.push({
            id: variantId,
            variantId: v.id,
            name: v.name,
            baseModelId,
            modelUrl: savedFiles.modelUrl,
            thumbnailUrl: savedFiles.thumbnailUrl,
            materialPresetId: v.materialPresetId,
            status: "completed",
          });
        } catch (error) {
          log.error({ error, variantName: v.name }, "Batch variant failed");
          results.push({
            id: variantId,
            variantId: v.id,
            name: v.name,
            baseModelId,
            modelUrl: baseModelUrl,
            materialPresetId: v.materialPresetId,
            status: "failed",
            error: error instanceof Error ? error.message : "Failed",
          });
        }
      }

      const successCount = results.filter(
        (r) => r.status === "completed",
      ).length;

      return NextResponse.json({
        success: successCount > 0,
        variants: results,
        message: `${successCount}/${variants.length} variants created successfully.`,
      });
    }

    if (action === "list") {
      // List variants for a base model
      if (!baseModelId) {
        return NextResponse.json(
          { error: "baseModelId is required" },
          { status: 400 },
        );
      }

      // Note: For full database integration, query variants table here
      // For now, return empty array as variants are stored as separate assets
      return NextResponse.json({
        success: true,
        baseModelId,
        variants: [],
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    log.error({ error }, "Variant creation failed");
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Variant creation failed",
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/variants - List variants for a base model
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const baseModelId = searchParams.get("baseModelId");

    if (!baseModelId) {
      return NextResponse.json(
        { error: "baseModelId query parameter is required" },
        { status: 400 },
      );
    }

    // TODO: Query database for variants
    // For now, return empty array
    return NextResponse.json({
      success: true,
      baseModelId,
      variants: [],
    });
  } catch (error) {
    log.error({ error }, "Failed to list variants");
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list variants",
      },
      { status: 500 },
    );
  }
}
