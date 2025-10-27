import { Search, ChevronLeft, ChevronRight, AlertCircle, Shield, Users, UserCircle, CheckCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Card, CardContent, CardHeader, CardTitle, Input, Badge, Button } from '@/components/common'
import { apiFetch } from '@/utils/api'
import { useUserStore } from '@/stores/userStore'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'team_leader' | 'member'
  walletAddress?: string
  teamId?: string
  teamName?: string
  createdAt: string
  lastLogin?: string
}

export function UserTable() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roleChangeLoading, setRoleChangeLoading] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Get current user profile to prevent self-demotion
  const currentUserProfile = useUserStore(state => state.profile)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await apiFetch('/api/admin/users')

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()
      setUsers(data.users || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'team_leader' | 'member') => {
    // Prevent self-demotion
    if (currentUserProfile?.id === userId && newRole !== 'admin') {
      setError('You cannot demote yourself from admin')
      setTimeout(() => setError(null), 3000)
      return
    }

    try {
      setRoleChangeLoading(userId)
      setError(null)
      setSuccessMessage(null)

      const response = await apiFetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || data.error || 'Failed to update role')
      }

      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))

      setSuccessMessage(`Role updated successfully`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role')
      setTimeout(() => setError(null), 5000)
    } finally {
      setRoleChangeLoading(null)
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.walletAddress?.toLowerCase().includes(query) ||
      user.teamName?.toLowerCase().includes(query)
    )
  })

  // Paginate filtered users
  const totalPages = Math.ceil(filteredUsers.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="warning" size="sm" className="gap-1"><Shield className="w-3 h-3" />Admin</Badge>
      case 'team_leader':
        return <Badge variant="primary" size="sm" className="gap-1"><Users className="w-3 h-3" />Team Leader</Badge>
      default:
        return <Badge variant="secondary" size="sm" className="gap-1"><UserCircle className="w-3 h-3" />Member</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
          <CheckCircle className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {/* Search and Filters */}
      <Card className="bg-bg-secondary border-border-primary">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, wallet, or team..."
                className="pl-10 w-full"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-text-secondary">Show:</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="bg-bg-tertiary border border-border-primary rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-bg-secondary border-border-primary">
        <CardHeader>
          <CardTitle>
            Users ({filteredUsers.length} {searchQuery ? 'filtered' : 'total'})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center gap-3 text-red-400 p-4">
              <AlertCircle className="w-6 h-6" />
              <div>
                <h3 className="font-semibold">Error Loading Users</h3>
                <p className="text-sm text-text-secondary">{error}</p>
              </div>
            </div>
          ) : loading ? (
            <div className="text-center py-8 text-text-secondary">Loading users...</div>
          ) : paginatedUsers.length === 0 ? (
            <div className="text-center py-8 text-text-secondary">
              {searchQuery ? 'No users found matching your search' : 'No users yet'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-primary">
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Role</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Wallet</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Team</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-text-secondary">Created</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-text-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user) => (
                      <tr key={user.id} className="border-b border-border-primary hover:bg-bg-tertiary transition-colors">
                        <td className="py-3 px-4 text-sm font-medium text-text-primary">{user.name}</td>
                        <td className="py-3 px-4 text-sm text-text-primary">{user.email}</td>
                        <td className="py-3 px-4">
                          {getRoleBadge(user.role)}
                        </td>
                        <td className="py-3 px-4">
                          {user.walletAddress ? (
                            <code className="text-xs text-blue-400">
                              {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                            </code>
                          ) : (
                            <span className="text-sm text-text-tertiary italic">None</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-text-primary">
                          {user.teamName || <span className="text-text-tertiary italic">No team</span>}
                        </td>
                        <td className="py-3 px-4 text-sm text-text-secondary">{formatDate(user.createdAt)}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {user.role !== 'admin' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRoleChange(user.id, 'admin')}
                                disabled={roleChangeLoading === user.id}
                                className="text-xs"
                              >
                                <Shield className="w-3 h-3 mr-1" />
                                Make Admin
                              </Button>
                            )}
                            {user.role !== 'team_leader' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRoleChange(user.id, 'team_leader')}
                                disabled={roleChangeLoading === user.id}
                                className="text-xs"
                              >
                                <Users className="w-3 h-3 mr-1" />
                                Make Team Leader
                              </Button>
                            )}
                            {user.role !== 'member' && user.id !== currentUserProfile?.id && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRoleChange(user.id, 'member')}
                                disabled={roleChangeLoading === user.id}
                                className="text-xs"
                              >
                                <UserCircle className="w-3 h-3 mr-1" />
                                Make Member
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-primary">
                  <div className="text-sm text-text-secondary">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg bg-bg-tertiary text-text-primary hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="text-sm text-text-secondary">
                      Page {currentPage} of {totalPages}
                    </div>

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg bg-bg-tertiary text-text-primary hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
