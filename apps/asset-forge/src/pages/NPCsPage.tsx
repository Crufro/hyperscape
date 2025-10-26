/**
 * NPCs Page
 *
 * Dedicated page for NPC creation and management.
 * Includes NPC script generator, collaboration builder, dialogue tree editor,
 * and NPC character card grid.
 */

import React, { useState } from 'react'
import { Users, Download, Grid, List } from 'lucide-react'
import { NPCScriptGenerator } from '../components/GameContent/NPCScriptGenerator'
import { NPCCollaborationBuilder } from '../components/GameContent/NPCCollaborationBuilder'
import { DialogueTreeEditor } from '../components/GameContent/DialogueTreeEditor'
import { useContentGenerationStore } from '../stores/useContentGenerationStore'
import { useGenerationStore } from '../stores/useGenerationStore'
import type { GeneratedNPC } from '../types/content-generation'
import type { CollaborationSession } from '../types/multi-agent'
import { Button } from '../components/common/Button'
import { Card, ProjectSelector } from '../components/common'
import { Badge } from '../components/common/Badge'

export function NPCsPage() {
  const { npcs, addNPC } = useContentGenerationStore()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showCollaboration, setShowCollaboration] = useState(false)

  // Project Context
  const selectedProjectId = useGenerationStore(state => state.selectedProjectId)
  const setSelectedProject = useGenerationStore(state => state.setSelectedProject)

  const handleNPCGenerated = (npc: GeneratedNPC) => {
    addNPC(npc)
  }

  const handleCollaborationComplete = (session: CollaborationSession) => {
    console.log('Collaboration completed:', session)
    setShowCollaboration(false)
  }

  const handleExportNPCs = () => {
    const dataStr = JSON.stringify(npcs, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `npcs-${Date.now()}.json`

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
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">NPCs</h1>
              <p className="text-sm text-gray-400">Create NPCs with personalities, dialogue, and AI collaboration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{npcs.length} NPCs</Badge>
            {npcs.length > 0 && (
              <Button onClick={handleExportNPCs} size="sm" variant="secondary">
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
        {/* NPC Creation Tools */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-4">Create NPC</h2>
            <NPCScriptGenerator onNPCGenerated={handleNPCGenerated} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">NPC Collaboration</h2>
              <Button
                onClick={() => setShowCollaboration(!showCollaboration)}
                size="sm"
                variant={showCollaboration ? 'primary' : 'secondary'}
              >
                {showCollaboration ? 'Hide' : 'Show'} Collaboration
              </Button>
            </div>
            {showCollaboration && (
              <NPCCollaborationBuilder onCollaborationComplete={handleCollaborationComplete} />
            )}
            {!showCollaboration && (
              <Card className="p-12 text-center">
                <Users size={48} className="mx-auto text-text-tertiary mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">Multi-Agent Collaboration</h3>
                <p className="text-sm text-text-secondary mb-4">
                  Run AI agents as NPCs to create authentic dialogue and relationships
                </p>
                <Button onClick={() => setShowCollaboration(true)} variant="primary" size="sm">
                  Start Collaboration
                </Button>
              </Card>
            )}
          </div>
        </div>

        {/* NPC List */}
        {npcs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">Generated NPCs</h2>
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
                {npcs.map((npc) => (
                  <Card key={npc.id} className="p-4 hover:border-primary/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-text-primary">{npc.personality.name}</h3>
                      <Badge variant="secondary">{npc.personality.archetype}</Badge>
                    </div>
                    <div className="space-y-2 mb-3">
                      <div className="flex flex-wrap gap-1">
                        {npc.personality.traits.map((trait, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {trait}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-text-secondary line-clamp-2">
                        {npc.personality.backstory}
                      </p>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-text-tertiary">Dialogues</span>
                        <span className="text-text-primary">{npc.dialogues.length}</span>
                      </div>
                      {npc.services && npc.services.length > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-text-tertiary">Services</span>
                          <span className="text-text-primary">{npc.services.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {npcs.map((npc) => (
                  <Card key={npc.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-text-primary">{npc.personality.name}</h3>
                          <Badge variant="secondary">{npc.personality.archetype}</Badge>
                          <Badge variant="secondary">{npc.dialogues.length} dialogues</Badge>
                        </div>
                        <p className="text-sm text-text-secondary mb-2">{npc.personality.backstory}</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {npc.personality.traits.map((trait, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {trait}
                            </Badge>
                          ))}
                        </div>
                        {npc.services && npc.services.length > 0 && (
                          <div className="text-xs text-text-tertiary">
                            Services: {npc.services.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {npcs.length === 0 && (
          <Card className="p-12 text-center">
            <Users size={48} className="mx-auto text-text-tertiary mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">No NPCs Created</h3>
            <p className="text-sm text-text-secondary">
              Use the NPC generator above to create your first NPC character
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}

export default NPCsPage
