/**
 * Quest Fix Preview
 * Shows side-by-side comparison of original vs fixed quest with detailed changelog
 */

import { AlertCircle, CheckCircle2, Info, ArrowRight } from 'lucide-react'
import React, { useState } from 'react'

import type { GeneratedQuest } from '../../types/content-generation'
import { Badge } from '../common/Badge'
import { Card } from '../common/Card'

interface QuestChange {
  field: string
  before: string
  after: string
  reason: string
  addresses?: string[]
}

interface FixedIssue {
  severity?: 'critical' | 'major' | 'minor'
  priority?: 'critical' | 'high' | 'medium'
  description: string
  resolution: string
}

interface QuestFixPreviewProps {
  originalQuest: GeneratedQuest
  fixedQuest: GeneratedQuest
  changes: QuestChange[]
  fixedIssues: {
    bugsFixed: FixedIssue[]
    recommendationsApplied: FixedIssue[]
  }
  summary: string
  similarQuests?: Array<{ id: string; similarity: number; preview: string }>
}

export const QuestFixPreview: React.FC<QuestFixPreviewProps> = ({
  originalQuest,
  fixedQuest,
  changes,
  fixedIssues,
  summary,
  similarQuests = []
}) => {
  const [selectedChanges, setSelectedChanges] = useState<Set<number>>(
    new Set(changes.map((_, idx) => idx))
  )

  const toggleChange = (index: number) => {
    const newSelected = new Set(selectedChanges)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedChanges(newSelected)
  }

  const toggleAll = () => {
    if (selectedChanges.size === changes.length) {
      setSelectedChanges(new Set())
    } else {
      setSelectedChanges(new Set(changes.map((_, idx) => idx)))
    }
  }

  const getFieldLabel = (field: string): string => {
    const parts = field.split('.')
    if (field.includes('objectives')) {
      const match = field.match(/objectives\[(\d+)\]\.(.+)/)
      if (match) {
        return `Objective ${parseInt(match[1]) + 1}: ${match[2]}`
      }
    }
    if (field.includes('rewards')) {
      return `Rewards: ${parts[parts.length - 1]}`
    }
    return parts[parts.length - 1] || field
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="p-4 bg-blue-500 bg-opacity-10 border-blue-500">
        <div className="flex items-start gap-2">
          <Info size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-blue-400 mb-1">AI Fix Summary</div>
            <div className="text-sm text-text-secondary">{summary}</div>
          </div>
        </div>
      </Card>

      {/* Fixed Issues Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-xs text-text-tertiary mb-1">Bugs Fixed</div>
          <div className="text-2xl font-bold text-green-400">
            {fixedIssues.bugsFixed?.length || 0}
          </div>
          {fixedIssues.bugsFixed && fixedIssues.bugsFixed.length > 0 && (
            <div className="mt-2 space-y-1">
              {fixedIssues.bugsFixed.slice(0, 3).map((bug, idx) => (
                <div key={idx} className="text-xs">
                  <Badge variant="success" className="text-xs mr-1">
                    {bug.severity}
                  </Badge>
                  <span className="text-text-tertiary">{bug.description.substring(0, 40)}...</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="text-xs text-text-tertiary mb-1">Recommendations Applied</div>
          <div className="text-2xl font-bold text-blue-400">
            {fixedIssues.recommendationsApplied?.length || 0}
          </div>
          {fixedIssues.recommendationsApplied && fixedIssues.recommendationsApplied.length > 0 && (
            <div className="mt-2 space-y-1">
              {fixedIssues.recommendationsApplied.slice(0, 3).map((rec, idx) => (
                <div key={idx} className="text-xs">
                  <Badge variant="secondary" className="text-xs mr-1">
                    {rec.priority}
                  </Badge>
                  <span className="text-text-tertiary">
                    {rec.description.substring(0, 40)}...
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Similar Quests Used for Context */}
      {similarQuests.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold text-text-primary mb-2">
            AI Used {similarQuests.length} Similar Successful Quests for Reference
          </h4>
          <div className="space-y-2">
            {similarQuests.map((quest, idx) => (
              <div key={idx} className="text-sm">
                <Badge variant="secondary" className="text-xs mr-2">
                  {Math.round(quest.similarity * 100)}% relevant
                </Badge>
                <span className="text-text-tertiary">{quest.preview}...</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Changes List */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-text-primary">
            Changes Made ({changes.length})
          </h4>
          <button
            onClick={toggleAll}
            className="text-sm text-primary hover:underline"
          >
            {selectedChanges.size === changes.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div className="space-y-3">
          {changes.map((change, idx) => (
            <Card
              key={idx}
              className={`p-3 border-l-4 transition-all ${
                selectedChanges.has(idx)
                  ? 'border-green-500 bg-green-500 bg-opacity-5'
                  : 'border-gray-500 opacity-60'
              }`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedChanges.has(idx)}
                  onChange={() => toggleChange(idx)}
                  className="mt-1 w-4 h-4 cursor-pointer"
                />

                <div className="flex-1 space-y-2">
                  {/* Field Name */}
                  <div className="font-medium text-text-primary text-sm">
                    {getFieldLabel(change.field)}
                  </div>

                  {/* Before/After */}
                  <div className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
                    {/* Before */}
                    <div className="bg-red-500 bg-opacity-10 p-2 rounded border border-red-500 border-opacity-30">
                      <div className="text-xs text-red-400 font-semibold mb-1">Before</div>
                      <div className="text-sm text-text-secondary line-through">
                        {change.before}
                      </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight size={16} className="text-text-tertiary" />

                    {/* After */}
                    <div className="bg-green-500 bg-opacity-10 p-2 rounded border border-green-500 border-opacity-30">
                      <div className="text-xs text-green-400 font-semibold mb-1">After</div>
                      <div className="text-sm text-text-primary">{change.after}</div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="text-xs text-text-tertiary">
                    <span className="font-semibold">Reason:</span> {change.reason}
                  </div>

                  {/* Addresses */}
                  {change.addresses && change.addresses.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {change.addresses.map((issue, issueIdx) => (
                        <Badge key={issueIdx} variant="secondary" className="text-xs">
                          {issue}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Check Icon */}
                {selectedChanges.has(idx) && (
                  <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />
                )}
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Selection Summary */}
      <Card className="p-4 bg-bg-tertiary">
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">{selectedChanges.size}</span> of{' '}
            <span className="font-semibold">{changes.length}</span> changes selected
          </div>
          {selectedChanges.size === 0 && (
            <div className="flex items-center gap-1 text-xs text-orange-400">
              <AlertCircle size={14} />
              <span>No changes will be applied</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
