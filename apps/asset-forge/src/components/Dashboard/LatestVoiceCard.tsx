import React from 'react'
import { Mic, ExternalLink, Play } from 'lucide-react'

export function LatestVoiceCard() {
  const latestVoice = null // TODO: Connect to voice data store

  if (!latestVoice) {
    return (
      <div className="bg-bg-secondary/40 backdrop-blur-sm border border-border-primary/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Mic className="w-5 h-5 text-orange-400" />
          <h2 className="text-lg font-semibold text-white">Latest Voice</h2>
        </div>
        <div className="text-center py-8 text-gray-400">
          <Mic className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No voices generated yet</p>
          <button
            onClick={() => window.location.href = '/voice/standalone'}
            className="mt-3 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-sm text-orange-300 transition-colors"
          >
            Generate Voice
          </button>
        </div>
      </div>
    )
  }

  return <div>Voice Card</div>
}
