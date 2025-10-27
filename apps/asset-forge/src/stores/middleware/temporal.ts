/**
 * Temporal Middleware Configuration for Zundo
 *
 * Provides centralized configuration for undo/redo functionality
 * using Zundo temporal middleware with Zustand stores.
 *
 * Features:
 * - Configurable history limit (default: 100 actions)
 * - Custom equality checking for state changes
 * - Partialize support for selective state tracking
 * - TypeScript support for temporal state
 */

import type { StateCreator } from 'zustand'
import type { TemporalState } from 'zundo'
import { temporal } from 'zundo'

/**
 * Default configuration for temporal middleware
 */
export interface TemporalConfig<T, PartialT = T> {
  /**
   * Maximum number of history entries to keep
   * @default 100
   */
  limit?: number

  /**
   * Custom equality function to determine if state should be saved
   * @default shallow equality check
   */
  equality?: (pastState: PartialT, currentState: PartialT) => boolean

  /**
   * Function to select which parts of state to track
   * Use this to exclude UI state, loading states, etc.
   */
  partialize?: (state: T) => PartialT

  /**
   * Whether to handle set state synchronously
   * @default false
   */
  handleSet?: never // Not supported in this simplified API
}

/**
 * Create temporal middleware with default configuration
 */
export function createTemporalMiddleware<T>(
  config: StateCreator<T>,
  options: TemporalConfig<T> = {}
) {
  const {
    limit = 100,
    equality,
    partialize
  } = options

  return temporal(config, {
    limit,
    equality,
    partialize
  })
}

/**
 * Default partialize function for common UI state exclusions
 * Excludes common UI/loading state that shouldn't be in undo history
 */
export function defaultPartialize<T extends Record<string, unknown>>(
  excludeKeys: string[]
): (state: T) => Partial<T> {
  return (state: T) => {
    const result: Partial<T> = {}
    for (const key in state) {
      if (!excludeKeys.includes(key)) {
        result[key] = state[key]
      }
    }
    return result
  }
}

/**
 * Common UI state keys to exclude from history
 */
export const COMMON_UI_EXCLUSIONS = [
  // Loading states
  'isLoading',
  'isSaving',
  'isExporting',
  'isFitting',
  'isSavingConfig',
  'isGenerating',

  // Progress states
  'progress',
  'fittingProgress',
  'uploadProgress',

  // Error states
  'error',
  'lastError',
  'errors',

  // UI states
  'showModal',
  'showDialog',
  'showPanel',
  'isOpen',
  'isExpanded',
  'showDebugger',
  'showWireframe',

  // Selection states (often transient)
  'selectedIndex',
  'hoveredItem',
  'focusedItem',

  // Animation states
  'isAnimating',
  'isPlaying',
  'isAnimationPlaying',

  // Filter/search states (often transient)
  'searchTerm',
  'filterText',
  'sortBy',
  'sortDirection'
]

/**
 * Temporal state helper types
 */
export type WithTemporal<T> = T & {
  temporal: TemporalState<T>
}

/**
 * Hook helpers for accessing temporal state
 */
export function useTemporalStore<T>(
  useStore: () => T & { temporal: TemporalState<T> }
) {
  const store = useStore()
  return {
    state: store,
    undo: store.temporal.undo,
    redo: store.temporal.redo,
    clear: store.temporal.clear,
    canUndo: store.temporal.pastStates.length > 0,
    canRedo: store.temporal.futureStates.length > 0,
    pastStates: store.temporal.pastStates,
    futureStates: store.temporal.futureStates
  }
}
