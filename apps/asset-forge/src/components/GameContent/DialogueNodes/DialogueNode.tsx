/**
 * DialogueNode Component
 *
 * Visual node for NPC dialogue lines in the dialogue tree editor.
 * Features editable text, node ID display, and connection handles.
 */

import React, { memo, useCallback } from 'react'
import { Handle, Position } from '@xyflow/react'
import { MessageSquare } from 'lucide-react'

export interface DialogueNodeData extends Record<string, unknown> {
  id: string
  text: string
  onTextChange?: (id: string, text: string) => void
}

interface DialogueNodeProps {
  data: DialogueNodeData
  selected?: boolean
}

export const DialogueNode = memo<DialogueNodeProps>(({ data, selected }) => {
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (data.onTextChange) {
      data.onTextChange(data.id, e.target.value)
    }
  }, [data])

  return (
    <div className={`
      min-w-[280px] max-w-[320px] rounded-lg border-2 transition-all
      ${selected ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-blue-400'}
      bg-blue-950 bg-opacity-90
    `}>
      {/* Input Handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-blue-400 border-2 border-blue-950"
      />

      {/* Node Header */}
      <div className="px-3 py-2 border-b border-blue-800 bg-blue-900 bg-opacity-50 rounded-t-md flex items-center gap-2">
        <MessageSquare size={14} className="text-blue-400" />
        <span className="text-xs font-mono text-blue-300">{data.id}</span>
      </div>

      {/* Node Content */}
      <div className="p-3">
        <label className="text-xs text-blue-300 font-medium block mb-1">NPC Says:</label>
        <textarea
          value={data.text}
          onChange={handleTextChange}
          placeholder="Enter NPC dialogue..."
          className="w-full px-2 py-2 bg-blue-900 bg-opacity-30 border border-blue-800 rounded text-sm text-white placeholder-blue-600 resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          rows={3}
        />
      </div>

      {/* Output Handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-blue-400 border-2 border-blue-950"
      />
    </div>
  )
})

DialogueNode.displayName = 'DialogueNode'
