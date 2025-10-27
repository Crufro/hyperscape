/**
 * AI Model Definitions
 *
 * Centralized configuration for AI models across the platform.
 * Models are categorized by capability (text, image, voice, embedding, 3D).
 * Admins can enable/disable models, and users select from admin-enabled models.
 */

// =============================================================================
// MODEL CATEGORIES
// =============================================================================

export const MODEL_CATEGORIES = {
  TEXT_GENERATION: 'text-generation',
  IMAGE_GENERATION: 'image-generation',
  VOICE_GENERATION: 'voice-generation',
  EMBEDDING: 'embedding',
  THREE_D_GENERATION: '3d-generation'
} as const

export type ModelCategory = typeof MODEL_CATEGORIES[keyof typeof MODEL_CATEGORIES]

// =============================================================================
// MODEL TIERS
// =============================================================================

export const MODEL_TIERS = {
  QUALITY: 'quality',      // Best quality, higher cost
  SPEED: 'speed',          // Fast responses, good quality
  BALANCED: 'balanced',    // Balance of quality and cost
  COST: 'cost'            // Most cost-effective
} as const

export type ModelTier = typeof MODEL_TIERS[keyof typeof MODEL_TIERS]

// =============================================================================
// MODEL DEFINITION INTERFACE
// =============================================================================

export interface AIModel {
  id: string                    // e.g., 'openai/gpt-4o', 'anthropic/claude-opus-4'
  name: string                  // Display name
  provider: string              // 'openai', 'anthropic', 'elevenlabs', 'meshy'
  category: ModelCategory
  tier: ModelTier
  description?: string
  capabilities?: string[]       // e.g., ['function-calling', 'vision', 'streaming']
  contextWindow?: number        // Max context tokens
  maxOutputTokens?: number      // Max output tokens
  pricing?: {
    input: number              // Cost per 1M input tokens
    output: number             // Cost per 1M output tokens
    currency: 'USD'
  }
  isRecommended?: boolean       // Highlighted as recommended choice
}

// =============================================================================
// Legacy Types (for backward compatibility)
// =============================================================================

export type TaskType =
  | 'npc_dialogue'
  | 'dialogue_tree'
  | 'quest_generation'
  | 'lore_writing'

export type Priority = 'cost' | 'quality' | 'speed'

// Legacy AVAILABLE_MODELS for backward compatibility
export const AVAILABLE_MODELS = [
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', tier: 'cost' as const },
  { id: 'openai/gpt-4o', name: 'GPT-4o', tier: 'balanced' as const },
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', tier: 'quality' as const },
  { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', tier: 'cost' as const },
] as const
