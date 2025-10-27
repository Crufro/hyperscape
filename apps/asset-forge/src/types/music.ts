/**
 * Music Generation Types
 * Type definitions for ElevenLabs music generation
 */

// Time range for sections
export interface TimeRange {
  start_ms: number
  end_ms: number
}

// Section source for referencing previous music
export interface SectionSource {
  song_id: string
  range: TimeRange
  negative_ranges?: TimeRange[]
}

// Individual song section
export interface SongSection {
  section_name: string
  positive_local_styles: string[]
  negative_local_styles: string[]
  duration_ms: number
  lines: string[]
  source_from?: SectionSource | null
}

// Composition plan structure
export interface CompositionPlan {
  positive_global_styles: string[]
  negative_global_styles: string[]
  sections: SongSection[]
}

// Music generation request
export interface MusicGenerationRequest {
  prompt?: string
  compositionPlan?: CompositionPlan
  musicLengthMs?: number
  modelId?: 'music_v1'
  forceInstrumental?: boolean
  respectSectionsDurations?: boolean
  storeForInpainting?: boolean
  outputFormat?: MusicOutputFormat
}

// Music generation response
export interface MusicGenerationResponse {
  audioBlob: Blob
  prompt?: string
  duration?: number // in seconds
  size: number // file size in bytes
}

// Detailed music generation response
export interface MusicGenerationDetailedResponse {
  audioBlob: Blob
  metadata: Record<string, unknown>
  format: string
  size: number
}

// Composition plan request
export interface CompositionPlanRequest {
  prompt: string
  musicLengthMs?: number
  sourceCompositionPlan?: CompositionPlan
  modelId?: 'music_v1'
}

// Batch music generation request
export interface MusicBatchRequest {
  tracks: MusicGenerationRequest[]
}

// Batch music generation response
export interface MusicBatchResponse {
  results: MusicBatchResult[]
  total: number
  successful: number
  failed: number
}

// Individual batch result
export interface MusicBatchResult {
  success: boolean
  audioBlob?: Blob
  prompt?: string
  error?: string
}

// Music service status
export interface MusicServiceStatus {
  available: boolean
  rateLimit: {
    currentConcurrentRequests: number
    remainingCapacity: number
    lastUpdated: Date | null
  }
}

// Available output formats
export type MusicOutputFormat =
  | 'mp3_22050_32'
  | 'mp3_24000_48'
  | 'mp3_44100_32'
  | 'mp3_44100_64'
  | 'mp3_44100_96'
  | 'mp3_44100_128'
  | 'mp3_44100_192'
  | 'pcm_8000'
  | 'pcm_16000'
  | 'pcm_22050'
  | 'pcm_24000'
  | 'pcm_32000'
  | 'pcm_44100'
  | 'pcm_48000'
  | 'ulaw_8000'
  | 'alaw_8000'
  | 'opus_48000_32'
  | 'opus_48000_64'
  | 'opus_48000_96'
  | 'opus_48000_128'
  | 'opus_48000_192'

// Music generation form state
export interface MusicGenerationForm {
  prompt: string
  musicLengthSeconds: number
  forceInstrumental: boolean
  useCompositionPlan: boolean
  compositionPlan?: CompositionPlan
  outputFormat: MusicOutputFormat
}
