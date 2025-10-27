/**
 * Dialogue Editor Wrapper
 *
 * Wrapper component that allows toggling between visual and text-based editors.
 * Provides a smooth transition and maintains state between editor modes.
 */

import React, { useState, useCallback } from 'react'
import { Eye, Code } from 'lucide-react'
import { Button } from '../common/Button'
import { Badge } from '../common/Badge'
import { DialogueTreeEditor } from './DialogueTreeEditor'
import { VisualDialogueEditor } from './VisualDialogueEditor'
import type { DialogueNode, DialogueResponse } from '../../types/npc-scripts'

interface DialogueEditorWrapperProps {
  nodes: DialogueNode[]
  entryNodeId: string
  selectedNodeId: string | null
  onNodeSelect: (nodeId: string) => void
  onNodeAdd: () => void
  onNodeUpdate: (nodeId: string, updates: Partial<DialogueNode>) => void
  onNodeDelete: (nodeId: string) => void
  onResponseAdd: (nodeId: string) => void
  onResponseUpdate: (nodeId: string, responseId: string, updates: Partial<DialogueResponse>) => void
  onResponseDelete: (nodeId: string, responseId: string) => void
  onTreeChange?: (nodes: DialogueNode[], entryNodeId: string) => void
}

export function DialogueEditorWrapper({
  nodes,
  entryNodeId,
  selectedNodeId,
  onNodeSelect,
  onNodeAdd,
  onNodeUpdate,
  onNodeDelete,
  onResponseAdd,
  onResponseUpdate,
  onResponseDelete,
  onTreeChange
}: DialogueEditorWrapperProps) {
  const [editorMode, setEditorMode] = useState<'visual' | 'text'>('visual')

  const handleTreeChange = useCallback((newNodes: DialogueNode[], newEntryNodeId: string) => {
    if (onTreeChange) {
      onTreeChange(newNodes, newEntryNodeId)
    }
  }, [onTreeChange])

  return (
    <div className="space-y-4">
      {/* Editor Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-text-primary">Dialogue Tree Editor</h4>
          <Badge variant="secondary" className="text-xs">
            {nodes.length} nodes
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setEditorMode('visual')}
            variant={editorMode === 'visual' ? 'primary' : 'ghost'}
            size="sm"
          >
            <Eye size={14} className="mr-1" />
            Visual
          </Button>
          <Button
            onClick={() => setEditorMode('text')}
            variant={editorMode === 'text' ? 'primary' : 'ghost'}
            size="sm"
          >
            <Code size={14} className="mr-1" />
            Text
          </Button>
        </div>
      </div>

      {/* Editor Content */}
      {editorMode === 'visual' ? (
        <VisualDialogueEditor
          nodes={nodes}
          entryNodeId={entryNodeId}
          onNodesChange={handleTreeChange}
        />
      ) : (
        <DialogueTreeEditor
          nodes={nodes}
          entryNodeId={entryNodeId}
          selectedNodeId={selectedNodeId}
          onNodeSelect={onNodeSelect}
          onNodeAdd={onNodeAdd}
          onNodeUpdate={onNodeUpdate}
          onNodeDelete={onNodeDelete}
          onResponseAdd={onResponseAdd}
          onResponseUpdate={onResponseUpdate}
          onResponseDelete={onResponseDelete}
        />
      )}
    </div>
  )
}
