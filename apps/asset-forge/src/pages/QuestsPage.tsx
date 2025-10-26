/**
 * Quests Page
 *
 * Dedicated page for quest creation and management.
 * Includes quest builder with AI generation, quest list/grid,
 * quest validation, and export functionality.
 */

import React, { useState } from 'react'
import { Target, Download, Grid, List } from 'lucide-react'
import { QuestBuilder } from '../components/GameContent/QuestBuilder'
import { useContentGenerationStore } from '../stores/useContentGenerationStore'
import { useGenerationStore } from '../stores/useGenerationStore'
import type { GeneratedQuest } from '../types/content-generation'
import { Button } from '../components/common/Button'
import { Card, ProjectSelector } from '../components/common'
import { Badge } from '../components/common/Badge'

export function QuestsPage() {
  const { quests, addQuest } = useContentGenerationStore()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Project Context
  const selectedProjectId = useGenerationStore(state => state.selectedProjectId)
  const setSelectedProject = useGenerationStore(state => state.setSelectedProject)

  const handleQuestGenerated = (quest: GeneratedQuest) => {
    addQuest(quest)
  }

  const handleExportQuests = () => {
    const dataStr = JSON.stringify(quests, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `quests-${Date.now()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="border-b border-border-primary/30 bg-bg-secondary/40 backdrop-blur-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Quests</h1>
              <p className="text-sm text-gray-400">Create and manage game quests with AI assistance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{quests.length} quests</Badge>
            {quests.length > 0 && (
              <Button onClick={handleExportQuests} size="sm" variant="secondary">
                <Download size={14} className="mr-1" />
                Export All
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Project Selector */}
      <Card className="mb-6">
        <div className="p-4">
          <ProjectSelector
            selectedProjectId={selectedProjectId}
            onSelect={setSelectedProject}
            showUnassigned={true}
          />
        </div>
      </Card>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Quest Builder */}
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Create New Quest</h2>
          <QuestBuilder onQuestGenerated={handleQuestGenerated} />
        </div>

        {/* Quest List */}
        {quests.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Generated Quests</h2>
              <div className="flex gap-2">
                <Button
                  onClick={() => setViewMode('grid')}
                  variant={viewMode === 'grid' ? 'primary' : 'ghost'}
                  size="sm"
                >
                  <Grid size={14} />
                </Button>
                <Button
                  onClick={() => setViewMode('list')}
                  variant={viewMode === 'list' ? 'primary' : 'ghost'}
                  size="sm"
                >
                  <List size={14} />
                </Button>
              </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quests.map((quest) => (
                  <Card key={quest.id} className="p-4 hover:border-primary/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-text-primary">{quest.title}</h3>
                      <Badge variant="secondary">{quest.difficulty}</Badge>
                    </div>
                    <p className="text-sm text-text-secondary mb-3 line-clamp-2">{quest.description}</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-tertiary">Objectives</span>
                        <span className="text-text-primary">{quest.objectives.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-tertiary">Rewards</span>
                        <span className="text-text-primary">
                          {quest.rewards.experience} XP, {quest.rewards.gold} Gold
                        </span>
                      </div>
                      {quest.questGiver && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-tertiary">Quest Giver</span>
                          <span className="text-text-primary">{quest.questGiverData?.name || quest.questGiver}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {quests.map((quest) => (
                  <Card key={quest.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-text-primary">{quest.title}</h3>
                          <Badge variant="secondary">{quest.difficulty}</Badge>
                          <Badge variant="secondary">{quest.objectives.length} objectives</Badge>
                        </div>
                        <p className="text-sm text-text-secondary mb-2">{quest.description}</p>
                        <div className="flex gap-4 text-xs text-text-tertiary">
                          <span>Rewards: {quest.rewards.experience} XP, {quest.rewards.gold} Gold</span>
                          {quest.questGiver && (
                            <span>Quest Giver: {quest.questGiverData?.name || quest.questGiver}</span>
                          )}
                          {quest.estimatedDuration && (
                            <span>~{quest.estimatedDuration} min</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {quests.length === 0 && (
          <Card className="p-12 text-center">
            <Target size={48} className="mx-auto text-text-tertiary mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No Quests Created</h3>
            <p className="text-sm text-text-secondary">
              Use the quest builder above to create your first quest
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}

export default QuestsPage
