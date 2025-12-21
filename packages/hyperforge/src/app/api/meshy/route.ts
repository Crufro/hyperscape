import { NextRequest, NextResponse } from "next/server";
import {
  createImageTo3DTask,
  createTextTo3DPreviewTask,
  createTextTo3DRefineTask,
  getTaskStatus,
} from "@/lib/meshy/client";
import { logger } from "@/lib/utils";
import { MeshyRequestSchema, validationErrorResponse } from "@/lib/api/schemas";
import type { MeshyAIModel, MeshyArtStyle, MeshyPoseMode } from "@/lib/meshy/types";

const log = logger.child("API:meshy");

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = MeshyRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(validationErrorResponse(parsed.error), {
        status: 400,
      });
    }

    const data = parsed.data;

    if (data.action === "image-to-3d") {
      const task = await createImageTo3DTask({
        image_url: data.imageUrl,
        enable_pbr: data.enablePBR,
        ai_model: data.aiModel as MeshyAIModel | undefined,
        topology: data.topology,
        target_polycount: data.targetPolycount,
        texture_resolution: data.textureResolution,
      });

      return NextResponse.json(task);
    }

    if (data.action === "text-to-3d-preview") {
      // Stage 1: Create preview task (generates mesh without texture)
      const taskId = await createTextTo3DPreviewTask({
        prompt: data.prompt,
        ai_model: (data.aiModel ?? "latest") as MeshyAIModel,
        topology: data.topology ?? "triangle",
        target_polycount: data.targetPolycount ?? 2000, // Game-optimized default
        art_style: (data.artStyle ?? "realistic") as MeshyArtStyle,
        symmetry_mode: data.symmetryMode ?? "auto",
        pose_mode: (data.poseMode ?? "") as MeshyPoseMode,
        seed: data.seed,
      });

      return NextResponse.json({ taskId, stage: "preview" });
    }

    if (data.action === "text-to-3d-refine") {
      // Stage 2: Create refine task (adds texture to preview mesh)
      const taskId = await createTextTo3DRefineTask(data.previewTaskId, {
        prompt: "", // Not used in refine stage
        enable_pbr: data.enablePBR ?? true,
        texture_resolution: data.textureResolution ?? 2048,
        texture_prompt: data.texturePrompt,
        texture_image_url: data.textureImageUrl,
      });

      return NextResponse.json({ taskId, stage: "refine" });
    }

    if (data.action === "status") {
      const task = await getTaskStatus(data.taskId);
      return NextResponse.json(task);
    }

    // This should never be reached due to discriminated union validation
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    log.error({ error }, "Meshy request failed");
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Meshy request failed",
      },
      { status: 500 },
    );
  }
}
