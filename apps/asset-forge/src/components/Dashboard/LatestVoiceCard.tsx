import React from 'react'
import { Mic, ExternalLink, Play } from 'lucide-react'
import { useNavigationStore } from '../../stores/useNavigationStore'
import { ROUTES } from '../../constants/routes'

export function LatestVoiceCard() {
  const navigateTo = useNavigationStore(state => state.navigateTo)
  const latestVoice = null // TODO: Connect to voice data store

  if (!latestVoice) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Mic className="w-5 h-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-white">Latest Voice</h2>
        </div>
        <div className="text-center py-8 text-text-secondary">
          <Mic className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No voices generated yet</p>
          <button
            onClick={() => navigateTo(ROUTES.VOICE_STANDALONE)}
            className="mt-3 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-sm text-orange-300 transition-colors"
          >
            Generate Voice
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Mic className="w-5 h-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-white">Latest Voice</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateTo(ROUTES.VOICE_STANDALONE)}
            className="px-3 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-xs text-orange-300 transition-colors"
            title="Generate new voice"
          >
            Generate Voice
          </button>
          <button
            onClick={() => navigateTo(ROUTES.VOICE_STANDALONE)}
            className="p-2 rounded-lg hover:bg-bg-hover transition-colors group"
            title="View all voices"
          >
            <ExternalLink className="w-4 h-4 text-text-secondary group-hover:text-white" />
          </button>
        </div>
      </div>
      {/* Voice content would go here */}
    </div>
  )
}
