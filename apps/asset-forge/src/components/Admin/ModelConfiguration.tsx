/**
 * Model Configuration Component
 * Allows admins to enable/disable AI models from Vercel AI Gateway
 */

import React, { useState, useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { apiFetch } from '@/utils/api'
import { Button } from '../common/Button'
import { Card } from '../common/Card'
import { Badge } from '../common/Badge'

interface EnabledModel {
  id: string
  modelId: string
  provider: string
  category: string
  displayName: string
  description: string
  tier: string
  capabilities: string[]
  contextWindow: number | null
  maxOutputTokens: number | null
  pricing: {
    input: number
    output: number
    currency: string
  } | null
  isEnabled: boolean
  isRecommended: boolean
  defaultSettings: {
    temperature: number | null
    maxTokens: number | null
  }
  createdAt: string
  updatedAt: string
}

export const ModelConfiguration: React.FC = () => {
  const [models, setModels] = useState<EnabledModel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiFetch('/api/admin/models/enabled/all')
      const data = await response.json()
      setModels(data.models || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (modelId: string, isEnabled: boolean) => {
    try {
      setSaving(modelId)
      setError(null)

      const response = await apiFetch(`/api/admin/models/enabled/${encodeURIComponent(modelId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isEnabled })
      })

      if (!response.ok) {
        throw new Error('Failed to update model')
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(null)
    }
  }

  const formatPrice = (price: number) => {
    return `$${(price * 1000000).toFixed(2)}/1M`
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'text-generation': 'blue',
      'image-generation': 'purple',
      'voice-generation': 'green',
      'embedding': 'orange',
      '3d-generation': 'pink'
    }
    return colors[category] || 'gray'
  }

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      'quality': 'purple',
      'speed': 'green',
      'balanced': 'blue',
      'cost': 'yellow'
    }
    return colors[tier] || 'gray'
  }

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
          <span className="ml-3 text-text-secondary">Loading models...</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">AI Models</h2>
          <p className="text-sm text-text-tertiary mt-1">
            Enable or disable Vercel AI Gateway models
          </p>
        </div>

        <Button
          onClick={loadData}
          variant="ghost"
          className="flex items-center gap-2"
        >
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="p-4 bg-red-500 bg-opacity-10 border-red-500">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="text-red-400" />
            <div>
              <div className="font-semibold text-red-400">Error</div>
              <div className="text-sm text-text-secondary">{error}</div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-0 max-h-[600px] overflow-y-auto">
        <div className="divide-y divide-border">
          {models.map((model) => (
            <div
              key={model.id}
              className="p-4 hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={model.isEnabled}
                  onChange={(e) => handleToggle(model.modelId, e.target.checked)}
                  disabled={saving === model.modelId}
                  className="w-5 h-5 mt-1 text-primary bg-bg-secondary border-border rounded focus:ring-primary focus:ring-2"
                />

                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-text-primary">
                        {model.displayName}
                        {model.isRecommended && (
                          <Badge variant="success" className="ml-2 text-xs">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-text-secondary mt-1">
                        {model.modelId}
                      </div>
                    </div>

                    {saving === model.modelId && (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                    )}
                  </div>

                  {model.description && (
                    <div className="text-xs text-text-tertiary mt-2">
                      {model.description}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {model.category.replace('-', ' ')}
                    </Badge>
                    <Badge variant="secondary" className="text-xs capitalize">
                      {model.tier}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {model.provider}
                    </Badge>
                    {model.pricing && (
                      <>
                        <Badge variant="secondary" className="text-xs">
                          In: {formatPrice(model.pricing.input)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Out: {formatPrice(model.pricing.output)}
                        </Badge>
                      </>
                    )}
                    {model.contextWindow && (
                      <Badge variant="secondary" className="text-xs">
                        {(model.contextWindow / 1000).toFixed(0)}k ctx
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {models.length === 0 && (
          <div className="p-8 text-center text-text-tertiary">
            No models found. Add models using the API.
          </div>
        )}
      </Card>
    </div>
  )
}

export default ModelConfiguration
