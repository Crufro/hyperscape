/**
 * Model Configuration Component
 * Allows admins to configure which AI models are used for different tasks
 */

import React, { useState, useEffect } from 'react'
import { AlertCircle, Check, RefreshCw, Save, X } from 'lucide-react'

interface ModelConfig {
  id: string
  taskType: string
  modelId: string
  provider: string
  temperature: number
  maxTokens: number | null
  displayName: string
  description: string
  pricing: {
    input: number
    output: number
  } | null
  isActive: boolean
  updatedAt: string
}

interface AvailableModel {
  id: string
  name: string
  description: string
  provider: string
  pricing: {
    input: number
    output: number
  } | null
}

export const ModelConfiguration: React.FC = () => {
  const [configurations, setConfigurations] = useState<ModelConfig[]>([])
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [gatewayEnabled, setGatewayEnabled] = useState(false)
  const [editingTask, setEditingTask] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Check gateway status
      const statusRes = await fetch('/api/ai-gateway/status')
      const statusData = await statusRes.json()
      setGatewayEnabled(statusData.enabled)

      // Load current configurations
      const configRes = await fetch('/api/admin/models')
      const configData = await configRes.json()
      setConfigurations(configData.models || [])

      // Load available models if gateway is enabled
      if (statusData.enabled) {
        const modelsRes = await fetch('/api/admin/models/available')
        const modelsData = await modelsRes.json()
        setAvailableModels(modelsData.models || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (taskType: string, modelId: string, temperature: number, maxTokens: number | null) => {
    try {
      setSaving(taskType)
      setError(null)

      const response = await fetch(`/api/admin/models/${taskType}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelId,
          temperature,
          maxTokens,
          isActive: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save configuration')
      }

      await loadData()
      setEditingTask(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(null)
    }
  }

  const formatPrice = (price: number) => {
    return `$${(price * 1000000).toFixed(2)}/1M tokens`
  }

  const getTaskDisplayName = (taskType: string) => {
    const names: Record<string, string> = {
      'prompt-enhancement': 'Prompt Enhancement',
      'image-generation': 'Image Generation',
      'text-generation': 'Text Generation',
      'quest-generation': 'Quest Generation',
      'npc-dialogue': 'NPC Dialogue',
      'lore-writing': 'Lore Writing'
    }
    return names[taskType] || taskType
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading configurations...</span>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">AI Model Configuration</h2>
        <p className="mt-1 text-sm text-gray-600">
          Configure which AI models are used for different tasks across the platform.
        </p>

        {!gatewayEnabled && (
          <div className="mt-4 rounded-md bg-yellow-50 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  AI Gateway Not Enabled
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Set <code className="bg-yellow-100 px-1 rounded">AI_GATEWAY_API_KEY</code> to access all providers and enable model selection.
                    Currently using direct provider access.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-4">
            <div className="flex">
              <X className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {configurations.map((config) => (
          <ModelConfigCard
            key={config.taskType}
            config={config}
            availableModels={availableModels}
            gatewayEnabled={gatewayEnabled}
            isEditing={editingTask === config.taskType}
            isSaving={saving === config.taskType}
            onEdit={() => setEditingTask(config.taskType)}
            onCancel={() => setEditingTask(null)}
            onSave={handleSave}
            getTaskDisplayName={getTaskDisplayName}
            formatPrice={formatPrice}
          />
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={loadData}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>
    </div>
  )
}

interface ModelConfigCardProps {
  config: ModelConfig
  availableModels: AvailableModel[]
  gatewayEnabled: boolean
  isEditing: boolean
  isSaving: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (taskType: string, modelId: string, temperature: number, maxTokens: number | null) => void
  getTaskDisplayName: (taskType: string) => string
  formatPrice: (price: number) => string
}

const ModelConfigCard: React.FC<ModelConfigCardProps> = ({
  config,
  availableModels,
  gatewayEnabled,
  isEditing,
  isSaving,
  onEdit,
  onCancel,
  onSave,
  getTaskDisplayName,
  formatPrice
}) => {
  const [selectedModel, setSelectedModel] = useState(config.modelId)
  const [temperature, setTemperature] = useState(config.temperature)
  const [maxTokens, setMaxTokens] = useState(config.maxTokens || 1000)

  const handleSave = () => {
    onSave(config.taskType, selectedModel, temperature, maxTokens)
  }

  const currentModel = availableModels.find(m => m.id === selectedModel)

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {getTaskDisplayName(config.taskType)}
            </h3>
            {config.description && (
              <p className="mt-1 text-sm text-gray-500">{config.description}</p>
            )}
          </div>
          {!isEditing && (
            <button
              onClick={onEdit}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="px-6 py-4">
        {isEditing ? (
          <div className="space-y-4">
            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Model</label>
              {gatewayEnabled ? (
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  {availableModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({model.id})
                      {model.pricing && ` - ${formatPrice(model.pricing.output)} output`}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="e.g., openai/gpt-4"
                />
              )}
            </div>

            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Temperature: {temperature.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="mt-1 block w-full"
              />
              <p className="mt-1 text-xs text-gray-500">
                Controls randomness. Lower = more focused, Higher = more creative
              </p>
            </div>

            {/* Max Tokens */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Max Tokens</label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="1000"
              />
            </div>

            {/* Pricing Info */}
            {currentModel?.pricing && (
              <div className="rounded-md bg-blue-50 p-3">
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Pricing:</p>
                  <p>Input: {formatPrice(currentModel.pricing.input)}</p>
                  <p>Output: {formatPrice(currentModel.pricing.output)}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={onCancel}
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Current Model</p>
                <p className="mt-1 text-sm text-gray-900 font-mono">{config.modelId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Provider</p>
                <p className="mt-1 text-sm text-gray-900 capitalize">{config.provider}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Temperature</p>
                <p className="mt-1 text-sm text-gray-900">{config.temperature.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Max Tokens</p>
                <p className="mt-1 text-sm text-gray-900">{config.maxTokens || 'Default'}</p>
              </div>
            </div>

            {config.pricing && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-500 mb-2">Pricing</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Input</p>
                    <p className="text-sm text-gray-900">{formatPrice(config.pricing.input)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Output</p>
                    <p className="text-sm text-gray-900">{formatPrice(config.pricing.output)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Last updated: {new Date(config.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ModelConfiguration
