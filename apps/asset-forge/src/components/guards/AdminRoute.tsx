/**
 * AdminRoute Guard Component
 * Protects admin-only routes by checking user role
 */

import { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { useNavigationStore } from '@/stores/useNavigationStore'
import { apiFetch } from '@/utils/api'
import { Card, CardContent } from '@/components/common'

interface User {
  id: string
  role: 'member' | 'team_leader' | 'admin'
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const navigateTo = useNavigationStore(state => state.navigateTo)

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const response = await apiFetch('/api/users/me')

        if (!response.ok) {
          if (response.status === 401) {
            // Unauthorized - redirect to dashboard
            navigateTo('/dashboard')
            return
          }
          throw new Error('Failed to fetch user data')
        }

        const user = await response.json() as User

        if (user.role !== 'admin') {
          // Not an admin - redirect to dashboard
          navigateTo('/dashboard')
          setIsAdmin(false)
        } else {
          // Is admin - allow access
          setIsAdmin(true)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to verify admin access')
        setIsAdmin(false)
      }
    }

    checkAdminAccess()
  }, [navigateTo])

  // Loading state
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-text-secondary mt-4">Verifying access...</p>
        </div>
      </div>
    )
  }

  // Access denied state
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
        <Card className="bg-bg-secondary border-border-primary max-w-md">
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center">
              <div className="p-4 bg-red-500/10 rounded-full mb-4">
                <AlertCircle className="w-12 h-12 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h2>
              <p className="text-text-secondary mb-6">
                You don't have permission to access this page. Admin access is required.
              </p>
              {error && (
                <p className="text-sm text-red-400 mb-4">{error}</p>
              )}
              <button
                onClick={() => navigateTo('/dashboard')}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
              >
                Return to Dashboard
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User is admin - render children
  return <>{children}</>
}
