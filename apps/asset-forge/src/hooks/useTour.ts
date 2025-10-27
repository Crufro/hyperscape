/**
 * useTour Hook
 *
 * Custom hook for managing Driver.js tours with automatic initialization,
 * completion tracking, and localStorage persistence via Zustand store.
 */

import { useEffect, useRef, useCallback } from 'react'
import { driver, type Driver } from 'driver.js'
import 'driver.js/dist/driver.css'

import { useOnboardingStore, type TourId } from '../stores/useOnboardingStore'
import { tours, TOUR_CONFIG, type TourKey } from '../config/tours'
import { useNavigation } from '../contexts/NavigationContext'
import { NAVIGATION_VIEWS } from '../constants/navigation'
import type { NavigationView } from '../types/navigation'

interface UseTourOptions {
  tourId: TourId
  autoStart?: boolean
  delay?: number // ms to wait before auto-starting
  onComplete?: () => void
  onSkip?: () => void
}

interface UseTourReturn {
  startTour: () => void
  isActive: boolean
  driverInstance: Driver | null
}

export function useTour({
  tourId,
  autoStart = true,
  delay = 500,
  onComplete,
  onSkip,
}: UseTourOptions): UseTourReturn {
  const driverRef = useRef<Driver | null>(null)
  const isActiveRef = useRef(false)
  const hasStartedRef = useRef(false)

  const { shouldShowTour, markTourComplete, dismissTour, setActiveTour } = useOnboardingStore()

  // Get tour configuration
  const tourConfig = tours[tourId as TourKey]

  // Initialize Driver.js instance
  useEffect(() => {
    if (!tourConfig) {
      console.warn(`[useTour] Tour "${tourId}" not found in tour configurations`)
      return
    }

    // Create driver instance with custom config
    const driverInstance = driver({
      ...TOUR_CONFIG,
      steps: tourConfig.steps,
      onDestroyed: () => {
        isActiveRef.current = false
        setActiveTour(null)
      },
      onDestroyStarted: () => {
        // User closed/skipped the tour
        if (isActiveRef.current && !driverInstance.isLastStep()) {
          dismissTour(tourId)
          onSkip?.()
        }
      },
      onPopoverRender: (popover, { config, state }) => {
        // Add custom styling or behavior to popover
        const currentStep = state.activeIndex! + 1
        const totalSteps = config.steps!.length

        // Add progress indicator
        const progressBar = popover.wrapper.querySelector('.driver-popover-progress-text')
        if (progressBar) {
          progressBar.textContent = `Step ${currentStep} of ${totalSteps}`
        }

        // On last step, trigger completion
        if (currentStep === totalSteps) {
          const nextButton = popover.nextButton
          if (nextButton) {
            const originalOnClick = nextButton.onclick
            nextButton.onclick = (e) => {
              markTourComplete(tourId)
              setActiveTour(null)
              onComplete?.()
              if (originalOnClick) {
                originalOnClick.call(nextButton, e)
              }
            }
          }
        }
      },
    })

    driverRef.current = driverInstance

    return () => {
      if (driverRef.current) {
        driverRef.current.destroy()
        driverRef.current = null
      }
    }
  }, [tourId, tourConfig, markTourComplete, dismissTour, setActiveTour, onComplete, onSkip])

  // Start tour function
  const startTour = useCallback(() => {
    if (!driverRef.current) {
      console.warn('[useTour] Driver instance not initialized')
      return
    }

    if (isActiveRef.current) {
      console.log('[useTour] Tour already active')
      return
    }

    isActiveRef.current = true
    hasStartedRef.current = true
    setActiveTour(tourId)
    driverRef.current.drive()
  }, [tourId, setActiveTour])

  // Auto-start tour if enabled and not yet completed
  useEffect(() => {
    if (!autoStart || !tourConfig || hasStartedRef.current) {
      return
    }

    // Check if tour should be shown
    if (!shouldShowTour(tourId)) {
      console.log(`[useTour] Skipping tour "${tourId}" - already completed or dismissed`)
      return
    }

    // Delay tour start to ensure DOM is ready
    const timer = setTimeout(() => {
      // Double-check all elements exist before starting
      const missingElements: string[] = []
      tourConfig.steps.forEach((step, index) => {
        if (step.element && typeof step.element === 'string') {
          const element = document.querySelector(step.element)
          if (!element) {
            missingElements.push(`Step ${index + 1}: ${step.element}`)
          }
        }
      })

      if (missingElements.length > 0) {
        console.warn(
          `[useTour] Skipping tour "${tourId}" - missing elements:`,
          missingElements
        )
        return
      }

      startTour()
    }, delay)

    return () => clearTimeout(timer)
  }, [tourId, autoStart, delay, shouldShowTour, startTour, tourConfig])

  return {
    startTour,
    isActive: isActiveRef.current,
    driverInstance: driverRef.current,
  }
}

// Map tour IDs to their corresponding navigation views
const TOUR_TO_VIEW_MAP: Record<TourId, NavigationView> = {
  'asset-generation': NAVIGATION_VIEWS.GENERATION,
  'quest-building': NAVIGATION_VIEWS.CONTENT_QUESTS,
  'armor-fitting': NAVIGATION_VIEWS.ARMOR_FITTING,
  'voice-generation': NAVIGATION_VIEWS.VOICE,
}

// Helper hook to manually trigger tours
export function useManualTour() {
  const { shouldShowTour, markTourComplete, dismissTour, setActiveTour } = useOnboardingStore()
  const { navigateTo } = useNavigation()

  const startManualTour = useCallback(
    (tourId: TourId, onComplete?: () => void, onSkip?: () => void) => {
      const tourConfig = tours[tourId as TourKey]
      if (!tourConfig) {
        console.warn(`[useManualTour] Tour "${tourId}" not found`)
        return
      }

      // Navigate to the correct page for this tour
      const targetView = TOUR_TO_VIEW_MAP[tourId]
      if (targetView) {
        console.log(`[useManualTour] Navigating to ${targetView} for tour "${tourId}"`)
        navigateTo(targetView)
      }

      // Wait longer for navigation and page mounting
      setTimeout(() => {
        console.log(`[useManualTour] Starting tour "${tourId}" after navigation delay`)

        // Check if first element exists before starting
        const firstStep = tourConfig.steps.find(step => step.element)
        if (firstStep && firstStep.element && typeof firstStep.element === 'string') {
          const element = document.querySelector(firstStep.element)
          if (!element) {
            console.error(`[useManualTour] Cannot start tour "${tourId}" - first element not found: ${firstStep.element}`)
            alert(`Cannot start tour - please make sure you're on the correct page and try again.`)
            return
          }
        }

        const driverInstance = driver({
          ...TOUR_CONFIG,
          allowClose: true,
          overlayOpacity: 0.3,
          stagePadding: 8,
          stageRadius: 10,
          popoverClass: 'driver-popover-custom',
          onCloseClick: () => {
            console.log(`[useManualTour] User clicked close on tour "${tourId}"`)
            dismissTour(tourId)
            driverInstance.destroy()
          },
          steps: tourConfig.steps,
          onDestroyed: () => {
            console.log(`[useManualTour] Tour "${tourId}" destroyed`)
            setActiveTour(null)
          },
          onDestroyStarted: () => {
            console.log(`[useManualTour] Tour "${tourId}" destroy started, isLastStep: ${driverInstance.isLastStep()}`)
            const isLast = driverInstance.isLastStep()
            if (isLast) {
              // User completed the tour
              markTourComplete(tourId)
              onComplete?.()
            } else {
              // User skipped/closed the tour
              dismissTour(tourId)
              onSkip?.()
            }
          },
        })

        setActiveTour(tourId)
        driverInstance.drive()
      }, 2000) // Wait 2 seconds for navigation and page to fully mount
    },
    [markTourComplete, dismissTour, setActiveTour, navigateTo]
  )

  return {
    startManualTour,
    shouldShowTour,
  }
}
