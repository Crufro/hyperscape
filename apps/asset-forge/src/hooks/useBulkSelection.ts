/**
 * Bulk Selection Hook
 * Provides reusable selection state management for bulk operations
 * Uses Set for O(1) lookup performance
 */

import { useState, useCallback } from 'react'

export interface UseBulkSelectionReturn<T extends string = string> {
  selectedIds: Set<T>
  isSelected: (id: T) => boolean
  toggleSelection: (id: T) => void
  selectAll: (ids: T[]) => void
  clearSelection: () => void
  selectedCount: number
  selectRange: (startId: T, endId: T, allIds: T[]) => void
}

export function useBulkSelection<T extends string = string>(): UseBulkSelectionReturn<T> {
  const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set())

  const isSelected = useCallback(
    (id: T): boolean => {
      return selectedIds.has(id)
    },
    [selectedIds]
  )

  const toggleSelection = useCallback((id: T) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectAll = useCallback((ids: T[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const selectRange = useCallback(
    (startId: T, endId: T, allIds: T[]) => {
      const startIndex = allIds.indexOf(startId)
      const endIndex = allIds.indexOf(endId)

      if (startIndex === -1 || endIndex === -1) {
        return
      }

      const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex]
      const rangeIds = allIds.slice(from, to + 1)

      setSelectedIds((prev) => {
        const next = new Set(prev)
        rangeIds.forEach((id) => next.add(id))
        return next
      })
    },
    []
  )

  return {
    selectedIds,
    isSelected,
    toggleSelection,
    selectAll,
    clearSelection,
    selectedCount: selectedIds.size,
    selectRange,
  }
}
