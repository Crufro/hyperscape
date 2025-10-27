import React from 'react'
import { Shield } from 'lucide-react'

import { ApprovalDashboard } from '@/components/Admin/ApprovalDashboard'

export const AdminApprovalsPage: React.FC = () => {
  // TODO: Add admin guard when auth is integrated
  // const { isAdmin } = useAuth()
  // if (!isAdmin) return <Navigate to="/dashboard" />

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary bg-opacity-10 rounded-lg">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Content Approvals</h1>
            <p className="text-text-secondary">
              Review and approve community-submitted game content
            </p>
          </div>
        </div>
      </div>

      <ApprovalDashboard />
    </div>
  )
}

export default AdminApprovalsPage
