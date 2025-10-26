import React from 'react'
import { Box, Scroll, Mic, Book } from 'lucide-react'
import { useAssetsStore } from '../../stores/useAssetsStore'

export function QuickStatsCard() {
  const assets = useAssetsStore(state => state.assets)
  const assetsCount = assets?.length || 0

  const stats = [
    { label: 'Total Assets', value: assetsCount.toString(), icon: Box, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
    { label: 'Quests', value: '0', icon: Scroll, color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20' },
    { label: 'Voices', value: '0', icon: Mic, color: 'text-primary-light', bg: 'bg-primary-light/10', border: 'border-primary-light/20' },
    { label: 'Lore Entries', value: '0', icon: Book, color: 'text-secondary-light', bg: 'bg-secondary-light/10', border: 'border-secondary-light/20' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="bg-bg-secondary/40 backdrop-blur-sm border border-border-primary/30 rounded-lg p-4 hover:border-primary/40 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bg} border ${stat.border}`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
