/**
 * AIContextSettings Component
 * Configure which content sources are included in AI context
 */

import React, { useState, useEffect } from 'react'
import { Brain, Save, RotateCcw, Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react'

import { Button } from '@/components/common/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { Checkbox } from '@/components/common/Checkbox'
import { RangeInput } from '@/components/common/RangeInput'
import type { AIContextPreferences } from '@/types/manifests'

// Service placeholder - will be created by another agent
const aiContextService = {
  getPreferences: async (_userId: string) =>
    ({
      id: '1',
      userId: 'user-123',
      useOwnPreview: true,
      useCdnContent: true,
      useTeamPreview: false,
      useAllSubmissions: false,
      maxContextItems: 100,
      preferRecent: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as AIContextPreferences),
  updatePreferences: async (_userId: string, _prefs: Partial<AIContextPreferences>) => {},
  getContextPreview: async (_userId: string) => ({
    estimatedItems: 0,
    sourcesEnabled: 0,
    lastUpdated: new Date().toISOString(),
  }),
}

export const AIContextSettings: React.FC = () => {
  const [preferences, setPreferences] = useState<AIContextPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [contextPreview, setContextPreview] = useState({
    estimatedItems: 0,
    sourcesEnabled: 0,
    lastUpdated: new Date().toISOString(),
  })

  // Placeholder for user ID - in real app would come from auth context
  const userId = 'user-123'

  // Placeholder for team membership
  const isInTeam = false

  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [prefs, preview] = await Promise.all([
        aiContextService.getPreferences(userId),
        aiContextService.getContextPreview(userId),
      ])

      setPreferences(prefs)
      setContextPreview(preview)
      setHasUnsavedChanges(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preferences')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!preferences) return

    try {
      setIsSaving(true)
      setError(null)
      setSuccessMessage(null)

      await aiContextService.updatePreferences(userId, preferences)

      setSuccessMessage('Settings saved successfully!')
      setHasUnsavedChanges(false)

      // Refresh preview
      const preview = await aiContextService.getContextPreview(userId)
      setContextPreview(preview)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Reset to default settings?')) return
    await loadPreferences()
  }

  const updatePreference = <K extends keyof AIContextPreferences>(
    key: K,
    value: AIContextPreferences[K]
  ) => {
    if (!preferences) return

    setPreferences({ ...preferences, [key]: value })
    setHasUnsavedChanges(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-text-secondary">Loading settings...</span>
      </div>
    )
  }

  if (!preferences) {
    return (
      <div className="p-12 text-center text-text-secondary">Failed to load preferences</div>
    )
  }

  const sourcesEnabled =
    [
      preferences.useOwnPreview,
      preferences.useCdnContent,
      preferences.useTeamPreview,
      preferences.useAllSubmissions,
    ].filter(Boolean).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary bg-opacity-10 rounded-lg">
          <Brain className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">AI Context Settings</h1>
          <p className="text-sm text-text-secondary">
            Configure which content sources are included when generating with AI
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-lg bg-error bg-opacity-10 border border-error p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-error">Error</h3>
              <p className="text-sm text-text-secondary mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="rounded-lg bg-success bg-opacity-10 border border-success p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-success">Success</h3>
              <p className="text-sm text-text-secondary mt-1">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <div className="rounded-lg bg-warning bg-opacity-10 border border-warning p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-sm text-text-primary">You have unsaved changes</p>
          </div>
        </div>
      )}

      {/* Content Sources */}
      <Card>
        <CardHeader>
          <CardTitle>Content Sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="ownPreview"
              checked={preferences.useOwnPreview}
              onChange={(e) => updatePreference('useOwnPreview', e.target.checked)}
            />
            <div className="flex-1">
              <label
                htmlFor="ownPreview"
                className="text-sm font-medium text-text-primary cursor-pointer"
              >
                My Preview Manifest
              </label>
              <p className="text-xs text-text-secondary mt-0.5">
                Include content from your personal preview manifest
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="cdnContent"
              checked={preferences.useCdnContent}
              onChange={(e) => updatePreference('useCdnContent', e.target.checked)}
            />
            <div className="flex-1">
              <label
                htmlFor="cdnContent"
                className="text-sm font-medium text-text-primary cursor-pointer"
              >
                Approved Game Content (CDN)
              </label>
              <p className="text-xs text-text-secondary mt-0.5">
                Include all approved and published game content
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="teamPreview"
              checked={preferences.useTeamPreview}
              onChange={(e) => updatePreference('useTeamPreview', e.target.checked)}
              disabled={!isInTeam}
            />
            <div className="flex-1">
              <label
                htmlFor="teamPreview"
                className={`text-sm font-medium cursor-pointer ${
                  isInTeam ? 'text-text-primary' : 'text-text-tertiary'
                }`}
              >
                Team Preview Content
              </label>
              <p className="text-xs text-text-secondary mt-0.5">
                {isInTeam
                  ? 'Include content from your team members'
                  : 'Join a team to enable this option'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="allSubmissions"
              checked={preferences.useAllSubmissions}
              onChange={(e) => updatePreference('useAllSubmissions', e.target.checked)}
            />
            <div className="flex-1">
              <label
                htmlFor="allSubmissions"
                className="text-sm font-medium text-text-primary cursor-pointer"
              >
                All Pending Submissions
              </label>
              <p className="text-xs text-text-secondary mt-0.5">
                Include all community submissions (pending approval)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Context Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Context Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium text-text-primary mb-2 block">
              Max Items: {preferences.maxContextItems}
            </label>
            <RangeInput
              min={10}
              max={500}
              step={10}
              value={preferences.maxContextItems}
              onChange={(e) => updatePreference('maxContextItems', parseInt(e.target.value, 10))}
            />
            <p className="text-xs text-text-secondary mt-2">
              Maximum number of items to include in AI context
            </p>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="preferRecent"
              checked={preferences.preferRecent}
              onChange={(e) => updatePreference('preferRecent', e.target.checked)}
            />
            <div className="flex-1">
              <label
                htmlFor="preferRecent"
                className="text-sm font-medium text-text-primary cursor-pointer"
              >
                Prefer Recent Content
              </label>
              <p className="text-xs text-text-secondary mt-0.5">
                Prioritize recently created or updated content
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Context Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4 w-4 text-text-tertiary" />
            Context Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-text-secondary">Estimated Items</div>
              <div className="text-2xl font-bold text-text-primary mt-1">
                {contextPreview.estimatedItems}
              </div>
            </div>
            <div>
              <div className="text-sm text-text-secondary">Sources Enabled</div>
              <div className="text-2xl font-bold text-text-primary mt-1">{sourcesEnabled} / 4</div>
            </div>
            <div>
              <div className="text-sm text-text-secondary">Last Updated</div>
              <div className="text-sm text-text-primary mt-1">
                {new Date(contextPreview.lastUpdated).toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!hasUnsavedChanges || isSaving}
          className="flex-1 sm:flex-none"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>

        <Button
          variant="secondary"
          onClick={handleReset}
          disabled={isSaving}
          className="flex-1 sm:flex-none"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>
    </div>
  )
}

export default AIContextSettings
