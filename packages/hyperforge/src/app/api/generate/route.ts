import { NextRequest, NextResponse } from "next/server";
import {
  generateTextWithProvider,
  generateImageWithProvider,
} from "@/lib-core/ai/gateway";
import type { GenerationPipeline } from "@/types/generation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, prompt, provider, options } = body;

    if (type === "text") {
      const text = await generateTextWithProvider(prompt, {
        model: provider, // Provider is used as model identifier (e.g., "anthropic/claude-sonnet-4")
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
        systemPrompt: options?.systemPrompt,
      });

      return NextResponse.json({ text });
    }

    if (type === "image") {
      const imageUrl = await generateImageWithProvider(prompt, {
        provider,
        size: options?.size,
        quality: options?.quality,
        style: options?.style,
      });

      return NextResponse.json({ imageUrl });
    }

    return NextResponse.json(
      { error: "Invalid generation type" },
      { status: 400 },
    );
  } catch (error) {
    console.error("[API] Generation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 },
    );
  }
}
