/**
 * Dashboard Page
 *
 * Main landing page showing latest generated content across all categories:
 * - Latest 3D Assets (with 3D viewer)
 * - Latest Quests
 * - Latest Voices
 * - Latest Lore
 * - Latest Items
 * - Quick stats and activity feed
 */

import React from 'react'
import { LayoutDashboard } from 'lucide-react'
import { LatestAsset3DCard } from '../components/Dashboard/LatestAsset3DCard'
import { LatestQuestCard } from '../components/Dashboard/LatestQuestCard'
import { LatestVoiceCard } from '../components/Dashboard/LatestVoiceCard'
import { LatestLoreCard } from '../components/Dashboard/LatestLoreCard'
import { QuickStatsCard } from '../components/Dashboard/QuickStatsCard'
import { ActivityFeedCard } from '../components/Dashboard/ActivityFeedCard'
export function DashboardPage() {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="border-b border-border-primary/30 bg-bg-secondary/40 backdrop-blur-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <LayoutDashboard className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-gray-400">Overview of your latest generations and activity</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Quick Stats Row */}
        <QuickStatsCard />

        {/* Main Grid - 2 columns on large screens */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Latest 3D Asset with Viewer */}
            <LatestAsset3DCard />

            {/* Latest Quest */}
            <LatestQuestCard />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Latest Voice */}
            <LatestVoiceCard />

            {/* Latest Lore */}
            <LatestLoreCard />

            {/* Activity Feed */}
            <ActivityFeedCard />
          </div>
        </div>

      </div>
    </div>
  )
}

export default DashboardPage
