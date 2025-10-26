import React from 'react'
import { Activity, Sparkles, Users, Briefcase } from 'lucide-react'

export function ActivityFeedCard() {
  // Add quick links to Projects and Teams as user requested
  const quickLinks = [
    { label: 'My Projects', href: '/projects', icon: Briefcase, color: 'text-blue-400' },
    { label: 'My Teams', href: '/team', icon: Users, color: 'text-green-400' },
  ]

  return (
    <div className="bg-bg-secondary/40 backdrop-blur-sm border border-border-primary/30 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <Activity className="w-5 h-5 text-accent-primary" />
        <h2 className="text-lg font-semibold text-white">Quick Links</h2>
      </div>

      <div className="space-y-2">
        {quickLinks.map((link) => {
          const Icon = link.icon
          return (
            <button
              key={link.href}
              onClick={() => window.location.href = link.href}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-border-primary/20 hover:border-border-primary/40 transition-all group"
            >
              <Icon className={`w-4 h-4 ${link.color}`} />
              <span className="text-sm font-medium text-white group-hover:text-accent-primary transition-colors">
                {link.label}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-border-primary/20">
        <p className="text-xs text-gray-500 text-center">
          More activity features coming soon
        </p>
      </div>
    </div>
  )
}
