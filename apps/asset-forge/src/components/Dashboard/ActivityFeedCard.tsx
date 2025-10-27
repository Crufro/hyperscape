import React from 'react'
import { Activity, Sparkles, Users, Briefcase } from 'lucide-react'
import { useNavigationStore } from '../../stores/useNavigationStore'
import { ROUTES } from '../../constants/routes'

export function ActivityFeedCard() {
  const navigateTo = useNavigationStore(state => state.navigateTo)

  // Add quick links to Projects and Teams as user requested
  const quickLinks = [
    { label: 'My Projects', route: ROUTES.PROJECTS, icon: Briefcase, color: 'text-blue-400' },
    { label: 'My Teams', route: ROUTES.TEAM, icon: Users, color: 'text-green-400' },
  ]

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <Activity className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-white">Quick Links</h2>
      </div>

      <div className="space-y-2">
        {quickLinks.map((link) => {
          const Icon = link.icon
          return (
            <button
              key={link.route}
              onClick={() => navigateTo(link.route)}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-bg-tertiary hover:bg-bg-hover border border-border-primary hover:border-border-secondary transition-all group"
            >
              <Icon className={`w-4 h-4 ${link.color}`} />
              <span className="text-sm font-medium text-white group-hover:text-primary transition-colors">
                {link.label}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-border-primary">
        <p className="text-xs text-text-muted text-center">
          More activity features coming soon
        </p>
      </div>
    </div>
  )
}
