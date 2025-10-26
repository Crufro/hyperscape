/**
 * Tracker Page
 *
 * Dedicated page for quest tracking and playtesting.
 * Includes quest tracker with progress visualization, analytics dashboard,
 * and playtester swarm panel for automated testing.
 */

import React, { useState } from 'react'
import { Target, Play, BarChart3 } from 'lucide-react'
import { QuestTracker } from '../components/GameContent/QuestTracker'
import { PlaytesterSwarmPanel } from '../components/GameContent/PlaytesterSwarmPanel'
import { useQuestTrackingStore } from '../stores/useQuestTrackingStore'
import { useMultiAgentStore } from '../stores/useMultiAgentStore'
import type { PlaytestSession } from '../types/multi-agent'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { Badge } from '../components/common/Badge'

export function TrackerPage() {
  const { getActiveQuestCount, getCompletedQuestCount, events } = useQuestTrackingStore()
  const { playtestSessions } = useMultiAgentStore()
  const [viewMode, setViewMode] = useState<'tracker' | 'playtester' | 'analytics'>('tracker')

  const handleTestComplete = (session: PlaytestSession) => {
    console.log('Playtest completed:', session)
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="border-b border-border-primary/30 bg-bg-secondary/40 backdrop-blur-sm -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Quest Tracker</h1>
              <p className="text-sm text-gray-400">Track quest progress and run automated playtests</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{getActiveQuestCount()} active</Badge>
            <Badge variant="secondary">{getCompletedQuestCount()} completed</Badge>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <Button
          onClick={() => setViewMode('tracker')}
          variant={viewMode === 'tracker' ? 'primary' : 'secondary'}
        >
          <Target size={14} className="mr-2" />
          Quest Tracker
        </Button>
        <Button
          onClick={() => setViewMode('playtester')}
          variant={viewMode === 'playtester' ? 'primary' : 'secondary'}
        >
          <Play size={14} className="mr-2" />
          AI Playtesters
        </Button>
        <Button
          onClick={() => setViewMode('analytics')}
          variant={viewMode === 'analytics' ? 'primary' : 'secondary'}
        >
          <BarChart3 size={14} className="mr-2" />
          Analytics
        </Button>
      </div>

      {/* Main Content */}
      {viewMode === 'tracker' && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Quest Progress</h2>
          <QuestTracker />
        </div>
      )}

      {viewMode === 'playtester' && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-4">AI Playtester Swarm</h2>
          <PlaytesterSwarmPanel onTestComplete={handleTestComplete} />
        </div>
      )}

      {viewMode === 'analytics' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Analytics Dashboard</h2>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <Target className="text-primary" size={32} />
                <div>
                  <div className="text-3xl font-bold text-text-primary">{getActiveQuestCount()}</div>
                  <div className="text-sm text-text-secondary">Active Quests</div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <Target className="text-accent" size={32} />
                <div>
                  <div className="text-3xl font-bold text-text-primary">{getCompletedQuestCount()}</div>
                  <div className="text-sm text-text-secondary">Completed Quests</div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="text-primary" size={32} />
                <div>
                  <div className="text-3xl font-bold text-text-primary">{events.length}</div>
                  <div className="text-sm text-text-secondary">Total Events</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Playtest Results */}
          {playtestSessions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Playtests</h3>
              <div className="space-y-3">
                {playtestSessions.slice(0, 5).map((session) => (
                  <Card key={session.sessionId} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-text-primary">
                            {session.contentId}
                          </h4>
                          <Badge
                            variant={
                              session.report.summary.recommendation === 'pass'
                                ? 'secondary'
                                : 'error'
                            }
                          >
                            {session.report.summary.recommendation}
                          </Badge>
                          <Badge variant="secondary">Grade: {session.report.summary.grade}</Badge>
                        </div>
                        <p className="text-sm text-text-secondary mb-2">{session.consensus.summary}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {session.report.summary.grade}
                        </div>
                        <div className="text-xs text-text-tertiary">
                          {session.report.summary.gradeScore}/100
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-text-tertiary">Completion: </span>
                        <span className="text-text-primary">
                          {session.report.qualityMetrics.completionRate}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-tertiary">Difficulty: </span>
                        <span className="text-text-primary">
                          {session.report.qualityMetrics.difficulty.overall}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-tertiary">Bugs: </span>
                        <span className="text-text-primary">{session.report.issues.total}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Event Log */}
          {events.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Events</h3>
              <Card className="p-4">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {events.slice(-20).reverse().map((event, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between p-2 bg-bg-tertiary rounded text-xs"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-text-primary mb-1">
                          {event.type}
                        </div>
                        <div className="text-text-tertiary">
                          Quest: {event.questId}
                        </div>
                      </div>
                      <div className="text-text-tertiary">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Empty State */}
          {playtestSessions.length === 0 && events.length === 0 && (
            <Card className="p-12 text-center">
              <BarChart3 size={48} className="mx-auto text-text-tertiary mb-4" />
              <h3 className="text-lg font-semibold text-text-primary mb-2">No Analytics Data</h3>
              <p className="text-sm text-text-secondary mb-4">
                Start tracking quests or run playtests to see analytics
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setViewMode('tracker')} variant="primary" size="sm">
                  Track Quests
                </Button>
                <Button onClick={() => setViewMode('playtester')} variant="secondary" size="sm">
                  Run Playtest
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default TrackerPage
