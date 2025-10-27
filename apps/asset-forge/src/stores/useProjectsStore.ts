/**
 * Projects Store
 * Manages project data and operations
 */

import { create } from 'zustand'
import { createLogger } from '../utils/logger'

const logger = createLogger('ProjectsStore')

export interface Project {
  id: string
  name: string
  description: string
  assetCount: number
  lastModified: string
  status: 'active' | 'archived'
  createdAt: string
  userId: string
}

interface ProjectsState {
  projects: Project[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchProjects: () => Promise<void>
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'assetCount' | 'lastModified'>) => Promise<void>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/projects')
      if (!response.ok) throw new Error('Failed to fetch projects')

      const data = await response.json()
      set({ projects: data.projects || [], isLoading: false })
    } catch (error) {
      logger.error('[fetchProjects] Error:', error)
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  createProject: async (project) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project)
      })

      if (!response.ok) throw new Error('Failed to create project')

      const newProject = await response.json()
      set(state => ({
        projects: [...state.projects, newProject],
        isLoading: false
      }))
    } catch (error) {
      logger.error('[createProject] Error:', error)
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  updateProject: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) throw new Error('Failed to update project')

      const updatedProject = await response.json()
      set(state => ({
        projects: state.projects.map(p => p.id === id ? updatedProject : p),
        isLoading: false
      }))
    } catch (error) {
      logger.error('[updateProject] Error:', error)
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete project')

      set(state => ({
        projects: state.projects.filter(p => p.id !== id),
        isLoading: false
      }))
    } catch (error) {
      logger.error('[deleteProject] Error:', error)
      set({ error: (error as Error).message, isLoading: false })
    }
  }
}))
