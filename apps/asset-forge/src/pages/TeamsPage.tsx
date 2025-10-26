/**
 * Teams Page
 * Team collaboration and member management
 */

import { Users2, Plus, Crown, User, Mail, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Badge, Modal, ModalHeader, ModalBody, ModalFooter, Input, Textarea } from '@/components/common'
import { useTeamsStore } from '../stores/useTeamsStore'

export function TeamsPage() {
  const { teams, isLoading, fetchTeams, createTeam } = useTeamsStore()
  const [isCreating, setIsCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTeam, setNewTeam] = useState({ name: '', description: '' })

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary'> = {
      owner: 'default',
      admin: 'default',
      member: 'secondary'
    }
    return <Badge variant={variants[role] || 'secondary'}>{role}</Badge>
  }

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) return

    setIsCreating(true)
    try {
      await createTeam({
        name: newTeam.name,
        description: newTeam.description,
        role: 'owner'
      })
      setShowCreateModal(false)
      setNewTeam({ name: '', description: '' })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-bg-secondary border-b border-border-primary backdrop-blur-md">
        <div className="max-w-[1920px] mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 backdrop-blur-sm">
                <Users2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-text-primary">Teams</h1>
                <p className="text-text-secondary mt-1">Collaborate with your team members on asset projects</p>
              </div>
            </div>
            <Button
              variant="primary"
              className="gap-2"
              onClick={() => setShowCreateModal(true)}
              disabled={isLoading}
            >
              <Plus className="w-4 h-4" />
              Create Team
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-6 py-6">
        {isLoading && teams.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-secondary">Loading teams...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12">
            <Users2 className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <p className="text-text-secondary mb-4">No teams yet. Create your first team to get started!</p>
            <Button
              variant="primary"
              className="gap-2"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="w-4 h-4" />
              Create Team
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {teams.map(team => (
            <Card key={team.id} className="bg-bg-secondary border-border-primary backdrop-blur-md">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Users2 className="w-5 h-5 text-primary" />
                    <CardTitle>{team.name}</CardTitle>
                  </div>
                  {getRoleBadge(team.role)}
                </div>
                <CardDescription>{team.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <User className="w-4 h-4" />
                    <span>{team.memberCount} members</span>
                  </div>

                  {/* Show members for first team only (expandable in real implementation) */}
                  {team.members.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-semibold text-text-primary">Team Members</p>
                      {team.members.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-2 bg-bg-tertiary rounded-lg border border-border-primary">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-text-primary">{member.name}</p>
                              <p className="text-xs text-text-tertiary flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {member.email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {member.role === 'owner' && <Crown className="w-4 h-4 text-warning" />}
                            {member.role === 'admin' && <Shield className="w-4 h-4 text-primary" />}
                            <Badge variant="secondary" className="text-xs">{member.role}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between">
                <Button variant="ghost" size="sm">Manage</Button>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Invite
                </Button>
              </CardFooter>
            </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} size="md">
        <ModalHeader title="Create New Team" onClose={() => setShowCreateModal(false)} />
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Team Name
              </label>
              <Input
                type="text"
                value={newTeam.name}
                onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                placeholder="Enter team name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTeam.name.trim()) {
                    handleCreateTeam()
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Description
              </label>
              <Textarea
                value={newTeam.description}
                onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                placeholder="Enter team description (optional)"
                rows={4}
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => {
              setShowCreateModal(false)
              setNewTeam({ name: '', description: '' })
            }}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateTeam}
            disabled={isCreating || !newTeam.name.trim()}
          >
            {isCreating ? 'Creating...' : 'Create Team'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
