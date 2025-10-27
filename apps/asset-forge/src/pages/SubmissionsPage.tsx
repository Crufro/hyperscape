import React from 'react'
import { Send } from 'lucide-react'

import { SubmissionReviewPanel } from '@/components/Manifests/SubmissionReviewPanel'

export const SubmissionsPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Send className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Submissions</h1>
        </div>
        <p className="text-text-secondary">
          Track and manage your manifest submissions for approval
        </p>
      </div>

      <SubmissionReviewPanel />
    </div>
  )
}

export default SubmissionsPage
