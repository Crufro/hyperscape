/**
 * ResponseNode Component
 *
 * Visual node for player response options in the dialogue tree.
 * Features editable text, condition badges, and connection handles.
 */

import React, { memo, useCallback } from 'react'
import { Handle, Position } from '@xyflow/react'
import { MessageCircle } from 'lucide-react'
import { Badge } from '../../common/Badge'

export interface ResponseNodeData extends Record<string, unknown> {
  id: string
  text: string
  conditions?: string[]
  questReference?: string
  onTextChange?: (id: string, text: string) => void
}

interface ResponseNodeProps {
  data: ResponseNodeData
  selected?: boolean
}

export const ResponseNode = memo<ResponseNodeProps>(({ data, selected }) => {
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (data.onTextChange) {
      data.onTextChange(data.id, e.target.value)
    }
  }, [data])

  return (
    <div className={`
      min-w-[280px] max-w-[320px] rounded-lg border-2 transition-all
      ${selected ? 'border-green-500 shadow-lg shadow-green-500/20' : 'border-green-400'}
      bg-green-950 bg-opacity-90
    `}>
      {/* Input Handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-green-400 border-2 border-green-950"
      />

      {/* Node Header */}
      <div className="px-3 py-2 border-b border-green-800 bg-green-900 bg-opacity-50 rounded-t-md flex items-center gap-2">
        <MessageCircle size={14} className="text-green-400" />
        <span className="text-xs font-mono text-green-300">{data.id}</span>
      </div>

      {/* Node Content */}
      <div className="p-3">
        <label className="text-xs text-green-300 font-medium block mb-1">Player Says:</label>
        <textarea
          value={data.text}
          onChange={handleTextChange}
          placeholder="Enter player response..."
          className="w-full px-2 py-2 bg-green-900 bg-opacity-30 border border-green-800 rounded text-sm text-white placeholder-green-600 resize-none focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
          rows={2}
        />

        {/* Conditions and Quest Reference */}
        {(data.conditions && data.conditions.length > 0) || data.questReference ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {data.conditions?.map((condition: string, idx: number) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {condition}
              </Badge>
            ))}
            {data.questReference && (
              <Badge variant="primary" className="text-xs">
                Quest: {data.questReference}
              </Badge>
            )}
          </div>
        ) : null}
      </div>

      {/* Output Handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-green-400 border-2 border-green-950"
      />
    </div>
  )
})

ResponseNode.displayName = 'ResponseNode'
