/**
 * Onboarding Store
 *
 * Zustand store for managing onboarding tours and user progress.
 * Tracks which tours have been completed and provides methods to control tour visibility.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export type TourId =
  | 'asset-generation'
  | 'quest-building'
  | 'armor-fitting'
  | 'voice-generation'

interface OnboardingState {
  // Tour completion tracking
  completedTours: TourId[]

  // Tour dismissal (user chose to skip)
  dismissedTours: TourId[]

  // Active tour state
  activeTour: TourId | null

  // Actions
  markTourComplete: (tourId: TourId) => void
  dismissTour: (tourId: TourId) => void
  shouldShowTour: (tourId: TourId) => boolean
  resetTour: (tourId: TourId) => void
  resetAllTours: () => void
  setActiveTour: (tourId: TourId | null) => void

  // Helpers
  getTourStatus: (tourId: TourId) => 'not-started' | 'completed' | 'dismissed'
  getCompletedCount: () => number
  getTotalTours: () => number
  getProgress: () => number
}

const TOTAL_TOURS = 4

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      completedTours: [],
      dismissedTours: [],
      activeTour: null,

      // Actions
      markTourComplete: (tourId: TourId) => {
        set(draft => {
          if (!draft.completedTours.includes(tourId)) {
            draft.completedTours.push(tourId)
          }
          // Remove from dismissed if present
          draft.dismissedTours = draft.dismissedTours.filter(id => id !== tourId)
          // Clear active tour if it's the one being completed
          if (draft.activeTour === tourId) {
            draft.activeTour = null
          }
        })
      },

      dismissTour: (tourId: TourId) => {
        set(draft => {
          if (!draft.dismissedTours.includes(tourId)) {
            draft.dismissedTours.push(tourId)
          }
          // Clear active tour if it's the one being dismissed
          if (draft.activeTour === tourId) {
            draft.activeTour = null
          }
        })
      },

      shouldShowTour: (tourId: TourId) => {
        const state = get()
        return !state.completedTours.includes(tourId) &&
               !state.dismissedTours.includes(tourId)
      },

      resetTour: (tourId: TourId) => {
        set(draft => {
          draft.completedTours = draft.completedTours.filter(id => id !== tourId)
          draft.dismissedTours = draft.dismissedTours.filter(id => id !== tourId)
        })
      },

      resetAllTours: () => {
        set({
          completedTours: [],
          dismissedTours: [],
          activeTour: null,
        })
      },

      setActiveTour: (tourId: TourId | null) => {
        set({ activeTour: tourId })
      },

      // Helpers
      getTourStatus: (tourId: TourId) => {
        const state = get()
        if (state.completedTours.includes(tourId)) {
          return 'completed'
        }
        if (state.dismissedTours.includes(tourId)) {
          return 'dismissed'
        }
        return 'not-started'
      },

      getCompletedCount: () => {
        return get().completedTours.length
      },

      getTotalTours: () => {
        return TOTAL_TOURS
      },

      getProgress: () => {
        const { completedTours } = get()
        return (completedTours.length / TOTAL_TOURS) * 100
      },
    })),
    {
      name: 'onboarding-store',
      version: 1,
      // Persist all state except active tour
      partialize: state => ({
        completedTours: state.completedTours,
        dismissedTours: state.dismissedTours,
        // Don't persist: activeTour
      }),
    }
  )
)

// Convenience selectors
export const useCompletedTours = () => useOnboardingStore(state => state.completedTours)
export const useDismissedTours = () => useOnboardingStore(state => state.dismissedTours)
export const useActiveTour = () => useOnboardingStore(state => state.activeTour)
export const useOnboardingProgress = () => useOnboardingStore(state => state.getProgress())
