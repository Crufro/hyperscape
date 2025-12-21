import { NextRequest, NextResponse } from "next/server";
import {
  generate3DModel,
  generateBatch,
} from "@/lib/generation/generation-service";
import { generateConceptArt } from "@/lib/ai/concept-art-service";
import type { GenerationConfig } from "@/components/generation/GenerationFormRouter";
import { logger } from "@/lib/utils";
import {
  GenerationRequestSchema,
  validationErrorResponse,
} from "@/lib/api/schemas";

const log = logger.child("API:generation");

// Enable streaming responses
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = GenerationRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(validationErrorResponse(parsed.error), {
        status: 400,
      });
    }

    const { action } = parsed.data;

    // Generate concept art preview (before 3D generation)
    if (action === "generate-concept-art") {
      const { config } = parsed.data;

      const result = await generateConceptArt(config.prompt, {
        style: (config.style as "realistic" | "stylized" | "pixel" | "painterly") || "stylized",
        viewAngle: (config.viewAngle as "side" | "isometric" | "front" | "three-quarter") || "isometric",
        background: "simple",
        assetType: config.assetType || "item",
      });

      if (!result) {
        return NextResponse.json(
          { error: "Concept art generation failed" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        conceptArtUrl: result.imageUrl,
        previewUrl: result.dataUrl,
      });
    }

    if (action === "generate") {
      const { config, stream } = parsed.data;

      // If streaming requested, use SSE
      if (stream) {
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
          async start(controller) {
            try {
              const result = await generate3DModel(
                config as GenerationConfig,
                (progress) => {
                  // Send progress update via SSE
                  const data = JSON.stringify({
                    type: "progress",
                    ...progress,
                  });
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                },
              );

              // Send final result
              const finalData = JSON.stringify({
                type: "complete",
                result,
              });
              controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
              controller.close();
            } catch (error) {
              const errorData = JSON.stringify({
                type: "error",
                error:
                  error instanceof Error ? error.message : "Generation failed",
              });
              controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
              controller.close();
            }
          },
        });

        return new Response(readable, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      // Non-streaming: wait for completion and return result
      const result = await generate3DModel(config as GenerationConfig);
      return NextResponse.json(result);
    }

    if (action === "batch") {
      const { config, count } = parsed.data;

      const results = await generateBatch(
        config as GenerationConfig,
        count,
      );
      return NextResponse.json({ results });
    }

    if (action === "status") {
      const { taskId, taskType } = parsed.data;

      log.debug({ taskId, taskType }, "Checking generation status");

      try {
        // Import the Meshy client for task status
        const { getTaskStatus } = await import("@/lib/meshy/client");
        const task = await getTaskStatus(taskId);

        // Map Meshy task status to a standardized response
        const statusResponse = {
          taskId,
          status: task.status, // "pending" | "in_progress" | "succeeded" | "failed" | "expired"
          progress: task.progress || 0,
          createdAt: task.created_at,
          startedAt: task.started_at,
          finishedAt: task.finished_at,
          // Include result URLs when complete
          ...(task.status === "SUCCEEDED" && {
            result: {
              modelUrl: task.model_urls?.glb || task.model_url,
              thumbnailUrl: task.thumbnail_url,
              textureUrls: task.texture_urls,
            },
          }),
          // Include error info if failed
          ...(task.status === "FAILED" && {
            error: task.task_error?.message || "Generation failed",
          }),
        };

        return NextResponse.json(statusResponse);
      } catch (statusError) {
        log.error({ taskId, error: statusError }, "Failed to get task status");
        return NextResponse.json(
          {
            error: statusError instanceof Error ? statusError.message : "Failed to get task status",
            taskId,
          },
          { status: 500 },
        );
      }
    }

    // This should never be reached due to discriminated union validation
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    log.error({ error }, "Generation failed");
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Generation failed",
      },
      { status: 500 },
    );
  }
}
