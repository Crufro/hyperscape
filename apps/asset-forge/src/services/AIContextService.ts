import type { ManifestType, AnyManifest, AIContextPreferences } from '../types/manifests'
import { createLogger } from '../utils/logger'
import { apiFetch } from '../utils/api'
import { API_ENDPOINTS } from '../config/api'

const logger = createLogger('AIContextService')

interface GetPreferencesResponse {
  preferences: AIContextPreferences
}

interface UpdatePreferencesRequest {
  useOwnPreview?: boolean
  useCdnContent?: boolean
  useTeamPreview?: boolean
  useAllSubmissions?: boolean
  maxContextItems?: number
  preferRecent?: boolean
}

interface BuildContextRequest {
  manifestType: ManifestType
}

interface BuildContextResponse {
  manifestType: ManifestType
  items: AnyManifest[]
  sources: {
    ownPreview: number
    cdnContent: number
    teamPreview: number
    submissions: number
  }
  totalItems: number
  metadata: {
    generatedAt: string
    preferences: AIContextPreferences
  }
}

export class AIContextService {
  /**
   * Get AI context preferences for the current user
   */
  async getPreferences(): Promise<AIContextPreferences> {
    try {
      const response = await apiFetch(API_ENDPOINTS.aiContextPreferences)
      if (!response.ok) {
        throw new Error(`Failed to fetch AI context preferences: ${response.statusText}`)
      }

      const data: GetPreferencesResponse = await response.json()
      return data.preferences
    } catch (error) {
      logger.error('Error fetching AI context preferences', error)
      throw error
    }
  }

  /**
   * Update AI context preferences
   */
  async updatePreferences(preferences: UpdatePreferencesRequest): Promise<AIContextPreferences> {
    try {
      const response = await apiFetch(API_ENDPOINTS.aiContextPreferences, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      })

      if (!response.ok) {
        throw new Error(`Failed to update AI context preferences: ${response.statusText}`)
      }

      const data: GetPreferencesResponse = await response.json()
      return data.preferences
    } catch (error) {
      logger.error('Error updating AI context preferences', error)
      throw error
    }
  }

  /**
   * Build AI context for a specific manifest type
   */
  async buildContext(manifestType: ManifestType): Promise<BuildContextResponse> {
    try {
      const request: BuildContextRequest = { manifestType }
      const response = await apiFetch(API_ENDPOINTS.aiContextBuild, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`Failed to build AI context: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      logger.error('Error building AI context', error)
      throw error
    }
  }

  /**
   * Helper to get just the items array from context
   */
  async getContextItems(manifestType: ManifestType): Promise<AnyManifest[]> {
    try {
      const context = await this.buildContext(manifestType)
      return context.items
    } catch (error) {
      logger.error('Error getting context items', error)
      throw error
    }
  }

  /**
   * Helper to get context metadata and summary
   */
  async getContextSummary(manifestType: ManifestType): Promise<{
    totalItems: number
    sources: BuildContextResponse['sources']
    generatedAt: string
  }> {
    try {
      const context = await this.buildContext(manifestType)
      return {
        totalItems: context.totalItems,
        sources: context.sources,
        generatedAt: context.metadata.generatedAt
      }
    } catch (error) {
      logger.error('Error getting context summary', error)
      throw error
    }
  }

  /**
   * Convenience method to toggle a specific source
   */
  async toggleSource(
    source: 'useOwnPreview' | 'useCdnContent' | 'useTeamPreview' | 'useAllSubmissions',
    enabled: boolean
  ): Promise<AIContextPreferences> {
    try {
      return await this.updatePreferences({ [source]: enabled })
    } catch (error) {
      logger.error(`Error toggling ${source}`, error)
      throw error
    }
  }

  /**
   * Convenience method to set max context items
   */
  async setMaxItems(maxItems: number): Promise<AIContextPreferences> {
    try {
      if (maxItems < 1) {
        throw new Error('Max items must be at least 1')
      }
      if (maxItems > 1000) {
        throw new Error('Max items cannot exceed 1000')
      }

      return await this.updatePreferences({ maxContextItems: maxItems })
    } catch (error) {
      logger.error('Error setting max items', error)
      throw error
    }
  }

  /**
   * Convenience method to set prefer recent flag
   */
  async setPreferRecent(preferRecent: boolean): Promise<AIContextPreferences> {
    try {
      return await this.updatePreferences({ preferRecent })
    } catch (error) {
      logger.error('Error setting prefer recent', error)
      throw error
    }
  }

  /**
   * Reset preferences to defaults
   */
  async resetPreferences(): Promise<AIContextPreferences> {
    try {
      const defaultPreferences: UpdatePreferencesRequest = {
        useOwnPreview: true,
        useCdnContent: true,
        useTeamPreview: false,
        useAllSubmissions: false,
        maxContextItems: 100,
        preferRecent: true
      }

      return await this.updatePreferences(defaultPreferences)
    } catch (error) {
      logger.error('Error resetting preferences', error)
      throw error
    }
  }
}

// Singleton instance
export const aiContextService = new AIContextService()
