/**
 * Scripts Page
 *
 * Dedicated page for NPC script creation and management.
 * Includes script builder, script generator, script library browser,
 * and script testing tools.
 */

import React, { useState } from 'react'
import { FileCode, Download, List, Grid } from 'lucide-react'
import { NPCScriptBuilder } from '../components/GameContent/NPCScriptBuilder'
import { NPCScriptGenerator } from '../components/GameContent/NPCScriptGenerator'
import { useNPCScriptsStore } from '../stores/useNPCScriptsStore'
import { useContentGenerationStore } from '../stores/useContentGenerationStore'
import type { GeneratedNPC } from '../types/content-generation'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'
import { downloadScriptPack } from '../utils/npc-script-exporter'

export function ScriptsPage() {
  const { npcScripts } = useNPCScriptsStore()
  const { npcs, addNPC } = useContentGenerationStore()
  const [viewMode, setViewMode] = useState<'builder' | 'library'>('builder')
  const [libraryViewMode, setLibraryViewMode] = useState<'grid' | 'list'>('grid')

  const handleNPCGenerated = (npc: GeneratedNPC) => {
    addNPC(npc)
  }

  const handleExportScripts = () => {
    if (npcScripts.length === 0) return
    downloadScriptPack(npcScripts, 'All NPC Scripts')
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="border-b border-border-primary/30 bg-bg-secondary/40 backdrop-blur-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <FileCode className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">NPC Scripts</h1>
              <p className="text-sm text-gray-400">Create and manage executable NPC dialogue scripts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{npcScripts.length} scripts</Badge>
            {npcScripts.length > 0 && (
              <Button onClick={handleExportScripts} size="sm" variant="secondary">
                <Download size={14} className="mr-1" />
                Export All
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <Button
          onClick={() => setViewMode('builder')}
          variant={viewMode === 'builder' ? 'primary' : 'secondary'}
        >
          Script Builder
        </Button>
        <Button
          onClick={() => setViewMode('library')}
          variant={viewMode === 'library' ? 'primary' : 'secondary'}
        >
          Script Library ({npcScripts.length})
        </Button>
      </div>

      {/* Main Content */}
      {viewMode === 'builder' ? (
        <div className="space-y-6">
          {/* NPC Generator */}
          {npcs.length === 0 && (
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4">Create NPC First</h2>
              <NPCScriptGenerator onNPCGenerated={handleNPCGenerated} />
            </div>
          )}

          {/* Script Builder */}
          {npcs.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-4">Build NPC Script</h2>
              <NPCScriptBuilder />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Script Library */}
          {npcScripts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Script Library</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setLibraryViewMode('grid')}
                    variant={libraryViewMode === 'grid' ? 'primary' : 'ghost'}
                    size="sm"
                  >
                    <Grid size={14} />
                  </Button>
                  <Button
                    onClick={() => setLibraryViewMode('list')}
                    variant={libraryViewMode === 'list' ? 'primary' : 'ghost'}
                    size="sm"
                  >
                    <List size={14} />
                  </Button>
                </div>
              </div>

              {libraryViewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {npcScripts.map((script) => (
                    <Card key={script.id} className="p-4 hover:border-primary/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-text-primary">{script.npcName}</h3>
                        <Badge variant="secondary">{script.archetype}</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-tertiary">Dialogue Nodes</span>
                          <span className="text-text-primary">{script.dialogueTree.nodes.length}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-tertiary">Entry Point</span>
                          <span className="text-text-primary font-mono text-xs">
                            {script.dialogueTree.entryNodeId}
                          </span>
                        </div>
                        {script.shopInventory && script.shopInventory.length > 0 && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-text-tertiary">Shop Items</span>
                            <span className="text-text-primary">{script.shopInventory.length}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {npcScripts.map((script) => (
                    <Card key={script.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-text-primary">{script.npcName}</h3>
                            <Badge variant="secondary">{script.archetype}</Badge>
                            <Badge variant="secondary">{script.dialogueTree.nodes.length} nodes</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <span className="text-text-tertiary">Entry Point: </span>
                              <span className="text-text-primary font-mono">{script.dialogueTree.entryNodeId}</span>
                            </div>
                            {script.shopInventory && script.shopInventory.length > 0 && (
                              <div>
                                <span className="text-text-tertiary">Shop Items: </span>
                                <span className="text-text-primary">{script.shopInventory.length}</span>
                              </div>
                            )}
                            <div>
                              <span className="text-text-tertiary">NPC ID: </span>
                              <span className="text-text-primary font-mono text-xs">{script.npcId}</span>
                            </div>
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
          {npcScripts.length === 0 && (
            <Card className="p-12 text-center">
              <FileCode size={48} className="mx-auto text-text-tertiary mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">No Scripts Created</h3>
              <p className="text-sm text-text-secondary mb-4">
                Switch to the Script Builder to create your first NPC script
              </p>
              <Button onClick={() => setViewMode('builder')} variant="primary" size="sm">
                Go to Script Builder
              </Button>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default ScriptsPage
