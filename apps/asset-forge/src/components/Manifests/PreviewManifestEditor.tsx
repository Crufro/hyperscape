/**
 * PreviewManifestEditor Component
 * Tabbed interface for managing preview manifest items before submission
 */

import React, { useState, useEffect } from 'react'
import {
  FileEdit,
  Trash2,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react'

import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { Badge } from '@/components/common/Badge'
import type { ManifestType, AnyManifest, ManifestSubmission } from '@/types/manifests'
import { getManifestName } from '@/types/manifests'

// Service placeholder - will be created by another agent
const previewManifestService = {
  getPreviewManifest: async (_userId: string, _type: ManifestType) => ({ items: [] as AnyManifest[] }),
  deleteItem: async (_userId: string, _type: ManifestType, _itemId: string) => {},
  submitItem: async (
    _userId: string,
    _type: ManifestType,
    _itemId: string,
    _itemData: AnyManifest,
    _spriteUrls: string[],
    _imageUrls: string[],
    _modelUrl: string
  ) => ({} as ManifestSubmission),
}

interface TabConfig {
  id: ManifestType | 'all'
  label: string
  type?: ManifestType
}

const TABS: TabConfig[] = [
  { id: 'all', label: 'All' },
  { id: 'items', label: 'Items', type: 'items' },
  { id: 'npcs', label: 'NPCs', type: 'npcs' },
  { id: 'lore', label: 'Lore', type: 'lore' },
  { id: 'quests', label: 'Quests', type: 'quests' },
  { id: 'music', label: 'Music', type: 'music' },
  { id: 'voice', label: 'Voice', type: 'voice' },
  { id: 'sound_effects', label: 'Sound Effects', type: 'sound_effects' },
  { id: 'static_images', label: 'Images', type: 'static_images' },
]

export const PreviewManifestEditor: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ManifestType | 'all'>('all')
  const [items, setItems] = useState<Record<ManifestType, AnyManifest[]>>({} as any)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTeamMode, setIsTeamMode] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  // Placeholder for user ID - in real app would come from auth context
  const userId = 'user-123'

  useEffect(() => {
    loadManifests()
  }, [isTeamMode])

  const loadManifests = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Load all manifest types
      const manifestTypes: ManifestType[] = [
        'items',
        'npcs',
        'lore',
        'quests',
        'music',
        'voice',
        'sound_effects',
        'static_images',
      ]

      const loadedItems: Record<ManifestType, AnyManifest[]> = {} as any

      for (const type of manifestTypes) {
        const result = await previewManifestService.getPreviewManifest(userId, type)
        loadedItems[type] = result.items
      }

      setItems(loadedItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load manifests')
    } finally {
      setIsLoading(false)
    }
  }

  const canSubmit = (item: AnyManifest): boolean => {
    const hasDetails = !!(getManifestName(item) && (item as any).description)

    // Mock asset URLs - in real app would come from item metadata
    const spriteUrls: string[] = []
    const imageUrls: string[] = []
    const modelUrl = ''

    const hasSprites = spriteUrls.length > 0
    const hasImages = imageUrls.length > 0
    const has3dModel = !!modelUrl

    return hasDetails && hasSprites && hasImages && has3dModel
  }

  const getSubmissionStatus = (_item: AnyManifest): 'approved' | 'pending' | 'rejected' | null => {
    // Mock - in real app would check against submission records
    return null
  }

  const handleDelete = async (type: ManifestType, itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      setDeletingId(itemId)
      await previewManifestService.deleteItem(userId, type, itemId)
      await loadManifests()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSubmit = async (type: ManifestType, item: AnyManifest) => {
    if (!canSubmit(item)) {
      alert('This item is missing required assets. Please add sprites, images, and a 3D model.')
      return
    }

    try {
      setSubmittingId(item.id)

      // Mock asset URLs - in real app would come from item metadata
      const spriteUrls: string[] = []
      const imageUrls: string[] = []
      const modelUrl = ''

      await previewManifestService.submitItem(userId, type, item.id, item, spriteUrls, imageUrls, modelUrl)

      alert('Item submitted for review!')
      await loadManifests()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit item')
    } finally {
      setSubmittingId(null)
    }
  }

  const handleEdit = (_type: ManifestType, _item: AnyManifest) => {
    // TODO: Open edit modal
    alert('Edit functionality coming soon')
  }

  const getFilteredItems = (): { type: ManifestType; items: AnyManifest[] }[] => {
    if (activeTab === 'all') {
      return Object.entries(items).map(([type, typeItems]) => ({
        type: type as ManifestType,
        items: typeItems,
      }))
    }

    return [{ type: activeTab, items: items[activeTab] || [] }]
  }

  const getTotalCount = (): number => {
    return Object.values(items).reduce((sum, typeItems) => sum + typeItems.length, 0)
  }

  const getTypeCount = (type: ManifestType): number => {
    return items[type]?.length || 0
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-text-secondary">Loading manifests...</span>
      </div>
    )
  }

  const filteredData = getFilteredItems()
  const totalCount = getTotalCount()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Preview Manifest</h1>
          <p className="text-sm text-text-secondary mt-1">
            Review and submit your game content for approval
          </p>
        </div>

        {/* Team/Individual Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTeamMode(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              !isTeamMode
                ? 'bg-primary text-white'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
            }`}
          >
            Individual
          </button>
          <button
            onClick={() => setIsTeamMode(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isTeamMode
                ? 'bg-primary text-white'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
            }`}
          >
            Team
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg bg-error bg-opacity-10 border border-error p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-error">Error</h3>
              <p className="text-sm text-text-secondary mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {TABS.map((tab) => {
          const count = tab.id === 'all' ? totalCount : getTypeCount(tab.type!)
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-white'
                  : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <Badge
                  variant={activeTab === tab.id ? 'secondary' : 'primary'}
                  size="sm"
                  className={activeTab === tab.id ? 'bg-white bg-opacity-20 text-white' : ''}
                >
                  {count}
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {totalCount === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FileEdit className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No items yet</h3>
            <p className="text-sm text-text-secondary">
              Start creating game content to build your preview manifest
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {filteredData.map(({ type, items: typeItems }) => {
            if (typeItems.length === 0) return null

            return (
              <div key={type}>
                {activeTab === 'all' && (
                  <h2 className="text-lg font-semibold text-text-primary mb-4 capitalize">
                    {type.replace('_', ' ')} ({typeItems.length})
                  </h2>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typeItems.map((item) => {
                    const status = getSubmissionStatus(item)
                    const isDeleting = deletingId === item.id
                    const isSubmitting = submittingId === item.id

                    return (
                      <Card key={item.id} className="p-4 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-text-primary truncate">{getManifestName(item)}</h3>
                            <p className="text-xs text-text-tertiary capitalize mt-0.5">{type}</p>
                          </div>

                          {/* Status Indicator */}
                          {status && (
                            <div className="ml-2 flex-shrink-0">
                              {status === 'approved' && (
                                <CheckCircle className="h-5 w-5 text-success" />
                              )}
                              {status === 'pending' && <Clock className="h-5 w-5 text-warning" />}
                              {status === 'rejected' && <XCircle className="h-5 w-5 text-error" />}
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        {(item as any).description && (
                          <p className="text-sm text-text-secondary line-clamp-2 mb-4">
                            {(item as any).description}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEdit(type, item)}
                            className="flex-1"
                          >
                            <FileEdit className="h-3.5 w-3.5 mr-1.5" />
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDelete(type, item.id)}
                            disabled={isDeleting}
                            className="flex-shrink-0"
                          >
                            {isDeleting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>

                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleSubmit(type, item)}
                            disabled={!canSubmit(item) || isSubmitting || status === 'pending'}
                            className="flex-shrink-0"
                          >
                            {isSubmitting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>

                        {/* Validation Message */}
                        {!canSubmit(item) && !status && (
                          <p className="text-xs text-warning mt-2">
                            Missing required assets (sprites, images, or 3D model)
                          </p>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PreviewManifestEditor
