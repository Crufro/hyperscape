import React from 'react'
import { Book, ExternalLink } from 'lucide-react'

export function LatestLoreCard() {
  return (
    <div className="bg-bg-secondary/40 backdrop-blur-sm border border-border-primary/30 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <Book className="w-5 h-5 text-emerald-400" />
        <h2 className="text-lg font-semibold text-white">Latest Lore</h2>
      </div>
      <div className="text-center py-8 text-gray-400">
        <Book className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>No lore generated yet</p>
        <button
          onClick={() => window.location.href = '/content'}
          className="mt-3 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-sm text-emerald-300 transition-colors"
        >
          Generate Lore
        </button>
      </div>
    </div>
  )
}
