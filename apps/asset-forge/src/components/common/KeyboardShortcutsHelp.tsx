/**
 * KeyboardShortcutsHelp Modal
 *
 * Displays all available keyboard shortcuts organized by category.
 * Opened with the '?' key.
 */

import { X, Keyboard } from 'lucide-react'
import { useEffect } from 'react'

import type { KeyboardShortcut } from '../../hooks/useKeyboardShortcuts'
import { getAllKeyboardShortcuts, formatShortcut } from '../../hooks/useKeyboardShortcuts'

interface KeyboardShortcutsHelpProps {
  isOpen: boolean
  onClose: () => void
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const shortcuts = getAllKeyboardShortcuts()

  // Group shortcuts by category
  const generalShortcuts = shortcuts.filter(s => s.category === 'general')
  const navigationShortcuts = shortcuts.filter(s => s.category === 'navigation')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-bg-primary border border-border-primary rounded-lg shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-primary bg-gradient-to-r from-primary from-opacity-5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary bg-opacity-10 rounded-lg">
              <Keyboard size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">Keyboard Shortcuts</h2>
              <p className="text-sm text-text-secondary mt-0.5">
                Navigate faster with these shortcuts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
            aria-label="Close shortcuts help"
          >
            <X size={20} className="text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
          {/* General Shortcuts */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
              General
            </h3>
            <div className="space-y-2">
              {generalShortcuts.map((shortcut, index) => (
                <ShortcutRow key={index} shortcut={shortcut} />
              ))}
            </div>
          </div>

          {/* Navigation Shortcuts */}
          {navigationShortcuts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
                Navigation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {navigationShortcuts.map((shortcut, index) => (
                  <ShortcutRow key={index} shortcut={shortcut} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-primary bg-bg-secondary bg-opacity-50">
          <p className="text-xs text-text-tertiary text-center">
            Press <kbd className="px-2 py-1 bg-bg-tertiary rounded text-text-secondary border border-border-primary">ESC</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}

interface ShortcutRowProps {
  shortcut: KeyboardShortcut
}

function ShortcutRow({ shortcut }: ShortcutRowProps) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-bg-secondary transition-colors">
      <span className="text-sm text-text-primary">{shortcut.description}</span>
      <kbd className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-bg-tertiary rounded-md text-xs font-mono text-text-primary border border-border-primary shadow-sm">
        {formatShortcut(shortcut)}
      </kbd>
    </div>
  )
}
