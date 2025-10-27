/**
 * NPCs Page
 *
 * Dedicated page for NPC creation and management.
 * Includes NPC script generator, collaboration builder, dialogue tree editor,
 * and NPC character card grid.
 */

import React, { useState } from 'react'
import { Users, Download, Grid, List, FileJson, FileText, Package, CheckSquare } from 'lucide-react'
import { NPCScriptGenerator } from '../components/GameContent/NPCScriptGenerator'
import { NPCCollaborationBuilder } from '../components/GameContent/NPCCollaborationBuilder'
import { DialogueTreeEditor } from '../components/GameContent/DialogueTreeEditor'
import { useContentGenerationStore } from '../stores/useContentGenerationStore'
import { useGenerationStore } from '../stores/useGenerationStore'
import type { GeneratedNPC } from '../types/content-generation'
import type { CollaborationSession } from '../types/multi-agent'
import { Button } from '../components/common/Button'
import { Card, ProjectSelector, BulkActionsBar, createDeleteAction, createExportAction, Checkbox } from '../components/common'
import { Badge } from '../components/common/Badge'
import { exportAsJSON, exportNPCAsMarkdown, exportNPCsAsZip } from '../utils/export-helpers'
import { useBulkSelection } from '../hooks/useBulkSelection'

export function NPCsPage() {
  const { npcs, addNPC, removeNPCs } = useContentGenerationStore()
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showCollaboration, setShowCollaboration] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false)

  // Bulk selection hook
  const {
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    selectedCount,
  } = useBulkSelection()

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

  // Export single NPC as JSON
  const exportSingleNPCJSON = (npc: GeneratedNPC) => {
    exportAsJSON(npc, `npc-${npc.personality.name.toLowerCase().replace(/\s+/g, '-')}.json`)
  }

  // Export single NPC as Markdown
  const exportSingleNPCMarkdown = (npc: GeneratedNPC) => {
    exportNPCAsMarkdown(npc)
  }

  // Export all NPCs as JSON
  const exportAllNPCsJSON = () => {
    exportAsJSON(npcs, `npcs-${Date.now()}.json`)
  }

  // Export all NPCs as ZIP (with JSON, Markdown, and dialogue scripts)
  const exportAllNPCsZip = async () => {
    await exportNPCsAsZip(npcs)
  }

  // Bulk operations handlers
  const handleToggleSelectionMode = () => {
    setBulkSelectionMode(!bulkSelectionMode)
    if (bulkSelectionMode) {
      clearSelection()
    }
  }

  const handleBulkDelete = async () => {
    const npcIds = Array.from(selectedIds)
    removeNPCs(npcIds)
    clearSelection()
    setBulkSelectionMode(false)
  }

  const handleBulkExport = async () => {
    const selectedNPCs = npcs.filter((npc) => selectedIds.has(npc.id))
    await exportNPCsAsZip(selectedNPCs)
    clearSelection()
  }

  const handleSelectAll = () => {
    const allNpcIds = npcs.map((npc) => npc.id)
    selectAll(allNpcIds)
  }

  const allSelected = bulkSelectionMode && npcs.length > 0 && npcs.every((npc) => selectedIds.has(npc.id))

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
              <div className="relative">
                <Button onClick={() => setShowExportModal(true)} size="sm" variant="secondary">
                  <Download size={14} className="mr-1" />
                  Export All
                </Button>

                {/* Export Options Modal */}
                {showExportModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-bg-primary border border-border-primary rounded-xl p-6 max-w-md w-full mx-4">
                      <h3 className="text-lg font-semibold text-text-primary mb-4">Export NPCs</h3>
                      <p className="text-sm text-text-secondary mb-4">
                        Choose export format for {npcs.length} NPC{npcs.length > 1 ? 's' : ''}
                      </p>

                      <div className="space-y-2 mb-6">
                        <button
                          onClick={() => {
                            exportAllNPCsJSON()
                            setShowExportModal(false)
                          }}
                          className="w-full p-4 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary hover:border-primary/50 transition-all text-left flex items-start gap-3"
                        >
                          <FileJson size={20} className="text-blue-400 mt-0.5" />
                          <div>
                            <div className="font-medium text-sm text-text-primary mb-1">JSON Format</div>
                            <div className="text-xs text-text-tertiary">Single JSON file with all NPC data</div>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            exportAllNPCsZip()
                            setShowExportModal(false)
                          }}
                          className="w-full p-4 rounded-lg border border-border-primary bg-bg-secondary hover:bg-bg-tertiary hover:border-primary/50 transition-all text-left flex items-start gap-3"
                        >
                          <Package size={20} className="text-purple-400 mt-0.5" />
                          <div>
                            <div className="font-medium text-sm text-text-primary mb-1">ZIP Archive</div>
                            <div className="text-xs text-text-tertiary">JSON + Markdown + dialogue scripts</div>
                          </div>
                        </button>
                      </div>

                      <Button
                        onClick={() => setShowExportModal(false)}
                        variant="secondary"
                        size="sm"
                        className="w-full"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
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
              <div className="flex items-center gap-3">
                {bulkSelectionMode && (
                  <Checkbox
                    checked={allSelected}
                    onChange={handleSelectAll}
                    label=""
                  />
                )}
                <h2 className="text-lg font-semibold text-text-primary">Generated NPCs</h2>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleToggleSelectionMode}
                  variant={bulkSelectionMode ? 'primary' : 'secondary'}
                  size="sm"
                >
                  <CheckSquare size={14} className="mr-1" />
                  {bulkSelectionMode ? 'Exit Selection' : 'Select'}
                </Button>
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
                  <Card
                    key={npc.id}
                    className={`p-4 hover:border-primary/50 transition-colors ${
                      bulkSelectionMode && selectedIds.has(npc.id) ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {bulkSelectionMode && (
                          <Checkbox
                            checked={selectedIds.has(npc.id)}
                            onChange={() => toggleSelection(npc.id)}
                            label=""
                          />
                        )}
                        <h3 className="font-semibold text-text-primary">{npc.personality.name}</h3>
                      </div>
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
                    <div className="space-y-1 text-xs mb-3">
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

                    {/* Export Buttons */}
                    <div className="flex gap-2 pt-2 border-t border-border-primary/30">
                      <button
                        onClick={() => exportSingleNPCJSON(npc)}
                        className="flex-1 px-2 py-1 rounded text-xs bg-bg-tertiary hover:bg-bg-tertiary/70 text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center gap-1"
                        title="Export as JSON"
                      >
                        <FileJson size={12} />
                        JSON
                      </button>
                      <button
                        onClick={() => exportSingleNPCMarkdown(npc)}
                        className="flex-1 px-2 py-1 rounded text-xs bg-bg-tertiary hover:bg-bg-tertiary/70 text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center gap-1"
                        title="Export as Markdown"
                      >
                        <FileText size={12} />
                        MD
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {npcs.map((npc) => (
                  <Card
                    key={npc.id}
                    className={`p-4 ${bulkSelectionMode && selectedIds.has(npc.id) ? 'ring-2 ring-primary' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {bulkSelectionMode && (
                            <Checkbox
                              checked={selectedIds.has(npc.id)}
                              onChange={() => toggleSelection(npc.id)}
                              label=""
                            />
                          )}
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

      {/* Bulk Actions Bar */}
      {bulkSelectionMode && (
        <BulkActionsBar
          selectedCount={selectedCount}
          onClearSelection={clearSelection}
          actions={[
            createDeleteAction(handleBulkDelete),
            createExportAction(handleBulkExport),
          ]}
        />
      )}
    </div>
  )
}

export default NPCsPage
