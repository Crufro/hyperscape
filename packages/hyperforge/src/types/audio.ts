/**
 * Audio Types for HyperForge
 * Defines structures for audio assets: voice, SFX, and music
 */

// ============================================================================
// Voice Audio Types
// ============================================================================

export interface VoiceAsset {
  id: string; // Unique identifier
  name: string; // Display name (e.g., "greeting_1")
  npcId?: string; // Associated NPC ID
  dialogueNodeId?: string; // Associated dialogue node
  text: string; // Original text spoken
  voiceId: string; // ElevenLabs voice ID
  voicePreset?: string; // Preset name (e.g., "merchant")
  url: string; // Relative URL to audio file
  duration: number; // Duration in seconds
  format: string; // Audio format (mp3, wav)
  timestamps?: Array<{
    character: string;
    start: number;
    end: number;
  }>;
  generatedAt: string; // ISO timestamp
}

// ============================================================================
// Sound Effect Types
// ============================================================================

export interface SoundEffectAsset {
  id: string; // Unique identifier
  name: string; // Display name (e.g., "sword_swing")
  category: SoundEffectCategory;
  prompt: string; // Text prompt used to generate
  url: string; // Relative URL to audio file
  duration: number; // Duration in seconds
  format: string; // Audio format
  tags: string[]; // Searchable tags
  generatedAt: string; // ISO timestamp
}

export type SoundEffectCategory =
  | "combat"
  | "item"
  | "environment"
  | "ui"
  | "character"
  | "ambient"
  | "custom";

// ============================================================================
// Music Types
// ============================================================================

export interface MusicAsset {
  id: string; // Unique identifier
  name: string; // Display name (e.g., "forest_theme")
  category: MusicCategory;
  prompt: string; // Text prompt used to generate
  url: string; // Relative URL to audio file
  duration: number; // Duration in seconds
  format: string; // Audio format
  loopable: boolean; // Whether the track loops seamlessly
  bpm?: number; // Beats per minute (if known)
  genre?: string; // Genre tag
  mood?: string; // Mood tag
  zones?: string[]; // Game zones this music is used in
  generatedAt: string; // ISO timestamp
}

export type MusicCategory =
  | "ambient"
  | "combat"
  | "boss"
  | "town"
  | "dungeon"
  | "menu"
  | "cutscene"
  | "victory"
  | "defeat"
  | "custom";

// ============================================================================
// Audio Manifest Types
// ============================================================================

/**
 * Audio manifest for an asset or NPC
 * Stores all associated audio files
 */
export interface AudioManifest {
  id: string; // Asset or NPC ID
  type: "npc" | "zone" | "game" | "custom";
  voice?: VoiceManifest;
  sfx?: SoundEffectManifest;
  music?: MusicManifest;
  generatedAt: string;
  lastUpdated: string;
}

export interface VoiceManifest {
  voiceId: string; // Default ElevenLabs voice ID
  voicePreset?: string; // Preset name
  assets: VoiceAsset[]; // All voice clips
  totalDuration: number; // Total duration of all clips
}

export interface SoundEffectManifest {
  assets: SoundEffectAsset[]; // All SFX
  byCategory: Record<SoundEffectCategory, string[]>; // Asset IDs by category
}

export interface MusicManifest {
  assets: MusicAsset[]; // All music tracks
  byCategory: Record<MusicCategory, string[]>; // Asset IDs by category
  byZone?: Record<string, string[]>; // Asset IDs by game zone
}

// ============================================================================
// Audio Generation Request Types
// ============================================================================

export interface VoiceGenerationRequest {
  text: string;
  voiceId?: string; // Use specific voice or default
  voicePreset?: string; // Use preset voice
  npcId?: string; // Associate with NPC
  dialogueNodeId?: string; // Associate with dialogue node
  withTimestamps?: boolean; // Generate lip-sync data
}

export interface SoundEffectGenerationRequest {
  prompt: string; // Description of the SFX
  category: SoundEffectCategory;
  name?: string; // Optional custom name
  durationSeconds?: number; // Target duration
  promptInfluence?: number; // 0-1, how closely to follow prompt
  tags?: string[]; // Searchable tags
}

export interface MusicGenerationRequest {
  prompt: string; // Description of the music
  category: MusicCategory;
  name?: string; // Optional custom name
  durationMs?: number; // Target duration in ms
  forceInstrumental?: boolean; // No vocals
  loopable?: boolean; // Should loop seamlessly
  zones?: string[]; // Associated game zones
}

// ============================================================================
// Audio Library Types (for UI)
// ============================================================================

export interface AudioLibrary {
  voices: VoiceAsset[];
  sfx: SoundEffectAsset[];
  music: MusicAsset[];
  presets: {
    voice: Array<{ id: string; name: string; description: string }>;
    sfx: Array<{ id: string; name: string; prompt: string }>;
    music: Array<{ id: string; name: string; prompt: string }>;
  };
}
