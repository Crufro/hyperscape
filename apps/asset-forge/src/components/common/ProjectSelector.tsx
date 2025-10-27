/**
 * Project Selector Component
 * Dropdown to select active project for asset generation/content creation
 */

import { FolderOpen, Plus, Folder } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Select, Modal, ModalHeader, ModalBody, ModalFooter, Button, Input, Textarea } from '@/components/common'
import { useProjectsStore } from '../../stores/useProjectsStore'
import { usePrivy } from '@privy-io/react-auth'
import { createLogger } from '../../utils/logger'

const logger = createLogger('ProjectSelector')

export interface ProjectSelectorProps {
  selectedProjectId: string | null
  onSelect: (projectId: string | null) => void
  className?: string
  showUnassigned?: boolean
}

export function ProjectSelector({
  selectedProjectId,
  onSelect,
  className,
  showUnassigned = true
}: ProjectSelectorProps) {
  const { user } = usePrivy()
  const { projects, isLoading, fetchProjects, createProject } = useProjectsStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newProject, setNewProject] = useState({ name: '', description: '' })

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    // Auto-select first project if none selected
    if (!selectedProjectId && projects.length > 0 && !showUnassigned) {
      onSelect(projects[0].id)
    }
  }, [projects, selectedProjectId, showUnassigned, onSelect])

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return

    setIsCreating(true)
    try {
      await createProject({
        name: newProject.name,
        description: newProject.description,
        status: 'active',
        userId: user?.id || ''
      })
      setShowCreateModal(false)
      setNewProject({ name: '', description: '' })
      // The newly created project will appear in the list automatically
      logger.info('Project created successfully')
    } catch (error) {
      logger.error('Failed to create project:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  return (
    <div className={className}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-primary flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-primary" />
          Project
          {isLoading && <span className="text-xs text-text-tertiary">(loading...)</span>}
        </label>

        <div className="flex gap-2">
          <div className="flex-1">
            <Select
              value={selectedProjectId || ''}
              onChange={(e) => onSelect(e.target.value || null)}
              className="w-full"
            >
              {showUnassigned && (
                <option value="">
                  No Project (Unassociated)
                </option>
              )}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} ({project.assetCount} assets)
                </option>
              ))}
              {projects.length === 0 && !isLoading && (
                <option value="" disabled>
                  No projects available
                </option>
              )}
            </Select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="gap-2 flex-shrink-0"
            title="Create new project"
          >
            <Plus className="w-4 h-4" />
            New
          </Button>
        </div>

        {selectedProject && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Folder className="w-3 h-3" />
            <span>{selectedProject.description || 'No description'}</span>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} size="md">
        <ModalHeader title="Create New Project" onClose={() => setShowCreateModal(false)} />
        <ModalBody>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Project Name
              </label>
              <Input
                type="text"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                placeholder="Enter project name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newProject.name.trim()) {
                    handleCreateProject()
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Description
              </label>
              <Textarea
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="Enter project description (optional)"
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
              setNewProject({ name: '', description: '' })
            }}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateProject}
            disabled={isCreating || !newProject.name.trim()}
          >
            {isCreating ? 'Creating...' : 'Create Project'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
