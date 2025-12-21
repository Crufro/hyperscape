/**
 * Audio Generation Schemas
 *
 * Zod schemas for audio API endpoints:
 * - /api/audio/voice/generate
 * - /api/audio/sfx/generate
 * - /api/audio/music/generate
 */

import { z } from "zod";

// =============================================================================
// VOICE GENERATION SCHEMA
// =============================================================================

/**
 * Voice/TTS generation request
 */
export const VoiceGenerationSchema = z.object({
  /** Text to synthesize */
  text: z.string().min(1),
  /** ElevenLabs voice ID (required if no voicePreset) */
  voiceId: z.string().optional(),
  /** Voice preset name (e.g., "merchant", "guard") */
  voicePreset: z.string().optional(),
  /** Associated NPC ID */
  npcId: z.string().optional(),
  /** Associated dialogue node ID */
  dialogueNodeId: z.string().optional(),
  /** Generate lip-sync timestamp data */
  withTimestamps: z.boolean().optional(),
  /** Save to asset library */
  saveToAsset: z.boolean().optional(),
}).refine((data) => data.voiceId || data.voicePreset, {
  message: "Either voiceId or voicePreset is required",
});

// =============================================================================
// SOUND EFFECT GENERATION SCHEMA
// =============================================================================

/**
 * Sound effect category types
 */
export const SoundEffectCategorySchema = z.enum([
  "combat",
  "item",
  "environment",
  "ui",
  "character",
  "ambient",
  "custom",
]);

/**
 * Sound effect generation request
 */
export const SFXGenerationSchema = z.object({
  /** Description of the sound effect */
  prompt: z.string().optional(),
  /** Use a preset instead of custom prompt */
  presetId: z.string().optional(),
  /** Sound category */
  category: SoundEffectCategorySchema.optional().default("custom"),
  /** Custom name for the asset */
  name: z.string().optional(),
  /** Target duration in seconds */
  durationSeconds: z.number().positive().max(22).optional(),
  /** How closely to follow the prompt (0-1) */
  promptInfluence: z.number().min(0).max(1).optional(),
  /** Searchable tags */
  tags: z.array(z.string()).optional().default([]),
  /** Save to asset library */
  saveToAsset: z.boolean().optional(),
}).refine((data) => data.prompt || data.presetId, {
  message: "Either prompt or presetId is required",
});

// =============================================================================
// MUSIC GENERATION SCHEMA
// =============================================================================

/**
 * Music category types
 */
export const MusicCategorySchema = z.enum([
  "ambient",
  "combat",
  "boss",
  "town",
  "dungeon",
  "menu",
  "cutscene",
  "victory",
  "defeat",
  "custom",
]);

/**
 * Music generation request
 */
export const MusicGenerationSchema = z.object({
  /** Description of the music */
  prompt: z.string().optional(),
  /** Use a preset instead of custom prompt */
  presetId: z.string().optional(),
  /** Music category */
  category: MusicCategorySchema.optional().default("custom"),
  /** Custom name for the asset */
  name: z.string().optional(),
  /** Target duration in milliseconds */
  durationMs: z.number().positive().max(300000).optional().default(30000),
  /** Force instrumental only (no vocals) */
  forceInstrumental: z.boolean().optional().default(true),
  /** Should loop seamlessly */
  loopable: z.boolean().optional().default(true),
  /** Associated game zones */
  zones: z.array(z.string()).optional().default([]),
  /** Save to asset library */
  saveToAsset: z.boolean().optional(),
}).refine((data) => data.prompt || data.presetId, {
  message: "Either prompt or presetId is required",
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type VoiceGenerationRequest = z.infer<typeof VoiceGenerationSchema>;
export type SoundEffectCategory = z.infer<typeof SoundEffectCategorySchema>;
export type SFXGenerationRequest = z.infer<typeof SFXGenerationSchema>;
export type MusicCategory = z.infer<typeof MusicCategorySchema>;
export type MusicGenerationRequest = z.infer<typeof MusicGenerationSchema>;
