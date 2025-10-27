/**
 * Bulk Actions Bar Component
 * Sticky bar at bottom showing selected count and action buttons
 * Supports confirmation modals for destructive actions
 */

import React, { useState } from 'react'
import { X, Trash2, Download, Archive, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Modal'

export interface BulkAction {
  label: string
  icon: React.ReactNode
  onClick: () => Promise<void>
  variant?: 'primary' | 'secondary' | 'danger'
  requiresConfirmation?: boolean
  confirmationTitle?: string
  confirmationMessage?: string
}

export interface BulkActionsBarProps {
  selectedCount: number
  onClearSelection: () => void
  actions?: BulkAction[]
  isLoading?: boolean
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  actions = [],
  isLoading = false,
}: BulkActionsBarProps) {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingAction, setPendingAction] = useState<BulkAction | null>(null)
  const [executing, setExecuting] = useState(false)

  if (selectedCount === 0) {
    return null
  }

  const handleActionClick = (action: BulkAction) => {
    if (action.requiresConfirmation) {
      setPendingAction(action)
      setShowConfirmation(true)
    } else {
      executeAction(action)
    }
  }

  const executeAction = async (action: BulkAction) => {
    try {
      setExecuting(true)
      await action.onClick()
      setShowConfirmation(false)
      setPendingAction(null)
    } catch (error) {
      console.error('Bulk action failed:', error)
    } finally {
      setExecuting(false)
    }
  }

  const handleConfirm = () => {
    if (pendingAction) {
      executeAction(pendingAction)
    }
  }

  const handleCancel = () => {
    setShowConfirmation(false)
    setPendingAction(null)
  }

  return (
    <>
      {/* Sticky Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-bg-secondary border-t border-border-primary shadow-2xl backdrop-blur-md animate-slide-in-bottom">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Selected Count */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-text-primary font-semibold">
                  {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
                </span>
              </div>
              <Button
                onClick={onClearSelection}
                variant="ghost"
                size="sm"
                disabled={isLoading || executing}
              >
                <X size={16} className="mr-1" />
                Clear
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  onClick={() => handleActionClick(action)}
                  variant={action.variant || 'secondary'}
                  size="sm"
                  disabled={isLoading || executing}
                >
                  {executing ? (
                    <Loader2 size={16} className="mr-1 animate-spin" />
                  ) : (
                    <>{action.icon}</>
                  )}
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && pendingAction && (
        <Modal
          open={showConfirmation}
          onClose={handleCancel}
        >
          <div className="space-y-4 p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {pendingAction.confirmationTitle || 'Confirm Action'}
            </h2>
            <div className="flex items-start gap-3 p-4 bg-warning bg-opacity-10 border border-warning border-opacity-30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-text-primary">
                  {pendingAction.confirmationMessage ||
                    `Are you sure you want to perform this action on ${selectedCount} ${
                      selectedCount === 1 ? 'item' : 'items'
                    }?`}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={handleCancel} variant="secondary" disabled={executing}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                variant={pendingAction.variant === 'danger' ? 'danger' : 'primary'}
                disabled={executing}
              >
                {executing ? (
                  <>
                    <Loader2 size={16} className="mr-1 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm'
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

// Pre-configured action creators for common operations
export const createDeleteAction = (onDelete: () => Promise<void>): BulkAction => ({
  label: 'Delete',
  icon: <Trash2 size={16} className="mr-1" />,
  onClick: onDelete,
  variant: 'danger',
  requiresConfirmation: true,
  confirmationTitle: 'Delete Items',
  confirmationMessage: 'This action cannot be undone. Are you sure you want to delete the selected items?',
})

export const createExportAction = (onExport: () => Promise<void>): BulkAction => ({
  label: 'Export',
  icon: <Download size={16} className="mr-1" />,
  onClick: onExport,
  variant: 'secondary',
})

export const createArchiveAction = (onArchive: () => Promise<void>): BulkAction => ({
  label: 'Archive',
  icon: <Archive size={16} className="mr-1" />,
  onClick: onArchive,
  variant: 'secondary',
  requiresConfirmation: true,
  confirmationTitle: 'Archive Items',
  confirmationMessage: 'Archived items can be restored later. Continue?',
})
