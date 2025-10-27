/**
 * EndNode Component
 *
 * Special node marking the end of a dialogue branch.
 * Only has an input handle.
 */

import React, { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Square } from 'lucide-react'

export interface EndNodeData extends Record<string, unknown> {
  id: string
}

interface EndNodeProps {
  data: EndNodeData
  selected?: boolean
}

export const EndNode = memo<EndNodeProps>(({ selected }) => {
  return (
    <div className={`
      w-32 h-32 rounded-full border-2 transition-all flex items-center justify-center
      ${selected ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-red-400'}
      bg-red-950 bg-opacity-90
    `}>
      {/* Input Handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-red-400 border-2 border-red-950"
      />

      <div className="text-center">
        <Square size={32} className="text-red-400 mx-auto mb-1" />
        <span className="text-xs font-semibold text-red-300">END</span>
      </div>
    </div>
  )
})

EndNode.displayName = 'EndNode'
