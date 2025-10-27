import React from 'react'
import { Book, ExternalLink } from 'lucide-react'
import { useNavigationStore } from '../../stores/useNavigationStore'
import { ROUTES } from '../../constants/routes'

export function LatestLoreCard() {
  const navigateTo = useNavigationStore(state => state.navigateTo)
  const latestLore = null // TODO: Connect to lore data store

  if (!latestLore) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Book className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-white">Latest Lore</h2>
        </div>
        <div className="text-center py-8 text-text-secondary">
          <Book className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No lore generated yet</p>
          <button
            onClick={() => navigateTo(ROUTES.CONTENT_LORE)}
            className="mt-3 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-sm text-emerald-300 transition-colors"
          >
            Generate Lore
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Book className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold text-white">Latest Lore</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateTo(ROUTES.CONTENT_LORE)}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-xs text-emerald-300 transition-colors"
            title="Generate new lore"
          >
            Generate Lore
          </button>
          <button
            onClick={() => navigateTo(ROUTES.CONTENT_LORE)}
            className="p-2 rounded-lg hover:bg-bg-hover transition-colors group"
            title="View all lore"
          >
            <ExternalLink className="w-4 h-4 text-text-secondary group-hover:text-white" />
          </button>
        </div>
      </div>
      {/* Lore content would go here */}
    </div>
  )
}
