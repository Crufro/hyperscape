/**
 * Quest Fix Modal
 * Modal wrapper for fixing quests with AI based on playtester feedback
 */

import { X, Wand2, CheckCircle2, RefreshCw } from 'lucide-react'
import React, { useState } from 'react'

import { API_ENDPOINTS } from '../../config/api'
import { apiFetch } from '../../utils/api'
import type { GeneratedQuest } from '../../types/content-generation'
import type { PlaytestSession } from '../../types/multi-agent'
import { Button } from '../common/Button'
import { Card } from '../common/Card'
import { Modal } from '../common/Modal'

import { QuestFixPreview } from './QuestFixPreview'

interface QuestFixModalProps {
  isOpen: boolean
  onClose: () => void
  quest: GeneratedQuest
  playtestSession: PlaytestSession
  onQuestFixed: (fixedQuest: GeneratedQuest, changes: any[]) => void
  onRetestRequest?: (fixedQuest: GeneratedQuest) => void
}

interface FixResult {
  originalQuest: GeneratedQuest
  fixedQuest: GeneratedQuest
  changes: any[]
  fixedIssues: {
    bugsFixed: any[]
    recommendationsApplied: any[]
  }
  summary: string
  embeddings?: {
    similarQuests: any[]
    contextUsed: boolean
  }
  metadata?: {
    duration: number
    model: string
    temperature: number
  }
}

export const QuestFixModal: React.FC<QuestFixModalProps> = ({
  isOpen,
  onClose,
  quest,
  playtestSession,
  onQuestFixed,
  onRetestRequest
}) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [fixResult, setFixResult] = useState<FixResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateFixes = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      console.log('[QuestFixModal] Generating fixes for quest:', quest.title)

      // Build request payload
      const requestBody = {
        quest: {
          ...quest,
          // Ensure proper format
          objectives: quest.objectives.map((obj) => ({
            id: obj.id,
            type: obj.type,
            description: obj.description,
            target: obj.target,
            quantity: obj.quantity,
            location: obj.location,
            optional: obj.optional || false
          })),
          rewards: {
            experience: quest.rewards.experience || 0,
            gold: quest.rewards.gold || 0,
            items: quest.rewards.items || []
          }
        },
        playtestFindings: {
          grade: playtestSession.report.summary.grade,
          gradeScore: playtestSession.report.summary.gradeScore,
          recommendation: playtestSession.report.summary.recommendation,
          consensus: playtestSession.consensus.summary,
          bugReports: playtestSession.aggregatedMetrics.bugReports,
          recommendations: playtestSession.recommendations,
          qualityMetrics: playtestSession.report.qualityMetrics,
          aggregatedMetrics: playtestSession.aggregatedMetrics,
          summary: playtestSession.report.summary
        },
        fixOptions: {
          useEmbeddings: true,
          temperature: 0.3
        }
      }

      const response = await apiFetch(API_ENDPOINTS.questFixWithAI, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const result = await response.json() as FixResult

      console.log('[QuestFixModal] Fixes generated successfully')
      console.log('[QuestFixModal] Changes:', result.changes.length)
      console.log('[QuestFixModal] Duration:', result.metadata?.duration, 'ms')

      setFixResult(result)
    } catch (err) {
      console.error('[QuestFixModal] Failed to generate fixes:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate quest fixes')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApplyFixes = async () => {
    if (!fixResult) return

    setIsApplying(true)

    try {
      console.log('[QuestFixModal] Applying fixes to quest')

      // Call the onQuestFixed callback with the fixed quest
      onQuestFixed(fixResult.fixedQuest, fixResult.changes)

      // Close modal after successful apply
      setTimeout(() => {
        onClose()
      }, 500)
    } catch (err) {
      console.error('[QuestFixModal] Failed to apply fixes:', err)
      setError(err instanceof Error ? err.message : 'Failed to apply quest fixes')
    } finally {
      setIsApplying(false)
    }
  }

  const handleApplyAndRetest = async () => {
    if (!fixResult) return

    setIsApplying(true)

    try {
      console.log('[QuestFixModal] Applying fixes and re-testing quest')

      // Apply fixes
      onQuestFixed(fixResult.fixedQuest, fixResult.changes)

      // Request re-test if callback provided
      if (onRetestRequest) {
        onRetestRequest(fixResult.fixedQuest)
      }

      // Close modal
      setTimeout(() => {
        onClose()
      }, 500)
    } catch (err) {
      console.error('[QuestFixModal] Failed to apply fixes and retest:', err)
      setError(err instanceof Error ? err.message : 'Failed to apply fixes and retest')
    } finally {
      setIsApplying(false)
    }
  }

  const handleReset = () => {
    setFixResult(null)
    setError(null)
  }

  return (
    <Modal open={isOpen} onClose={onClose} size="full">
      <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Fix Quest with AI</h2>
          <p className="text-sm text-text-tertiary mt-1">
            AI will analyze playtester feedback and suggest improvements
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
        >
          <X size={20} className="text-text-tertiary" />
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="p-4 mb-4 bg-red-500 bg-opacity-10 border-red-500">
          <div className="text-sm text-red-400">{error}</div>
        </Card>
      )}

      {/* Playtester Summary */}
      <Card className="p-4 mb-6">
        <h3 className="font-semibold text-text-primary mb-2">Playtester Feedback Summary</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-text-tertiary">Grade</div>
            <div className="text-lg font-bold text-text-primary">
              {playtestSession.report.summary.grade} ({playtestSession.report.summary.gradeScore}/100)
            </div>
          </div>
          <div>
            <div className="text-xs text-text-tertiary">Bugs Found</div>
            <div className="text-lg font-bold text-red-400">
              {playtestSession.report.issues.total}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-tertiary">Recommendations</div>
            <div className="text-lg font-bold text-orange-400">
              {playtestSession.recommendations.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-tertiary">Completion Rate</div>
            <div className="text-lg font-bold text-text-primary">
              {playtestSession.report.qualityMetrics.completionRate}
            </div>
          </div>
        </div>
      </Card>

      {/* Content */}
      <div className="mb-6">
        {!fixResult && !isGenerating && (
          <Card className="p-8 text-center">
            <Wand2 size={48} className="mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Ready to Fix Your Quest?
            </h3>
            <p className="text-sm text-text-tertiary mb-4">
              AI will analyze the playtester feedback and generate specific improvements to address all
              issues while maintaining your quest's core concept.
            </p>
            <Button onClick={handleGenerateFixes} variant="primary" className="mx-auto">
              <Wand2 size={16} className="mr-2" />
              Generate Fixes
            </Button>
          </Card>
        )}

        {isGenerating && (
          <Card className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">Analyzing Feedback...</h3>
            <p className="text-sm text-text-tertiary">
              AI is reviewing playtester findings and generating fixes
            </p>
          </Card>
        )}

        {fixResult && !isGenerating && (
          <div className="space-y-4">
            <QuestFixPreview
              originalQuest={fixResult.originalQuest}
              fixedQuest={fixResult.fixedQuest}
              changes={fixResult.changes}
              fixedIssues={fixResult.fixedIssues}
              summary={fixResult.summary}
              similarQuests={fixResult.embeddings?.similarQuests}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border-primary">
        <div className="flex items-center gap-2">
          {fixResult && (
            <Button onClick={handleReset} variant="ghost">
              <RefreshCw size={16} className="mr-2" />
              Regenerate
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={onClose} variant="ghost" disabled={isApplying || isGenerating}>
            Cancel
          </Button>

          {fixResult && (
            <>
              <Button
                onClick={handleApplyFixes}
                variant="secondary"
                disabled={isApplying || fixResult.changes.length === 0}
              >
                <CheckCircle2 size={16} className="mr-2" />
                {isApplying ? 'Applying...' : 'Apply Fixes'}
              </Button>

              {onRetestRequest && (
                <Button
                  onClick={handleApplyAndRetest}
                  variant="primary"
                  disabled={isApplying || fixResult.changes.length === 0}
                >
                  <CheckCircle2 size={16} className="mr-2" />
                  {isApplying ? 'Applying...' : 'Apply & Re-test'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      </div>
    </Modal>
  )
}
