/**
 * SubmissionReviewPanel Component
 * View and manage manifest submissions
 */

import React, { useState, useEffect } from 'react'
import {
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Send,
  X as XIcon,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

import { Button } from '@/components/common/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import { Modal } from '@/components/common/Modal'
import { getManifestName } from '@/types/manifests'
import { submissionsService, type ManifestSubmission } from '@/services/SubmissionsService'

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected'

export const SubmissionReviewPanel: React.FC = () => {
  const [submissions, setSubmissions] = useState<ManifestSubmission[]>([])
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<ManifestSubmission | null>(null)
  const [expandedRejections, setExpandedRejections] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    loadSubmissions()
  }, [])

  const loadSubmissions = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const result = await submissionsService.getMySubmissions()
      setSubmissions(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load submissions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleWithdraw = async (submissionId: string) => {
    if (!confirm('Are you sure you want to withdraw this submission?')) return

    try {
      setActionLoading(submissionId)
      await submissionsService.withdrawSubmission(submissionId)
      await loadSubmissions()
      alert('Submission withdrawn successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to withdraw submission')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResubmit = async (_submissionId: string) => {
    // Note: Resubmit functionality would require creating a new submission
    // For now, guide user to create a new one
    alert('To resubmit rejected content, please edit your draft and submit again as a new submission.')
  }

  const toggleRejectionExpanded = (submissionId: string) => {
    setExpandedRejections((prev) => {
      const next = new Set(prev)
      if (next.has(submissionId)) {
        next.delete(submissionId)
      } else {
        next.add(submissionId)
      }
      return next
    })
  }

  const getFilteredSubmissions = (): ManifestSubmission[] => {
    if (filterStatus === 'all') return submissions
    return submissions.filter((s) => s.status === filterStatus)
  }

  const getStats = () => {
    return {
      total: submissions.length,
      pending: submissions.filter((s) => s.status === 'pending').length,
      approved: submissions.filter((s) => s.status === 'approved').length,
      rejected: submissions.filter((s) => s.status === 'rejected').length,
    }
  }

  const getStatusBadgeVariant = (
    status: string
  ): 'primary' | 'secondary' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'approved':
        return 'success'
      case 'pending':
        return 'warning'
      case 'rejected':
        return 'error'
      default:
        return 'secondary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'rejected':
        return <XCircle className="h-4 w-4" />
      default:
        return null
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

  const stats = getStats()
  const filteredSubmissions = getFilteredSubmissions()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">My Submissions</h1>
        <p className="text-sm text-text-secondary mt-1">Track the status of your submitted content</p>
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
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-text-secondary">Total</div>
          <div className="text-2xl font-bold text-text-primary mt-1">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-text-secondary">Pending</div>
          <div className="text-2xl font-bold text-warning mt-1">{stats.pending}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-text-secondary">Approved</div>
          <div className="text-2xl font-bold text-success mt-1">{stats.approved}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-text-secondary">Rejected</div>
          <div className="text-2xl font-bold text-error mt-1">{stats.rejected}</div>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
              filterStatus === status
                ? 'bg-primary text-white'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Send className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No submissions</h3>
            <p className="text-sm text-text-secondary">
              {filterStatus === 'all'
                ? 'You have not submitted any content yet'
                : `No ${filterStatus} submissions found`}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((submission) => {
            const isExpanded = expandedRejections.has(submission.id)
            const isActionLoading = actionLoading === submission.id

            return (
              <Card key={submission.id} className="overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-text-primary truncate">
                          {getManifestName(submission.itemData)}
                        </h3>
                        <Badge variant={getStatusBadgeVariant(submission.status)} size="sm">
                          <div className="flex items-center gap-1">
                            {getStatusIcon(submission.status)}
                            <span className="capitalize">{submission.status}</span>
                          </div>
                        </Badge>
                      </div>
                      <p className="text-xs text-text-tertiary capitalize">
                        {submission.manifestType.replace('_', ' ')}
                      </p>
                    </div>

                    <div className="text-xs text-text-tertiary ml-4">
                      {new Date(submission.submittedAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Admin Notes */}
                  {submission.adminNotes && (
                    <div className="mb-3 p-3 bg-bg-secondary rounded-lg">
                      <p className="text-xs font-medium text-text-secondary mb-1">Admin Notes:</p>
                      <p className="text-sm text-text-primary">{submission.adminNotes}</p>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {submission.status === 'rejected' && submission.rejectionReason && (
                    <div className="mb-3">
                      <button
                        onClick={() => toggleRejectionExpanded(submission.id)}
                        className="flex items-center gap-2 w-full p-3 bg-error bg-opacity-10 rounded-lg text-left hover:bg-opacity-20 transition-colors"
                      >
                        <XCircle className="h-4 w-4 text-error flex-shrink-0" />
                        <span className="text-sm font-medium text-error flex-1">
                          Rejection Reason
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-error" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-error" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="mt-2 p-3 bg-bg-secondary rounded-lg">
                          <p className="text-sm text-text-primary">{submission.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setSelectedSubmission(submission)}
                      className="flex-1"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      View Details
                    </Button>

                    {submission.status === 'rejected' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleResubmit(submission.id)}
                        disabled={isActionLoading}
                        className="flex-1"
                      >
                        {isActionLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : (
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Resubmit
                      </Button>
                    )}

                    {submission.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleWithdraw(submission.id)}
                        disabled={isActionLoading}
                      >
                        {isActionLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <XIcon className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Details Modal */}
      {selectedSubmission && (
        <Modal open={true} onClose={() => setSelectedSubmission(null)}>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Submission Details</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-1">Item Name</h3>
              <p className="text-base text-text-primary">{getManifestName(selectedSubmission.itemData)}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-1">Manifest Type</h3>
              <p className="text-base text-text-primary capitalize">
                {selectedSubmission.manifestType.replace('_', ' ')}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-text-secondary mb-1">Item Data</h3>
              <pre className="bg-bg-secondary p-4 rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(selectedSubmission.itemData, null, 2)}
              </pre>
            </div>
          </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default SubmissionReviewPanel
