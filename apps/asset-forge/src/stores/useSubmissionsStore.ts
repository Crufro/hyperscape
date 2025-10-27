/**
 * Submissions Store
 * Manages submission statistics and recent submissions
 */

import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import type { ManifestSubmission } from '@/types/manifests'
import { submissionService } from '@/services/SubmissionService'

interface SubmissionsState {
  totalCount: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  isLoading: boolean
  lastUpdated: string | null
  recentSubmissions: ManifestSubmission[]

  // Actions
  loadStats: () => Promise<void>
  loadRecentSubmissions: () => Promise<void>
  refresh: () => Promise<void>
  incrementPending: () => void
  decrementPending: () => void
}

export const useSubmissionsStore = create<SubmissionsState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        totalCount: 0,
        pendingCount: 0,
        approvedCount: 0,
        rejectedCount: 0,
        isLoading: false,
        lastUpdated: null,
        recentSubmissions: [],

        loadStats: async () => {
          set({ isLoading: true })
          try {
            const stats = await submissionService.getStats()
            set({
              totalCount: stats.totalSubmissions,
              pendingCount: stats.pendingSubmissions,
              approvedCount: stats.approvedSubmissions,
              rejectedCount: stats.rejectedSubmissions,
              lastUpdated: new Date().toISOString(),
            })
          } finally {
            set({ isLoading: false })
          }
        },

        loadRecentSubmissions: async () => {
          const submissions = await submissionService.getMySubmissions()
          set({ recentSubmissions: submissions.slice(0, 5) })
        },

        refresh: async () => {
          await Promise.all([get().loadStats(), get().loadRecentSubmissions()])
        },

        incrementPending: () =>
          set((state) => {
            state.pendingCount++
            state.totalCount++
          }),

        decrementPending: () =>
          set((state) => {
            state.pendingCount--
          }),
      }))
    ),
    { name: 'SubmissionsStore' }
  )
)

export default useSubmissionsStore
