import type { ManifestType, AnyManifest, ManifestSubmission } from '../types/manifests'
import { getManifestName } from '../types/manifests'
import { createLogger } from '../utils/logger'
import { apiFetch } from '../utils/api'
import { API_ENDPOINTS } from '../config/api'

const logger = createLogger('SubmissionService')

interface SubmitItemRequest {
  manifestType: ManifestType
  itemData: AnyManifest
  spriteUrls?: string[]
  imageUrls?: string[]
  modelUrl?: string
}

interface SubmitItemResponse {
  submission: ManifestSubmission
}

interface GetSubmissionsResponse {
  submissions: ManifestSubmission[]
}

interface GetSubmissionResponse {
  submission: ManifestSubmission
}

interface GetStatsResponse {
  totalSubmissions: number
  pendingSubmissions: number
  approvedSubmissions: number
  rejectedSubmissions: number
  withdrawnSubmissions: number
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export class SubmissionService {
  /**
   * Validate submission data before sending to backend
   */
  validateSubmission(
    itemData: AnyManifest,
    spriteUrls?: string[],
    imageUrls?: string[],
    modelUrl?: string
  ): ValidationResult {
    const errors: string[] = []

    // Check if itemData has required fields
    if (!itemData.id) {
      errors.push('Item ID is required')
    }
    if (!getManifestName(itemData)) {
      errors.push('Item name is required')
    }

    // Check if at least one asset is provided
    const hasSprites = spriteUrls && spriteUrls.length > 0
    const hasImages = imageUrls && imageUrls.length > 0
    const hasModel = Boolean(modelUrl)

    if (!hasSprites && !hasImages && !hasModel) {
      errors.push('At least one asset (sprite, image, or 3D model) is required')
    }

    // Validate URLs
    if (spriteUrls) {
      spriteUrls.forEach((url, index) => {
        if (!url || !url.startsWith('http')) {
          errors.push(`Invalid sprite URL at index ${index}`)
        }
      })
    }

    if (imageUrls) {
      imageUrls.forEach((url, index) => {
        if (!url || !url.startsWith('http')) {
          errors.push(`Invalid image URL at index ${index}`)
        }
      })
    }

    if (modelUrl && !modelUrl.startsWith('http')) {
      errors.push('Invalid 3D model URL')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Submit an item for approval
   */
  async submitItem(request: SubmitItemRequest): Promise<ManifestSubmission> {
    try {
      // Validate before submitting
      const validation = this.validateSubmission(
        request.itemData,
        request.spriteUrls,
        request.imageUrls,
        request.modelUrl
      )

      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
      }

      const response = await apiFetch(API_ENDPOINTS.submissions, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`Failed to submit item: ${response.statusText}`)
      }

      const data: SubmitItemResponse = await response.json()
      return data.submission
    } catch (error) {
      logger.error('Error submitting item', error)
      throw error
    }
  }

  /**
   * Get all submissions for the current user
   */
  async getMySubmissions(status?: ManifestSubmission['status']): Promise<ManifestSubmission[]> {
    try {
      const url = status
        ? `${API_ENDPOINTS.submissions}?status=${status}`
        : API_ENDPOINTS.submissions

      const response = await apiFetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch submissions: ${response.statusText}`)
      }

      const data: GetSubmissionsResponse = await response.json()
      return data.submissions
    } catch (error) {
      logger.error('Error fetching submissions', error)
      throw error
    }
  }

  /**
   * Get a specific submission by ID
   */
  async getSubmission(id: string): Promise<ManifestSubmission> {
    try {
      const response = await apiFetch(API_ENDPOINTS.submissionsDetail(id))
      if (!response.ok) {
        throw new Error(`Failed to fetch submission: ${response.statusText}`)
      }

      const data: GetSubmissionResponse = await response.json()
      return data.submission
    } catch (error) {
      logger.error('Error fetching submission', error)
      throw error
    }
  }

  /**
   * Withdraw a pending submission
   */
  async withdrawSubmission(id: string): Promise<ManifestSubmission> {
    try {
      const response = await apiFetch(API_ENDPOINTS.submissionsWithdraw(id), {
        method: 'PUT'
      })

      if (!response.ok) {
        throw new Error(`Failed to withdraw submission: ${response.statusText}`)
      }

      const data: GetSubmissionResponse = await response.json()
      return data.submission
    } catch (error) {
      logger.error('Error withdrawing submission', error)
      throw error
    }
  }

  /**
   * Get submission statistics
   */
  async getStats(): Promise<GetStatsResponse> {
    try {
      const response = await apiFetch(API_ENDPOINTS.submissionsStats)
      if (!response.ok) {
        throw new Error(`Failed to fetch submission stats: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      logger.error('Error fetching submission stats', error)
      throw error
    }
  }

  /**
   * Check if user can submit based on validation
   */
  canSubmit(
    itemData: AnyManifest,
    spriteUrls?: string[],
    imageUrls?: string[],
    modelUrl?: string
  ): boolean {
    const validation = this.validateSubmission(itemData, spriteUrls, imageUrls, modelUrl)
    return validation.isValid
  }
}

// Singleton instance
export const submissionService = new SubmissionService()
