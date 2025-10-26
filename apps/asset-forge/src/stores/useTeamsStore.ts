/**
 * Teams Store
 * Manages team data and operations
 */

import { create } from 'zustand'
import { createLogger } from '../utils/logger'

const logger = createLogger('TeamsStore')

export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'member'
}

export interface Team {
  id: string
  name: string
  description: string
  memberCount: number
  role: 'owner' | 'admin' | 'member'
  members: TeamMember[]
  createdAt: string
}

interface TeamsState {
  teams: Team[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchTeams: () => Promise<void>
  createTeam: (team: Omit<Team, 'id' | 'createdAt' | 'memberCount' | 'members'>) => Promise<void>
  updateTeam: (id: string, updates: Partial<Team>) => Promise<void>
  deleteTeam: (id: string) => Promise<void>
  inviteMember: (teamId: string, email: string) => Promise<void>
}

export const useTeamsStore = create<TeamsState>((set, get) => ({
  teams: [],
  isLoading: false,
  error: null,

  fetchTeams: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/teams')
      if (!response.ok) throw new Error('Failed to fetch teams')

      const data = await response.json()
      set({ teams: data.teams || [], isLoading: false })
    } catch (error) {
      logger.error('[fetchTeams] Error:', error)
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  createTeam: async (team) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(team)
      })

      if (!response.ok) throw new Error('Failed to create team')

      const newTeam = await response.json()
      set(state => ({
        teams: [...state.teams, newTeam],
        isLoading: false
      }))
    } catch (error) {
      logger.error('[createTeam] Error:', error)
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  updateTeam: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch(`/api/teams/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) throw new Error('Failed to update team')

      const updatedTeam = await response.json()
      set(state => ({
        teams: state.teams.map(t => t.id === id ? updatedTeam : t),
        isLoading: false
      }))
    } catch (error) {
      logger.error('[updateTeam] Error:', error)
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  deleteTeam: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch(`/api/teams/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete team')

      set(state => ({
        teams: state.teams.filter(t => t.id !== id),
        isLoading: false
      }))
    } catch (error) {
      logger.error('[deleteTeam] Error:', error)
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  inviteMember: async (teamId, email) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch(`/api/teams/${teamId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (!response.ok) throw new Error('Failed to invite member')

      // Refresh teams to get updated member count
      await get().fetchTeams()
    } catch (error) {
      logger.error('[inviteMember] Error:', error)
      set({ error: (error as Error).message, isLoading: false })
    }
  }
}))
