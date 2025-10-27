/**
 * Model Selector
 *
 * Dropdown for selecting AI models with cost/quality/speed indicators.
 * Fetches available models from the API based on category.
 */

import { Zap, DollarSign, Sparkles, AlertCircle, Loader2 } from 'lucide-react'
import React, { useState, useEffect } from 'react'

import { MODEL_CATEGORIES, MODEL_TIERS, type AIModel } from '../../config/ai-models'
import { apiFetch } from '../../utils/api'
import { ErrorCodes } from '../../utils/error-messages'

interface ModelSelectorProps {
  selectedModel?: string
  onModelChange: (model: string) => void
  category?: string // e.g., 'text-generation', 'image-generation'
  showRecommendedOnly?: boolean
  showPricing?: boolean
  className?: string
}

interface ModelResponse {
  category: string
  count: number
  models: AIModel[]
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  category = MODEL_CATEGORIES.TEXT_GENERATION,
  showRecommendedOnly = false,
  showPricing = false,
  className = ''
}) => {
  const [models, setModels] = useState<AIModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadModels()
  }, [category, showRecommendedOnly])

  const loadModels = async () => {
    setLoading(true)
    setError(null)

    try {
      const endpoint = showRecommendedOnly
        ? `/api/models/${category}/recommended`
        : `/api/models/${category}`

      console.log(`[ModelSelector] Fetching models from ${endpoint}`)

      const fetchResponse = await apiFetch(endpoint)
      const response: ModelResponse = await fetchResponse.json()

      if (!response.models || response.models.length === 0) {
        console.warn(`[ModelSelector] No models found for category ${category}`)
        setError('No models available for this category')
        setModels([])
        return
      }

      console.log(`[ModelSelector] Loaded ${response.models.length} models`)
      setModels(response.models || [])

      // Auto-select first recommended model if none selected
      if (!selectedModel && response.models.length > 0) {
        const recommended = response.models.find(m => m.isRecommended)
        if (recommended) {
          onModelChange(recommended.id)
        }
      }
    } catch (err) {
      const error = err as Error
      console.error(`[ModelSelector] Failed to load models:`, error.message)

      setError('Failed to load AI models. Using defaults.')
      setModels([])
    } finally {
      setLoading(false)
    }
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case MODEL_TIERS.COST:
        return <DollarSign size={14} className="text-green-400" />
      case MODEL_TIERS.SPEED:
        return <Zap size={14} className="text-blue-400" />
      case MODEL_TIERS.QUALITY:
        return <Sparkles size={14} className="text-purple-400" />
      case MODEL_TIERS.BALANCED:
        return <Sparkles size={14} className="text-yellow-400" />
      default:
        return null
    }
  }

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case MODEL_TIERS.COST:
        return 'Cost-Effective'
      case MODEL_TIERS.SPEED:
        return 'Fast'
      case MODEL_TIERS.QUALITY:
        return 'High Quality'
      case MODEL_TIERS.BALANCED:
        return 'Balanced'
      default:
        return ''
    }
  }

  const formatPricing = (model: AIModel) => {
    if (!model.pricing || !showPricing) return null

    return (
      <span className="text-xs text-text-tertiary">
        ${model.pricing.input.toFixed(2)}/${model.pricing.output.toFixed(2)} per 1M tokens
      </span>
    )
  }

  const selectedModelData = models.find(m => m.id === selectedModel)

  if (loading) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <label className="text-xs font-medium text-text-secondary">AI Model</label>
        <div className="px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-text-tertiary" />
          <span className="text-sm text-text-tertiary">Loading models...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <label className="text-xs font-medium text-text-secondary">AI Model</label>
        <div className="px-3 py-2 bg-bg-secondary border border-border-danger rounded-lg">
          <div className="flex items-center gap-2 text-sm text-text-danger">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
          <button
            onClick={loadModels}
            className="mt-2 text-xs text-primary hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (models.length === 0) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <label className="text-xs font-medium text-text-secondary">AI Model</label>
        <div className="px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg">
          <div className="flex items-center gap-2 text-sm text-text-tertiary">
            <AlertCircle size={14} />
            <span>No models available for {category}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="text-xs font-medium text-text-secondary">AI Model</label>
      <select
        value={selectedModel || ''}
        onChange={(e) => onModelChange(e.target.value)}
        className="px-3 py-2 bg-bg-secondary border border-border-primary rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary"
        disabled={loading || models.length === 0}
      >
        <option value="">Select a model...</option>
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name} • {getTierLabel(model.tier || 'balanced')}
            {model.isRecommended ? ' ⭐' : ''}
            {showPricing && model.pricing ? ` • $${model.pricing.input.toFixed(2)}/$${model.pricing.output.toFixed(2)}` : ''}
          </option>
        ))}
      </select>

      {selectedModelData && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs">
            {getTierIcon(selectedModelData.tier || 'balanced')}
            <span className="text-text-tertiary">{getTierLabel(selectedModelData.tier || 'balanced')}</span>
            {selectedModelData.isRecommended && (
              <span className="text-primary">⭐ Recommended</span>
            )}
          </div>

          {selectedModelData.description && (
            <p className="text-xs text-text-tertiary">{selectedModelData.description}</p>
          )}

          {showPricing && formatPricing(selectedModelData)}

          {selectedModelData.contextWindow && (
            <span className="text-xs text-text-tertiary">
              Context: {selectedModelData.contextWindow.toLocaleString()} tokens
            </span>
          )}
        </div>
      )}
    </div>
  )
}
