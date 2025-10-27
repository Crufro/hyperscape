/**
 * Latest Quest Card - Shows the most recently generated quest
 */

import React from 'react'
import { Scroll, ExternalLink, Clock, MapPin } from 'lucide-react'
import { useNavigationStore } from '../../stores/useNavigationStore'
import { ROUTES } from '../../constants/routes'

export function LatestQuestCard() {
  const navigateTo = useNavigationStore(state => state.navigateTo)
  // TODO: Connect to actual quest data store when available
  const latestQuest = null

  if (!latestQuest) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Scroll className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white">Latest Quest</h2>
        </div>
        <div className="text-center py-8 text-text-secondary">
          <Scroll className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No quests generated yet</p>
          <button
            onClick={() => navigateTo(ROUTES.CONTENT_QUESTS)}
            className="mt-3 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-lg text-sm text-cyan-300 transition-colors"
          >
            Create Quest
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Scroll className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white">Latest Quest</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateTo(ROUTES.CONTENT_QUESTS)}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-xs text-cyan-300 transition-colors"
            title="Create new quest"
          >
            Create Quest
          </button>
          <button
            onClick={() => navigateTo(ROUTES.CONTENT_QUESTS)}
            className="p-2 rounded-lg hover:bg-bg-hover transition-colors group"
            title="View all quests"
          >
            <ExternalLink className="w-4 h-4 text-text-secondary group-hover:text-white" />
          </button>
        </div>
      </div>
      {/* Quest content would go here */}
    </div>
  )
}
