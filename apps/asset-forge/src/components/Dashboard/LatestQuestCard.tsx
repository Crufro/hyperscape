/**
 * Latest Quest Card - Shows the most recently generated quest
 */

import React from 'react'
import { Scroll, ExternalLink, Clock, MapPin } from 'lucide-react'

export function LatestQuestCard() {
  // TODO: Connect to actual quest data store when available
  const latestQuest = null

  if (!latestQuest) {
    return (
      <div className="bg-bg-secondary/40 backdrop-blur-sm border border-border-primary/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Scroll className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white">Latest Quest</h2>
        </div>
        <div className="text-center py-8 text-gray-400">
          <Scroll className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No quests generated yet</p>
          <button
            onClick={() => window.location.href = '/content'}
            className="mt-3 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-sm text-cyan-300 transition-colors"
          >
            Create Quest
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg-secondary/40 backdrop-blur-sm border border-border-primary/30 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Scroll className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white">Latest Quest</h2>
        </div>
        <button
          onClick={() => window.location.href = '/content'}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors group"
        >
          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-white" />
        </button>
      </div>
      {/* Quest content would go here */}
    </div>
  )
}
