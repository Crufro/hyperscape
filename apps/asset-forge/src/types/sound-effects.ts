/**
 * Sound Effects Generation Types
 *
 * Type definitions for ElevenLabs sound effects generation system.
 *
 * Used by: SoundEffectsService, Sound Effects components
 */

// Sound effect generation request
export interface SoundEffectRequest {
  text: string
  durationSeconds?: number | null // 0.5-22 seconds, or null for auto
  promptInfluence?: number // 0-1, default 0.3
  loop?: boolean // Seamless looping
}

// Sound effect generation response
export interface SoundEffectResponse {
  audioBlob: Blob
  text: string
  duration: number | 'auto'
  size: number
}

// Batch generation request
export interface SoundEffectBatchRequest {
  effects: SoundEffectRequest[]
}

// Batch generation response
export interface SoundEffectBatchResponse {
  effects: Array<{
    index: number
    success: boolean
    audioBuffer?: string // base64
    audioBlob?: Blob
    text: string
    size?: number
    error?: string
  }>
  successful: number
  total: number
}

// Cost estimation
export interface SoundEffectCostEstimate {
  duration: number | 'auto'
  credits: number
  estimatedCostUSD: string
}

// Sound effect category (for manifest compatibility)
export type SoundEffectCategory =
  | 'combat'
  | 'environment'
  | 'ui'
  | 'item'
  | 'spell'
  | 'ambient'

// Hyperscape-specific sound effect categories
export const HYPERSCAPE_SFX_CATEGORIES: Array<{
  id: SoundEffectCategory
  label: string
  description: string
  examples: string[]
}> = [
  {
    id: 'combat',
    label: 'Combat',
    description: 'Weapon strikes, impacts, and battle sounds',
    examples: [
      'Sword slash through air',
      'Arrow hitting wooden shield',
      'Magic fireball explosion',
      'Heavy armor footsteps in battle'
    ]
  },
  {
    id: 'environment',
    label: 'Environment',
    description: 'Natural world sounds and ambience',
    examples: [
      'Forest wind rustling through ancient trees',
      'Distant waterfall in mystical cave',
      'Creaking wooden bridge over chasm',
      'Thunder rumbling over dark mountains'
    ]
  },
  {
    id: 'ui',
    label: 'UI',
    description: 'User interface interactions',
    examples: [
      'Quest completed fanfare',
      'Item pickup chime',
      'Menu navigation click',
      'Level up achievement sound'
    ]
  },
  {
    id: 'item',
    label: 'Items',
    description: 'Item usage and interaction sounds',
    examples: [
      'Potion bottle uncorking and drinking',
      'Leather bag opening',
      'Gold coins clinking together',
      'Lockpick attempting ancient lock'
    ]
  },
  {
    id: 'spell',
    label: 'Spells & Magic',
    description: 'Magical effects and spellcasting',
    examples: [
      'Arcane energy charging up',
      'Healing spell gentle glow',
      'Teleportation whoosh',
      'Dark magic curse casting'
    ]
  },
  {
    id: 'ambient',
    label: 'Ambient',
    description: 'Background loops and atmosphere',
    examples: [
      'Tavern crowd murmur',
      'Dungeon dripping water echoes',
      'Mystical energy humming',
      'Village marketplace bustle'
    ]
  }
]
