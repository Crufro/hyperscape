/**
 * ApprovalDashboard Component
 * Admin interface for reviewing and approving manifest submissions
 */

import React, { useState, useEffect } from 'react'
import {
  CheckCircle,
  XCircle,
  Shield,
  Loader2,
  AlertCircle,
  Filter,
  Eye,
  Edit3,
} from 'lucide-react'

import { Button } from '@/components/common/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Modal } from '@/components/common/Modal'
import { Input } from '@/components/common/Input'
import type { ManifestType } from '@/types/manifests'
import { getManifestName } from '@/types/manifests'
import { submissionsService, type ManifestSubmission } from '@/services/SubmissionsService'

export const ApprovalDashboard: React.FC = () => {
  const [submissions, setSubmissions] = useState<ManifestSubmission[]>([])
  const [filterType, setFilterType] = useState<ManifestType | 'all'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<ManifestSubmission | null>(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [editedData, setEditedData] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [todayStats, setTodayStats] = useState({ approvedToday: 0, rejectedToday: 0, pending: 0, total: 0 })

  const manifestTypes: Array<ManifestType | 'all'> = [
    'all',
    'items',
    'npcs',
    'lore',
    'quests',
    'music',
    'voice',
    'sound_effects',
    'static_images',
  ]

  useEffect(() => {
    loadData()
  }, [filterType])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [pendingSubmissions, stats] = await Promise.all([
        submissionsService.getPendingSubmissions(filterType === 'all' ? undefined : filterType),
        submissionsService.getAdminStats(),
      ])

      setSubmissions(pendingSubmissions)
      setTodayStats(stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions')
    } finally {
      setIsLoading(false)
    }
  }

  const openReviewModal = (submission: ManifestSubmission) => {
    setSelectedSubmission(submission)
    setEditedData(JSON.stringify(submission.itemData, null, 2))
    setAdminNotes('')
    setRejectionReason('')
    setIsReviewModalOpen(true)
  }

  const closeReviewModal = () => {
    setSelectedSubmission(null)
    setIsReviewModalOpen(false)
    setEditedData('')
    setAdminNotes('')
    setRejectionReason('')
  }

  const handleApprove = async () => {
    if (!selectedSubmission) return

    try {
      setActionLoading('approve')

      let parsedData
      try {
        parsedData = JSON.parse(editedData)
      } catch {
        alert('Invalid JSON in edited data')
        return
      }

      // If data was edited, update the submission first
      const originalData = JSON.stringify(selectedSubmission.itemData, null, 2)
      if (editedData !== originalData) {
        await submissionsService.editSubmission(selectedSubmission.id, parsedData, adminNotes)
      }

      // Then approve
      await submissionsService.approveSubmission(selectedSubmission.id, adminNotes)

      // Show success toast (placeholder)
      alert('Submission approved successfully!')

      closeReviewModal()
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve submission')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!selectedSubmission) return

    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason')
      return
    }

    try {
      setActionLoading('reject')

      await submissionsService.rejectSubmission(
        selectedSubmission.id,
        rejectionReason,
        adminNotes
      )

      // Show success toast (placeholder)
      alert('Submission rejected')

      closeReviewModal()
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject submission')
    } finally {
      setActionLoading(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-text-secondary">Loading submissions...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary bg-opacity-10 rounded-lg">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Approval Dashboard</h1>
          <p className="text-sm text-text-secondary">Review and approve community submissions</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg bg-error bg-opacity-10 border border-error p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-error">Error</h3>
              <p className="text-sm text-text-secondary mt-1">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-error hover:text-error/80">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-text-secondary">Pending Review</div>
          <div className="text-2xl font-bold text-warning mt-1">{submissions.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-text-secondary">Approved Today</div>
          <div className="text-2xl font-bold text-success mt-1">{todayStats.approvedToday}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-text-secondary">Rejected Today</div>
          <div className="text-2xl font-bold text-error mt-1">{todayStats.rejectedToday}</div>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-text-tertiary" />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as ManifestType | 'all')}
          className="px-4 py-2 rounded-lg bg-bg-secondary border border-border-primary text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {manifestTypes.map((type) => (
            <option key={type} value={type}>
              {type === 'all' ? 'All Types' : type.replace('_', ' ').toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Submissions List */}
      {submissions.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">All caught up!</h3>
            <p className="text-sm text-text-secondary">
              {filterType === 'all'
                ? 'No pending submissions to review'
                : `No pending ${filterType} submissions`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((submission) => (
            <Card key={submission.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate">{getManifestName(submission.itemData)}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="warning" size="sm">
                        Pending Review
                      </Badge>
                      <span className="text-xs text-text-tertiary capitalize">
                        {submission.manifestType.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-text-tertiary ml-4">
                    {new Date(submission.submittedAt).toLocaleDateString()}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Description */}
                {(submission.itemData as any).description && (
                  <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                    {(submission.itemData as any).description}
                  </p>
                )}

                {/* Asset Checklist */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    {submission.hasDetails ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-error" />
                    )}
                    <span className="text-xs text-text-secondary">Details</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {submission.hasSprites ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-error" />
                    )}
                    <span className="text-xs text-text-secondary">Sprites</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {submission.hasImages ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-error" />
                    )}
                    <span className="text-xs text-text-secondary">Images</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {submission.has3dModel ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-error" />
                    )}
                    <span className="text-xs text-text-secondary">3D Model</span>
                  </div>
                </div>

                {/* Actions */}
                <Button
                  size="md"
                  variant="primary"
                  onClick={() => openReviewModal(submission)}
                  className="w-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Review Submission
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedSubmission && (
        <Modal
          open={isReviewModalOpen}
          onClose={closeReviewModal}
          size="lg"
        >
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-text-primary mb-4">Review Submission</h2>
            {/* Item Details */}
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-2">Item Information</h3>
              <div className="p-3 bg-bg-secondary rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-text-tertiary">Name:</span>
                  <span className="text-sm text-text-primary font-medium">
                    {getManifestName(selectedSubmission.itemData)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-tertiary">Type:</span>
                  <span className="text-sm text-text-primary capitalize">
                    {selectedSubmission.manifestType.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-text-tertiary">Submitted:</span>
                  <span className="text-sm text-text-primary">
                    {new Date(selectedSubmission.submittedAt).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Editable JSON */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Item Data (Editable)
              </label>
              <textarea
                value={editedData}
                onChange={(e) => setEditedData(e.target.value)}
                className="w-full h-64 px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg text-xs font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                spellCheck={false}
              />
            </div>

            {/* Admin Notes */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Admin Notes (Optional)
              </label>
              <Input
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes for the submitter..."
              />
            </div>

            {/* Rejection Reason */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Rejection Reason (Required if rejecting)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full h-24 px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Explain why this submission is being rejected..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={handleApprove}
                disabled={!!actionLoading}
                className="flex-1"
              >
                {actionLoading === 'approve' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve
              </Button>

              <Button
                variant="danger"
                onClick={handleReject}
                disabled={!!actionLoading}
                className="flex-1"
              >
                {actionLoading === 'reject' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Reject
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default ApprovalDashboard
