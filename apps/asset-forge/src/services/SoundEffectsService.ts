/**
 * Sound Effects Generation Service (Frontend)
 *
 * Client-side service for interacting with ElevenLabs sound effects generation API.
 *
 * Features:
 * - Generate sound effects from text descriptions
 * - Support for duration control
 * - Prompt influence for style control
 * - Batch generation
 * - Cost estimation
 *
 * Used by: Sound Effects components and pages
 */

import { API_ENDPOINTS } from '../config/api'
import { apiFetch } from '../utils/api'
import type {
  SoundEffectRequest,
  SoundEffectResponse,
  SoundEffectBatchRequest,
  SoundEffectBatchResponse,
  SoundEffectCostEstimate
} from '../types/sound-effects'

class SoundEffectsService {
  /**
   * Generate single sound effect from text description
   * @returns Audio blob (MP3 format)
   */
  async generateSoundEffect(request: SoundEffectRequest): Promise<SoundEffectResponse> {
    try {
      const response = await apiFetch(API_ENDPOINTS.sfxGenerate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        deduplicate: false // Don't deduplicate POST requests
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to generate sound effect')
      }

      // Response is audio file (MP3)
      const audioBlob = await response.blob()

      return {
        audioBlob,
        text: request.text,
        duration: request.durationSeconds ?? 'auto',
        size: audioBlob.size
      }
    } catch (error) {
      console.error('[SoundEffectsService] Error generating sound effect:', error)
      throw error
    }
  }

  /**
   * Generate multiple sound effects in batch
   */
  async generateBatchSoundEffects(
    request: SoundEffectBatchRequest
  ): Promise<SoundEffectBatchResponse> {
    try {
      const response = await apiFetch(API_ENDPOINTS.sfxBatch, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to generate batch sound effects')
      }

      const data: SoundEffectBatchResponse = await response.json()

      // Convert base64 audio to blobs
      const effectsWithBlobs = data.effects.map(effect => {
        if (effect.audioBuffer) {
          // Convert base64 to blob
          const binaryString = atob(effect.audioBuffer)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          const audioBlob = new Blob([bytes], { type: 'audio/mpeg' })

          return {
            ...effect,
            audioBlob,
            audioBuffer: undefined // Remove base64 to save memory
          }
        }
        return effect
      })

      return {
        ...data,
        effects: effectsWithBlobs
      }
    } catch (error) {
      console.error('[SoundEffectsService] Error generating batch sound effects:', error)
      throw error
    }
  }

  /**
   * Estimate cost for sound effect generation
   */
  async estimateCost(durationSeconds?: number | null): Promise<SoundEffectCostEstimate> {
    try {
      const url = durationSeconds
        ? `${API_ENDPOINTS.sfxEstimate}?duration=${durationSeconds}`
        : API_ENDPOINTS.sfxEstimate

      const response = await apiFetch(url)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to estimate cost')
      }

      const data: SoundEffectCostEstimate = await response.json()
      return data
    } catch (error) {
      console.error('[SoundEffectsService] Error estimating cost:', error)
      throw error
    }
  }

  /**
   * Play audio preview from blob
   */
  playAudioPreview(audioBlob: Blob): HTMLAudioElement {
    const audioUrl = URL.createObjectURL(audioBlob)
    const audio = new Audio(audioUrl)

    // Clean up URL when audio finishes
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(audioUrl)
    })

    audio.play().catch(error => {
      console.error('[SoundEffectsService] Error playing audio:', error)
      URL.revokeObjectURL(audioUrl)
    })

    return audio
  }

  /**
   * Download audio blob as file
   */
  downloadAudio(audioBlob: Blob, filename: string) {
    const url = URL.createObjectURL(audioBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

export const soundEffectsService = new SoundEffectsService()
