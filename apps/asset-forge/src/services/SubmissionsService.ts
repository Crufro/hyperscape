/**
 * Submissions Service
 * Handles user submissions of manifest items for admin approval
 */

import type { ManifestType, AnyManifest } from '../types/manifests'
import { createLogger } from '../utils/logger'
import { apiFetch } from '../utils/api'
import { API_ENDPOINTS } from '../config/api'

const logger = createLogger('SubmissionsService')

export interface ManifestSubmission {
  id: string
  manifestType: ManifestType
  itemId: string
  itemData: AnyManifest
  editedItemData?: AnyManifest
  wasEdited: boolean
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
  adminNotes?: string
  rejectionReason?: string
  hasDetails: boolean
  hasSprites: boolean
  hasImages: boolean
  has3dModel: boolean
  spriteUrls?: string[]
  imageUrls?: string[]
  modelUrl?: string
  user?: {
    displayName: string
    email: string
  }
}

export interface SubmissionStats {
  total: number
  pending: number
  approved: number
  rejected: number
}

export interface AdminSubmissionStats {
  pending: number
  approvedToday: number
  rejectedToday: number
  total: number
}

export class SubmissionsService {
  /**
   * Submit an item for approval
   */
  async submitItem(
    manifestType: ManifestType,
    itemId: string,
    itemData: AnyManifest,
    spriteUrls: string[],
    imageUrls: string[],
    modelUrl: string,
    teamId?: string
  ): Promise<ManifestSubmission> {
    try {
      const response = await apiFetch(API_ENDPOINTS.submissions, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manifestType,
          itemId,
          itemData,
          spriteUrls,
          imageUrls,
          modelUrl,
          teamId
        })
      })

      if (!response.ok) {
        try {
          const error = await response.json()
          throw new Error(error.error || error.message || 'Failed to submit item')
        } catch (parseError) {
          throw new Error('Failed to submit item')
        }
      }

      const result = await response.json()
      return result.submission
    } catch (error) {
      logger.error('Error submitting item', error)
      throw error
    }
  }

  /**
   * Get user's submissions
   */
  async getMySubmissions(status?: 'pending' | 'approved' | 'rejected'): Promise<ManifestSubmission[]> {
    try {
      const url = status
        ? `${API_ENDPOINTS.submissions}?status=${status}`
        : API_ENDPOINTS.submissions

      const response = await apiFetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch submissions')
      }

      const result = await response.json()
      return result.submissions || []
    } catch (error) {
      logger.error('Error fetching submissions', error)
      throw error
    }
  }

  /**
   * Get submission by ID
   */
  async getSubmission(submissionId: string): Promise<ManifestSubmission> {
    try {
      const response = await apiFetch(API_ENDPOINTS.submissionsDetail(submissionId))

      if (!response.ok) {
        throw new Error('Failed to fetch submission')
      }

      return await response.json()
    } catch (error) {
      logger.error('Error fetching submission', error)
      throw error
    }
  }

  /**
   * Withdraw pending submission
   */
  async withdrawSubmission(submissionId: string): Promise<void> {
    try {
      const response = await apiFetch(API_ENDPOINTS.submissionsWithdraw(submissionId), {
        method: 'PUT'
      })

      if (!response.ok) {
        try {
          const error = await response.json()
          throw new Error(error.error || 'Failed to withdraw submission')
        } catch (parseError) {
          throw new Error('Failed to withdraw submission')
        }
      }
    } catch (error) {
      logger.error('Error withdrawing submission', error)
      throw error
    }
  }

  /**
   * Get user's submission stats
   */
  async getMyStats(): Promise<SubmissionStats> {
    try {
      const response = await apiFetch(API_ENDPOINTS.submissionsStats)

      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      return await response.json()
    } catch (error) {
      logger.error('Error fetching stats', error)
      throw error
    }
  }

  // ==================== Admin Methods ====================

  /**
   * Get pending submissions (admin only)
   */
  async getPendingSubmissions(type?: ManifestType): Promise<ManifestSubmission[]> {
    try {
      const url = type
        ? `${API_ENDPOINTS.adminPendingSubmissions}?type=${type}`
        : API_ENDPOINTS.adminPendingSubmissions

      const response = await apiFetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch pending submissions')
      }

      const result = await response.json()
      return result.submissions || []
    } catch (error) {
      logger.error('Error fetching pending submissions', error)
      throw error
    }
  }

  /**
   * Get submission details (admin)
   */
  async getSubmissionForReview(submissionId: string): Promise<ManifestSubmission> {
    try {
      const response = await apiFetch(API_ENDPOINTS.adminSubmissionDetail(submissionId))

      if (!response.ok) {
        throw new Error('Failed to fetch submission')
      }

      return await response.json()
    } catch (error) {
      logger.error('Error fetching submission for review', error)
      throw error
    }
  }

  /**
   * Edit submission before approval (admin only)
   */
  async editSubmission(
    submissionId: string,
    editedItemData: AnyManifest,
    adminNotes?: string
  ): Promise<void> {
    try {
      const response = await apiFetch(API_ENDPOINTS.adminEditSubmission(submissionId), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editedItemData, adminNotes })
      })

      if (!response.ok) {
        try {
          const error = await response.json()
          throw new Error(error.error || 'Failed to edit submission')
        } catch (parseError) {
          throw new Error('Failed to edit submission')
        }
      }
    } catch (error) {
      logger.error('Error editing submission', error)
      throw error
    }
  }

  /**
   * Approve submission (admin only)
   */
  async approveSubmission(submissionId: string, adminNotes?: string): Promise<void> {
    try {
      const response = await apiFetch(API_ENDPOINTS.adminApproveSubmission(submissionId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes })
      })

      if (!response.ok) {
        try {
          const error = await response.json()
          throw new Error(error.error || 'Failed to approve submission')
        } catch (parseError) {
          throw new Error('Failed to approve submission')
        }
      }
    } catch (error) {
      logger.error('Error approving submission', error)
      throw error
    }
  }

  /**
   * Reject submission (admin only)
   */
  async rejectSubmission(
    submissionId: string,
    rejectionReason: string,
    adminNotes?: string
  ): Promise<void> {
    try {
      const response = await apiFetch(API_ENDPOINTS.adminRejectSubmission(submissionId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason, adminNotes })
      })

      if (!response.ok) {
        try {
          const error = await response.json()
          throw new Error(error.error || 'Failed to reject submission')
        } catch (parseError) {
          throw new Error('Failed to reject submission')
        }
      }
    } catch (error) {
      logger.error('Error rejecting submission', error)
      throw error
    }
  }

  /**
   * Get admin stats
   */
  async getAdminStats(): Promise<AdminSubmissionStats> {
    try {
      const response = await apiFetch(API_ENDPOINTS.adminSubmissionStats)

      if (!response.ok) {
        throw new Error('Failed to fetch admin stats')
      }

      return await response.json()
    } catch (error) {
      logger.error('Error fetching admin stats', error)
      throw error
    }
  }
}

// Singleton instance
export const submissionsService = new SubmissionsService()
