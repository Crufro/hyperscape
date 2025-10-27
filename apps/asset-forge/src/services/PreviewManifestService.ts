import type { ManifestType, AnyManifest, PreviewManifest } from '../types/manifests'
import { createLogger } from '../utils/logger'
import { apiFetch } from '../utils/api'
import { API_ENDPOINTS } from '../config/api'

const logger = createLogger('PreviewManifestService')

interface GetPreviewManifestsResponse {
  manifests: PreviewManifest[]
}

interface GetPreviewManifestResponse {
  id: string
  userId?: string
  teamId?: string
  manifestType: ManifestType
  content: AnyManifest[]
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export class PreviewManifestService {
  /**
   * Get all preview manifests for the current user
   */
  async getPreviewManifests(type?: ManifestType): Promise<PreviewManifest[]> {
    try {
      const url = type
        ? `${API_ENDPOINTS.previewManifests}?type=${type}`
        : API_ENDPOINTS.previewManifests

      const response = await apiFetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch preview manifests: ${response.statusText}`)
      }

      const data: GetPreviewManifestsResponse = await response.json()
      return data.manifests
    } catch (error) {
      logger.error('Error fetching preview manifests', error)
      throw error
    }
  }

  /**
   * Get a specific preview manifest by type
   */
  async getPreviewManifest(type: ManifestType): Promise<GetPreviewManifestResponse> {
    try {
      const response = await apiFetch(API_ENDPOINTS.previewManifestsType(type))
      if (!response.ok) {
        throw new Error(`Failed to fetch ${type} preview manifest: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      logger.error(`Error fetching ${type} preview manifest`, error)
      throw error
    }
  }

  /**
   * Get merged manifest view: original (published) items + user's draft items
   * This is the recommended way to view manifests in Asset Forge
   */
  async getMergedManifest(type: ManifestType): Promise<{
    type: string
    content: AnyManifest[]
    stats: {
      total: number
      original: number
      user: number
      overridden: number
    }
    version: number
    userManifestId?: string
    updatedAt: string
  }> {
    try {
      const response = await apiFetch(API_ENDPOINTS.previewManifestsMerged(type))
      if (!response.ok) {
        throw new Error(`Failed to fetch merged ${type} manifest: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      logger.error(`Error fetching merged ${type} manifest`, error)
      throw error
    }
  }

  /**
   * Add an item to a preview manifest
   */
  async addItem(type: ManifestType, item: AnyManifest): Promise<GetPreviewManifestResponse> {
    try {
      const response = await apiFetch(API_ENDPOINTS.previewManifestsItem(type), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      })

      if (!response.ok) {
        throw new Error(`Failed to add item: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      logger.error('Error adding item to preview manifest', error)
      throw error
    }
  }

  /**
   * Update an item in a preview manifest
   */
  async updateItem(type: ManifestType, itemId: string, item: AnyManifest): Promise<GetPreviewManifestResponse> {
    try {
      const response = await apiFetch(API_ENDPOINTS.previewManifestsUpdateItem(type, itemId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      })

      if (!response.ok) {
        throw new Error(`Failed to update item: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      logger.error('Error updating preview manifest item', error)
      throw error
    }
  }

  /**
   * Delete an item from a preview manifest
   */
  async deleteItem(type: ManifestType, itemId: string): Promise<GetPreviewManifestResponse> {
    try {
      const response = await apiFetch(API_ENDPOINTS.previewManifestsUpdateItem(type, itemId), {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Failed to delete item: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      logger.error('Error deleting preview manifest item', error)
      throw error
    }
  }

  /**
   * Get team preview manifests
   */
  async getTeamPreviewManifests(teamId: string, type?: ManifestType): Promise<PreviewManifest[]> {
    try {
      const url = type
        ? `${API_ENDPOINTS.previewManifestsTeam(teamId)}?type=${type}`
        : API_ENDPOINTS.previewManifestsTeam(teamId)

      const response = await apiFetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch team preview manifests: ${response.statusText}`)
      }

      const data: GetPreviewManifestsResponse = await response.json()
      return data.manifests
    } catch (error) {
      logger.error('Error fetching team preview manifests', error)
      throw error
    }
  }

  /**
   * Add item to team preview manifest
   */
  async addTeamItem(teamId: string, type: ManifestType, item: AnyManifest): Promise<GetPreviewManifestResponse> {
    try {
      const response = await apiFetch(API_ENDPOINTS.previewManifestsTeamItem(teamId, type), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      })

      if (!response.ok) {
        throw new Error(`Failed to add team item: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      logger.error('Error adding item to team preview manifest', error)
      throw error
    }
  }

  /**
   * Update team preview item
   */
  async updateTeamItem(teamId: string, type: ManifestType, itemId: string, item: AnyManifest): Promise<GetPreviewManifestResponse> {
    try {
      const response = await apiFetch(API_ENDPOINTS.previewManifestsTeamUpdateItem(teamId, type, itemId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      })

      if (!response.ok) {
        throw new Error(`Failed to update team item: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      logger.error('Error updating team preview manifest item', error)
      throw error
    }
  }

  /**
   * Delete team preview item
   */
  async deleteTeamItem(teamId: string, type: ManifestType, itemId: string): Promise<GetPreviewManifestResponse> {
    try {
      const response = await apiFetch(API_ENDPOINTS.previewManifestsTeamUpdateItem(teamId, type, itemId), {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Failed to delete team item: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      logger.error('Error deleting team preview manifest item', error)
      throw error
    }
  }
}

// Singleton instance
export const previewManifestService = new PreviewManifestService()
