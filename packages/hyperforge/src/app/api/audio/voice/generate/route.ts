/**
 * API Route: Generate Voice Audio
 * Text-to-Speech using ElevenLabs
 *
 * Storage order: Supabase audio-generations bucket (primary), local fallback
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  generateSpeech,
  generateSpeechWithTimestamps,
  GAME_VOICE_PRESETS,
  getPresetVoiceSettings,
} from "@/lib/audio/elevenlabs-service";
import {
  uploadVoiceAudio,
  isSupabaseConfigured,
} from "@/lib/storage/supabase-storage";
import { invalidateRegistryCache } from "@/lib/assets/registry";
import { logger } from "@/lib/utils";
import type { VoiceAsset } from "@/types/audio";
import { VoiceGenerationSchema, validationErrorResponse } from "@/lib/api/schemas";

const log = logger.child("API:audio/voice/generate");

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = VoiceGenerationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(validationErrorResponse(parsed.error), {
        status: 400,
      });
    }

    const {
      text,
      voiceId,
      voicePreset,
      npcId,
      dialogueNodeId,
      withTimestamps = false,
      saveToAsset = true,
    } = parsed.data;

    // Determine voice ID and settings from preset or direct ID
    let effectiveVoiceId = voiceId;
    let voiceSettings: {
      stability: number;
      similarityBoost: number;
      style: number;
    } | null = null;

    if (!effectiveVoiceId && voicePreset) {
      const preset = GAME_VOICE_PRESETS[voicePreset];
      if (preset) {
        effectiveVoiceId = preset.voiceId;
        // Get preset-specific voice settings for character expression
        voiceSettings = getPresetVoiceSettings(voicePreset);
      }
    }

    // effectiveVoiceId is guaranteed by schema refinement
    if (!effectiveVoiceId) {
      return NextResponse.json(
        { error: "Either voiceId or voicePreset is required" },
        { status: 400 },
      );
    }

    log.info("Generating voice", {
      text: text.substring(0, 50) + "...",
      voiceId: effectiveVoiceId,
      voicePreset,
      withTimestamps,
      voiceSettings,
    });

    // Generate speech with preset voice settings
    const speechOptions = {
      voiceId: effectiveVoiceId,
      text,
      ...(voiceSettings && {
        stability: voiceSettings.stability,
        similarityBoost: voiceSettings.similarityBoost,
        style: voiceSettings.style,
      }),
    };

    let result;
    if (withTimestamps) {
      result = await generateSpeechWithTimestamps(speechOptions);
    } else {
      result = await generateSpeech(speechOptions);
    }

    // Calculate duration from buffer size (rough estimate)
    // MP3 at 128kbps: bytes / (128 * 1000 / 8) = seconds
    const durationSeconds = result.audio.length / 16000;

    // Build asset metadata
    const assetId = generateAudioId(npcId, dialogueNodeId);
    const asset: VoiceAsset = {
      id: assetId,
      name: dialogueNodeId || assetId,
      npcId,
      dialogueNodeId,
      text,
      voiceId: effectiveVoiceId,
      voicePreset,
      url: "", // Will be set after saving
      duration: durationSeconds,
      format: "mp3",
      timestamps:
        "timestamps" in result
          ? (result.timestamps as Array<{
              character: string;
              start: number;
              end: number;
            }>)
          : undefined,
      generatedAt: new Date().toISOString(),
    };

    // Save audio file with proper organization
    if (saveToAsset) {
      // Try Supabase first (primary storage) with structured upload
      if (isSupabaseConfigured()) {
        try {
          const uploadResult = await uploadVoiceAudio(result.audio, {
            npcId,
            dialogueNodeId,
            text,
            voiceId: effectiveVoiceId,
            voicePreset,
            duration: durationSeconds,
          });
          if (uploadResult.success) {
            asset.url = uploadResult.url;
            // Invalidate registry cache so new audio appears in queries
            invalidateRegistryCache();
            log.info("Voice saved to Supabase", {
              url: uploadResult.url,
              npcId,
              dialogueNodeId,
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
        // Organize locally by NPC ID if available
        const audioDir = npcId
          ? path.join(assetsDir, "audio", "voice", npcId)
          : path.join(assetsDir, "audio", "voice");

        // Create directory if needed
        await fs.mkdir(audioDir, { recursive: true });

        // Save audio file with proper naming
        const filename = `${assetId}.mp3`;
        const filepath = path.join(audioDir, filename);
        await fs.writeFile(filepath, result.audio);

        asset.url = npcId
          ? `/api/audio/file/voice/${npcId}/${filename}`
          : `/api/audio/file/voice/${filename}`;

        log.info("Voice saved locally", { filepath, npcId });
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
    log.error("Voice generation error", { error });

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("ELEVENLABS_API_KEY")) {
      return NextResponse.json(
        {
          error: "ElevenLabs API key not configured",
          message: errorMessage,
        },
        { status: 503 },
      );
    }

    // Return detailed error for debugging
    return NextResponse.json(
      {
        error: "Failed to generate voice",
        message: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}

/**
 * Generate kebab-case ID for voice audio following game asset conventions
 * Pattern: {npc-id}-{dialogue-node} or {npc-id}-{timestamp}
 */
function generateAudioId(npcId?: string, dialogueNodeId?: string): string {
  const timestamp = Date.now().toString(36).slice(-4);
  // Convert to snake_case (matching game conventions)
  const safeNpcId = npcId
    ? npcId.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
    : null;
  const safeDialogueId = dialogueNodeId
    ? dialogueNodeId.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
    : null;

  if (safeNpcId && safeDialogueId) {
    return `${safeNpcId}_${safeDialogueId}`;
  }
  if (safeNpcId) {
    return `${safeNpcId}_${timestamp}`;
  }
  return `voice_${timestamp}`;
}
