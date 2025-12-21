/**
 * API Route: Generate Sound Effects
 * Text-to-SFX using ElevenLabs
 *
 * Storage order: Supabase audio-generations bucket (primary), local fallback
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  generateSoundEffect,
  SFX_PROMPTS,
} from "@/lib/audio/elevenlabs-service";
import {
  uploadSFXAudio,
  isSupabaseConfigured,
} from "@/lib/storage/supabase-storage";
import { invalidateRegistryCache } from "@/lib/assets/registry";
import { logger } from "@/lib/utils";
import type { SoundEffectAsset, SoundEffectCategory } from "@/types/audio";
import { SFXGenerationSchema, validationErrorResponse } from "@/lib/api/schemas";

const log = logger.child("API:audio/sfx/generate");

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = SFXGenerationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(validationErrorResponse(parsed.error), {
        status: 400,
      });
    }

    const {
      prompt,
      presetId,
      category = "custom",
      name,
      durationSeconds,
      promptInfluence = 0.7,
      tags = [],
      saveToAsset = true,
    } = parsed.data;

    // Use preset prompt if provided
    let effectivePrompt = prompt;
    let effectiveName = name;
    if (presetId && SFX_PROMPTS[presetId]) {
      effectivePrompt = SFX_PROMPTS[presetId];
      effectiveName = effectiveName || presetId;
    }

    // effectivePrompt is guaranteed by schema refinement
    if (!effectivePrompt || typeof effectivePrompt !== "string") {
      return NextResponse.json(
        { error: "Prompt or presetId is required" },
        { status: 400 },
      );
    }

    log.info("Generating SFX", {
      prompt: effectivePrompt.substring(0, 50) + "...",
      category,
      durationSeconds,
    });

    // Generate sound effect
    const result = await generateSoundEffect({
      text: effectivePrompt,
      durationSeconds,
      promptInfluence,
    });

    // Calculate duration from buffer size
    const duration = result.audio.length / 16000;

    // Build asset metadata
    const assetId = generateSFXId(effectiveName, category);
    const asset: SoundEffectAsset = {
      id: assetId,
      name: effectiveName || assetId,
      category,
      prompt: effectivePrompt,
      url: "", // Will be set after saving
      duration,
      format: "mp3",
      tags: [...tags, category],
      generatedAt: new Date().toISOString(),
    };

    // Save audio file with proper organization
    if (saveToAsset) {
      // Try Supabase first (primary storage) with structured upload
      if (isSupabaseConfigured()) {
        try {
          const uploadResult = await uploadSFXAudio(result.audio, {
            name: effectiveName || assetId,
            category,
            prompt: effectivePrompt,
            duration,
            tags: [...tags, category],
          });
          if (uploadResult.success) {
            asset.url = uploadResult.url;
            // Invalidate registry cache so new SFX appears in queries
            invalidateRegistryCache();
            log.info("SFX saved to Supabase", {
              url: uploadResult.url,
              category,
              name: effectiveName,
            });
          } else {
            throw new Error(uploadResult.error || "Upload failed");
          }
        } catch (error) {
          log.warn("Supabase upload failed, falling back to local", { error });
          // Fall through to local storage
        }
      }

      // Local fallback if Supabase not configured or failed
      if (!asset.url) {
        const assetsDir =
          process.env.HYPERFORGE_ASSETS_DIR ||
          path.join(process.cwd(), "assets");
        // Organize by category: audio/sfx/{category}/
        const audioDir = path.join(assetsDir, "audio", "sfx", category);

        // Create directory if needed
        await fs.mkdir(audioDir, { recursive: true });

        // Save audio file with proper naming
        const filename = `${assetId}.mp3`;
        const filepath = path.join(audioDir, filename);
        await fs.writeFile(filepath, result.audio);

        asset.url = `/api/audio/file/sfx/${category}/${filename}`;

        log.info("SFX saved locally", { filepath, category });
      }
    }

    // Return audio as base64 for immediate playback
    const audioBase64 = result.audio.toString("base64");

    return NextResponse.json({
      success: true,
      asset,
      audio: `data:audio/mp3;base64,${audioBase64}`,
    });
  } catch (error) {
    log.error("SFX generation error", { error });

    if (
      error instanceof Error &&
      error.message.includes("ELEVENLABS_API_KEY")
    ) {
      return NextResponse.json(
        {
          error: "ElevenLabs API key not configured",
          message: error.message,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Failed to generate sound effect" },
      { status: 500 },
    );
  }
}

// GET endpoint to list available SFX presets
export async function GET() {
  const presets = Object.entries(SFX_PROMPTS).map(([id, prompt]) => ({
    id,
    name: id
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    prompt,
    category: categorizePreset(id),
  }));

  return NextResponse.json({ presets });
}

/**
 * Generate kebab-case ID for SFX following game asset conventions
 * Pattern: {description}-{variant} (e.g., sword-clash-001)
 */
function generateSFXId(name?: string, _category?: string): string {
  const timestamp = Date.now().toString(36).slice(-4);
  const safeName = name
    ? name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
    : "sfx";
  return `${safeName}-${timestamp}`;
}

function categorizePreset(id: string): SoundEffectCategory {
  if (
    id.includes("sword") ||
    id.includes("bow") ||
    id.includes("arrow") ||
    id.includes("magic") ||
    id.includes("fire") ||
    id.includes("heal")
  ) {
    return "combat";
  }
  if (
    id.includes("coin") ||
    id.includes("item") ||
    id.includes("inventory") ||
    id.includes("potion") ||
    id.includes("chest")
  ) {
    return "item";
  }
  if (
    id.includes("door") ||
    id.includes("footstep") ||
    id.includes("water") ||
    id.includes("campfire") ||
    id.includes("wind") ||
    id.includes("rain")
  ) {
    return "environment";
  }
  if (
    id.includes("ui") ||
    id.includes("level") ||
    id.includes("quest") ||
    id.includes("achievement")
  ) {
    return "ui";
  }
  return "custom";
}
