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
import { LayoutDashboard, Sparkles, FileText, Mic, Book, Package } from 'lucide-react'
import { LatestAsset3DCard } from '../components/Dashboard/LatestAsset3DCard'
import { LatestQuestCard } from '../components/Dashboard/LatestQuestCard'
import { LatestVoiceCard } from '../components/Dashboard/LatestVoiceCard'
import { LatestLoreCard } from '../components/Dashboard/LatestLoreCard'
import { QuickStatsCard } from '../components/Dashboard/QuickStatsCard'
import { ActivityFeedCard } from '../components/Dashboard/ActivityFeedCard'
import { useNavigationStore } from '../stores/useNavigationStore'
import { ROUTES } from '../constants/routes'

export function DashboardPage() {
  const navigateTo = useNavigationStore(state => state.navigateTo)
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

        {/* Additional Content Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Quick Action Cards */}
          <QuickActionCard
            icon={<Sparkles className="w-5 h-5" />}
            title="Generate Asset"
            description="Create a new 3D asset"
            onClick={() => navigateTo(ROUTES.GENERATION)}
            gradient="from-purple-500/20 to-pink-500/20"
          />
          <QuickActionCard
            icon={<FileText className="w-5 h-5" />}
            title="Create Quest"
            description="Build a new quest"
            onClick={() => navigateTo(ROUTES.CONTENT_QUESTS)}
            gradient="from-blue-500/20 to-cyan-500/20"
          />
          <QuickActionCard
            icon={<Mic className="w-5 h-5" />}
            title="Generate Voice"
            description="Create character voice"
            onClick={() => navigateTo(ROUTES.VOICE_STANDALONE)}
            gradient="from-orange-500/20 to-yellow-500/20"
          />
          <QuickActionCard
            icon={<Package className="w-5 h-5" />}
            title="My Projects"
            description="View and manage projects"
            onClick={() => navigateTo(ROUTES.PROJECTS)}
            gradient="from-blue-500/20 to-indigo-500/20"
          />
          <QuickActionCard
            icon={<Book className="w-5 h-5" />}
            title="My Teams"
            description="Collaborate with team"
            onClick={() => navigateTo(ROUTES.TEAM)}
            gradient="from-green-500/20 to-emerald-500/20"
          />
        </div>
      </div>
    </div>
  )
}

interface QuickActionCardProps {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
  gradient: string
}

function QuickActionCard({ icon, title, description, onClick, gradient }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative p-6 rounded-lg
        bg-gradient-to-br ${gradient}
        border border-border-primary/30
        hover:border-border-primary/60
        hover:shadow-lg hover:shadow-accent-primary/5
        transition-all duration-300
        text-left
      `}
    >
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-white mb-1">{title}</h3>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      </div>
    </button>
  )
}

export default DashboardPage
