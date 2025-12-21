/**
 * API Route: Generate Music
 * Text-to-Music using ElevenLabs
 *
 * Storage order: Supabase audio-generations bucket (primary), local fallback
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { generateMusic, MUSIC_PROMPTS } from "@/lib/audio/elevenlabs-service";
import {
  uploadMusicAudio,
  isSupabaseConfigured,
} from "@/lib/storage/supabase-storage";
import { invalidateRegistryCache } from "@/lib/assets/registry";
import { logger } from "@/lib/utils";
import type { MusicAsset, MusicCategory } from "@/types/audio";
import { MusicGenerationSchema, validationErrorResponse } from "@/lib/api/schemas";

const log = logger.child("API:audio/music/generate");

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = MusicGenerationSchema.safeParse(body);

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
      durationMs = 30000,
      forceInstrumental = true,
      loopable = true,
      zones = [],
      saveToAsset = true,
    } = parsed.data;

    // Use preset prompt if provided
    let effectivePrompt = prompt;
    let effectiveName = name;
    if (presetId && MUSIC_PROMPTS[presetId]) {
      effectivePrompt = MUSIC_PROMPTS[presetId];
      effectiveName = effectiveName || presetId;
    }

    // effectivePrompt is guaranteed by schema refinement
    if (!effectivePrompt || typeof effectivePrompt !== "string") {
      return NextResponse.json(
        { error: "Prompt or presetId is required" },
        { status: 400 },
      );
    }

    log.info("Generating music", {
      prompt: effectivePrompt.substring(0, 50) + "...",
      category,
      durationMs,
      forceInstrumental,
    });

    // Append instrumental instruction if needed
    const finalPrompt = forceInstrumental
      ? `${effectivePrompt}. Instrumental only, no vocals.`
      : effectivePrompt;

    // Generate music
    const result = await generateMusic({
      prompt: finalPrompt,
      durationMs,
      forceInstrumental,
    });

    // Calculate duration in seconds
    const duration = durationMs / 1000;

    // Build asset metadata
    const assetId = generateMusicId(effectiveName, category);
    const asset: MusicAsset = {
      id: assetId,
      name: effectiveName || assetId,
      category,
      prompt: effectivePrompt,
      url: "", // Will be set after saving
      duration,
      format: "mp3",
      loopable,
      genre: extractGenre(effectivePrompt),
      mood: extractMood(effectivePrompt),
      zones,
      generatedAt: new Date().toISOString(),
    };

    // Save audio file with proper organization
    if (saveToAsset) {
      // Try Supabase first (primary storage) with structured upload
      if (isSupabaseConfigured()) {
        try {
          const uploadResult = await uploadMusicAudio(result.audio, {
            name: effectiveName || assetId,
            category,
            prompt: effectivePrompt,
            duration,
            loopable,
            zones,
            mood: extractMood(effectivePrompt),
            genre: extractGenre(effectivePrompt),
          });
          if (uploadResult.success) {
            asset.url = uploadResult.url;
            // Invalidate registry cache so new music appears in queries
            invalidateRegistryCache();
            log.info("Music saved to Supabase", {
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
        // Organize by category: audio/music/{category}/
        const audioDir = path.join(assetsDir, "audio", "music", category);

        // Create directory if needed
        await fs.mkdir(audioDir, { recursive: true });

        // Save audio file with proper naming
        const filename = `${assetId}.mp3`;
        const filepath = path.join(audioDir, filename);
        await fs.writeFile(filepath, result.audio);

        asset.url = `/api/audio/file/music/${category}/${filename}`;

        log.info("Music saved locally", { filepath, category });
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
    log.error("Music generation error", { error });

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
      { error: "Failed to generate music" },
      { status: 500 },
    );
  }
}

// GET endpoint to list available music presets
export async function GET() {
  const presets = Object.entries(MUSIC_PROMPTS).map(([id, prompt]) => ({
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
 * Generate kebab-case ID for music following game asset conventions
 * Pattern: {name}-{timestamp} (e.g., battle-cry-abc1)
 */
function generateMusicId(name?: string, _category?: string): string {
  const timestamp = Date.now().toString(36).slice(-4);
  const safeName = name
    ? name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
    : "music";
  return `${safeName}-${timestamp}`;
}

function categorizePreset(id: string): MusicCategory {
  if (id.includes("combat") || id.includes("boss")) {
    return "combat";
  }
  if (id.includes("town") || id.includes("tavern")) {
    return "town";
  }
  if (id.includes("dungeon") || id.includes("cave")) {
    return "dungeon";
  }
  if (id.includes("menu")) {
    return "menu";
  }
  if (id.includes("victory") || id.includes("defeat")) {
    return "victory";
  }
  if (id.includes("emotional") || id.includes("cutscene")) {
    return "cutscene";
  }
  return "ambient";
}

function extractGenre(prompt: string): string | undefined {
  const genres = [
    "orchestral",
    "electronic",
    "folk",
    "ambient",
    "epic",
    "jazz",
    "medieval",
    "fantasy",
    "cinematic",
  ];
  const lower = prompt.toLowerCase();
  return genres.find((g) => lower.includes(g));
}

function extractMood(prompt: string): string | undefined {
  const moods = [
    "peaceful",
    "tense",
    "heroic",
    "mysterious",
    "sad",
    "triumphant",
    "dark",
    "warm",
    "epic",
    "calm",
  ];
  const lower = prompt.toLowerCase();
  return moods.find((m) => lower.includes(m));
}
