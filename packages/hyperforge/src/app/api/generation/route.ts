import { NextRequest, NextResponse } from "next/server";
import {
  generate3DModel,
  generateBatch,
} from "@/lib/generation/generation-service";
import type { GenerationConfig } from "@/components/generation/GenerationFormRouter";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, config, count } = body;

    if (action === "generate") {
      if (!config) {
        return NextResponse.json(
          { error: "Generation config required" },
          { status: 400 },
        );
      }

      // For now, return task ID immediately
      // In production, this would start async generation and return task ID
      const result = await generate3DModel(config as GenerationConfig);
      return NextResponse.json(result);
    }

    if (action === "batch") {
      if (!config || !count) {
        return NextResponse.json(
          { error: "Config and count required for batch generation" },
          { status: 400 },
        );
      }

      const results = await generateBatch(
        config as GenerationConfig,
        count as number,
      );
      return NextResponse.json({ results });
    }

    if (action === "status") {
      // TODO: Implement status polling endpoint
      return NextResponse.json({ status: "not_implemented" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[API] Generation failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Generation failed",
      },
      { status: 500 },
    );
  }
}
