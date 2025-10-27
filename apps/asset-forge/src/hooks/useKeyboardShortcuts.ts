/**
 * useKeyboardShortcuts Hook
 *
 * Manages global keyboard shortcuts for navigation and actions.
 * Supports both Cmd (Mac) and Ctrl (Windows/Linux) modifiers.
 */

import { useEffect, useCallback } from 'react'
import { getAllNavItems } from '../config/navigation-config'
import { useNavigationStore } from '../stores/useNavigationStore'

export interface KeyboardShortcut {
  key: string
  ctrlOrCmd?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  action: () => void
  category?: 'navigation' | 'actions' | 'general'
}

interface UseKeyboardShortcutsOptions {
  onOpenSearch?: () => void
  onOpenHelp?: () => void
  enabled?: boolean
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { onOpenSearch, onOpenHelp, enabled = true } = options
  const navigateTo = useNavigationStore(state => state.navigateTo)

  // Build shortcuts from navigation config
  const shortcuts = useCallback((): KeyboardShortcut[] => {
    const navItems = getAllNavItems()
    const navShortcuts: KeyboardShortcut[] = []

    // Navigation shortcuts from config
    for (const item of navItems) {
      if (item.shortcut && item.path) {
        navShortcuts.push({
          key: item.shortcut,
          description: `Go to ${item.label}`,
          action: () => navigateTo(item.path),
          category: 'navigation',
        })
      }
    }

    // Global application shortcuts
    const globalShortcuts: KeyboardShortcut[] = [
      {
        key: 'k',
        ctrlOrCmd: true,
        description: 'Open search',
        action: () => onOpenSearch?.(),
        category: 'general',
      },
      {
        key: '?',
        description: 'Show keyboard shortcuts',
        action: () => onOpenHelp?.(),
        category: 'general',
      },
    ]

    return [...navShortcuts, ...globalShortcuts]
  }, [navigateTo, onOpenSearch, onOpenHelp])

  // Handle keyboard events
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Exception: Cmd/Ctrl+K should work in inputs for search
        if (!(event.key === 'k' && (event.metaKey || event.ctrlKey))) {
          return
        }
      }

      const currentShortcuts = shortcuts()

      for (const shortcut of currentShortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()

        const modifiersMatch =
          (!shortcut.ctrlOrCmd || event.metaKey || event.ctrlKey) &&
          (!shortcut.shift || event.shiftKey) &&
          (!shortcut.alt || event.altKey)

        // For shortcuts with modifiers, ensure modifiers are required
        const hasRequiredModifiers = shortcut.ctrlOrCmd || shortcut.shift || shortcut.alt
        const noExtraModifiers = hasRequiredModifiers ||
          !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)

        if (keyMatches && modifiersMatch && noExtraModifiers) {
          event.preventDefault()
          event.stopPropagation()
          shortcut.action()
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, shortcuts])

  return {
    shortcuts: shortcuts(),
  }
}

/**
 * Get all keyboard shortcuts (for help modal)
 */
export function getAllKeyboardShortcuts(): KeyboardShortcut[] {
  const navItems = getAllNavItems()
  const shortcuts: KeyboardShortcut[] = []

  // Navigation shortcuts
  for (const item of navItems) {
    if (item.shortcut && item.path) {
      shortcuts.push({
        key: item.shortcut,
        description: `Go to ${item.label}`,
        action: () => {},
        category: 'navigation',
      })
    }
  }

  // Global shortcuts
  shortcuts.push(
    {
      key: 'k',
      ctrlOrCmd: true,
      description: 'Open search',
      action: () => {},
      category: 'general',
    },
    {
      key: '?',
      description: 'Show keyboard shortcuts help',
      action: () => {},
      category: 'general',
    }
  )

  return shortcuts
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = []

  if (shortcut.ctrlOrCmd) {
    // Detect if on Mac
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
    parts.push(isMac ? '⌘' : 'Ctrl')
  }

  if (shortcut.shift) {
    parts.push('Shift')
  }

  if (shortcut.alt) {
    parts.push('Alt')
  }

  parts.push(shortcut.key.toUpperCase())

  return parts.join('+')
}
