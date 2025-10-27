/**
 * Music Generation Service (Frontend)
 *
 * Client-side service for interacting with ElevenLabs music generation API.
 *
 * Features:
 * - Generate music from text prompts
 * - Create composition plans for structured music
 * - Batch generation for multiple tracks
 * - Support for instrumental and vocal tracks
 * - Detailed generation with metadata
 *
 * Used by: Music generation components and pages
 */

import { API_ENDPOINTS } from '../config/api'
import { apiFetch } from '../utils/api'
import type {
  MusicGenerationRequest,
  MusicGenerationResponse,
  MusicGenerationDetailedResponse,
  CompositionPlanRequest,
  CompositionPlan,
  MusicBatchRequest,
  MusicBatchResponse,
  MusicServiceStatus
} from '../types/music'

class MusicService {
  /**
   * Generate music from text prompt or composition plan
   * @returns Audio blob (MP3 format)
   */
  async generateMusic(request: MusicGenerationRequest): Promise<MusicGenerationResponse> {
    try {
      const response = await apiFetch(API_ENDPOINTS.musicGenerate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        deduplicate: false // Don't deduplicate POST requests
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to generate music')
      }

      // Response is audio file (MP3)
      const audioBlob = await response.blob()

      return {
        audioBlob,
        prompt: request.prompt,
        duration: request.musicLengthMs ? request.musicLengthMs / 1000 : undefined,
        size: audioBlob.size
      }
    } catch (error) {
      console.error('[MusicService] Error generating music:', error)
      throw error
    }
  }

  /**
   * Generate music with detailed metadata response
   */
  async generateMusicDetailed(
    request: MusicGenerationRequest
  ): Promise<MusicGenerationDetailedResponse> {
    try {
      const response = await apiFetch(API_ENDPOINTS.musicGenerateDetailed, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        deduplicate: false
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to generate detailed music')
      }

      const data = await response.json()

      // Convert base64 audio to blob
      const binaryString = atob(data.audio)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' })

      return {
        audioBlob,
        metadata: data.metadata || {},
        format: data.format || 'mp3_44100_128',
        size: audioBlob.size
      }
    } catch (error) {
      console.error('[MusicService] Error generating detailed music:', error)
      throw error
    }
  }

  /**
   * Create a composition plan from a text prompt
   * This doesn't cost any credits
   */
  async createCompositionPlan(request: CompositionPlanRequest): Promise<CompositionPlan> {
    try {
      const response = await apiFetch(API_ENDPOINTS.musicPlan, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to create composition plan')
      }

      const plan: CompositionPlan = await response.json()
      return plan
    } catch (error) {
      console.error('[MusicService] Error creating composition plan:', error)
      throw error
    }
  }

  /**
   * Generate multiple music tracks in batch
   */
  async generateBatchMusic(request: MusicBatchRequest): Promise<MusicBatchResponse> {
    try {
      const response = await apiFetch(API_ENDPOINTS.musicBatch, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || error.message || 'Failed to generate batch music')
      }

      const data = await response.json()

      // Convert base64 audio to blobs
      const results = data.results.map((result: { success: boolean; audio: string | null; prompt: string; error?: string }) => {
        if (result.audio) {
          // Convert base64 to blob
          const binaryString = atob(result.audio)
          const bytes = new Uint8Array(binaryString.length)
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          const audioBlob = new Blob([bytes], { type: 'audio/mpeg' })

          return {
            success: result.success,
            audioBlob,
            prompt: result.prompt
          }
        }

        return {
          success: result.success,
          prompt: result.prompt,
          error: result.error
        }
      })

      return {
        results,
        total: data.total,
        successful: data.successful,
        failed: data.failed
      }
    } catch (error) {
      console.error('[MusicService] Error generating batch music:', error)
      throw error
    }
  }

  /**
   * Get music generation service status
   */
  async getStatus(): Promise<MusicServiceStatus> {
    try {
      const response = await apiFetch(API_ENDPOINTS.musicStatus)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get service status')
      }

      return await response.json()
    } catch (error) {
      console.error('[MusicService] Error getting service status:', error)
      // Return unavailable status on error
      return {
        available: false,
        rateLimit: {
          currentConcurrentRequests: 0,
          remainingCapacity: 0,
          lastUpdated: null
        }
      }
    }
  }

  /**
   * Download audio blob as file
   */
  downloadAudio(audioBlob: Blob, filename: string = `music-${Date.now()}.mp3`): void {
    const url = URL.createObjectURL(audioBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Create audio URL for playback
   */
  createAudioUrl(audioBlob: Blob): string {
    return URL.createObjectURL(audioBlob)
  }

  /**
   * Revoke audio URL to free memory
   */
  revokeAudioUrl(url: string): void {
    URL.revokeObjectURL(url)
  }
}

// Export singleton instance
export const musicService = new MusicService()
export default musicService
