/**
 * StartNode Component
 *
 * Special node marking the start of a dialogue tree.
 * Only has an output handle.
 */

import React, { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { Play } from 'lucide-react'

export interface StartNodeData extends Record<string, unknown> {
  id: string
}

interface StartNodeProps {
  data: StartNodeData
  selected?: boolean
}

export const StartNode = memo<StartNodeProps>(({ selected }) => {
  return (
    <div className={`
      w-32 h-32 rounded-full border-2 transition-all flex items-center justify-center
      ${selected ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-purple-400'}
      bg-purple-950 bg-opacity-90
    `}>
      <div className="text-center">
        <Play size={32} className="text-purple-400 mx-auto mb-1" />
        <span className="text-xs font-semibold text-purple-300">START</span>
      </div>

      {/* Output Handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-purple-400 border-2 border-purple-950"
      />
    </div>
  )
})

StartNode.displayName = 'StartNode'
