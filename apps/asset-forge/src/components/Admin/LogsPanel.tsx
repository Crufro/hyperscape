/**
 * Logs Panel Component
 * Displays API request statistics and error logs for admin dashboard
 */

import { AlertCircle, Activity, CheckCircle2, XCircle, Trash2, RefreshCw } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { API_ENDPOINTS } from '../../config/api'
import { apiFetch } from '../../utils/api'
import { Button } from '../common/Button'
import { Card } from '../common/Card'
import { Badge } from '../common/Badge'

import { ErrorDetailModal } from './ErrorDetailModal'

interface LogStats {
  total: number
  successful: number
  failed: number
  successRate: string
  byEndpoint: Record<
    string,
    {
      total: number
      success: number
      failed: number
      avgDuration: number
    }
  >
  recentRequests: Array<{
    timestamp: string
    method: string
    path: string
    status: number
    success: boolean
    duration: number
    errorMessage?: string
    errorCode?: string
  }>
  errorsByHour: Record<string, number>
}

interface ErrorLog {
  time: string
  method: string
  path: string
  status: string
  message: string
  stack: string
  error_code?: string
  request_body?: unknown
  query_params?: unknown
  headers?: unknown
}

interface ErrorLogs {
  errors: ErrorLog[]
  total: number
  byErrorCode: Record<string, { count: number; errors: ErrorLog[] }>
}

export const LogsPanel: React.FC = () => {
  const [stats, setStats] = useState<LogStats | null>(null)
  const [errorLogs, setErrorLogs] = useState<ErrorLogs | null>(null)
  const [selectedError, setSelectedError] = useState<{ error: ErrorLog; index: number } | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = async () => {
    try {
      setIsRefreshing(true)
      setError(null)

      const [statsResponse, errorsResponse] = await Promise.all([
        apiFetch(API_ENDPOINTS.adminLogsStats),
        apiFetch(API_ENDPOINTS.adminLogsErrors)
      ])

      const statsData = await statsResponse.json()
      const errorsData = await errorsResponse.json()

      setStats(statsData)
      setErrorLogs(errorsData)
    } catch (err) {
      console.error('[LogsPanel] Failed to fetch logs:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch logs')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      return
    }

    try {
      await apiFetch(API_ENDPOINTS.adminLogsClear, { method: 'DELETE' })
      await fetchLogs()
    } catch (err) {
      console.error('[LogsPanel] Failed to clear logs:', err)
      alert('Failed to clear logs')
    }
  }

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
          <span className="ml-3 text-text-secondary">Loading logs...</span>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6 bg-red-500 bg-opacity-10 border-red-500">
        <div className="flex items-center gap-2">
          <AlertCircle size={20} className="text-red-400" />
          <div>
            <div className="font-semibold text-red-400">Failed to Load Logs</div>
            <div className="text-sm text-text-secondary">{error}</div>
          </div>
        </div>
      </Card>
    )
  }

  const topEndpoints = Object.entries(stats?.byEndpoint || {})
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)

  const topErrorEndpoints = Object.entries(stats?.byEndpoint || {})
    .filter(([, data]) => data.failed > 0)
    .sort((a, b) => b[1].failed - a[1].failed)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">API Logs</h2>
          <p className="text-sm text-text-tertiary mt-1">Monitor API requests and errors</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchLogs}
            variant="ghost"
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button onClick={handleClearLogs} variant="ghost" className="flex items-center gap-2">
            <Trash2 size={16} />
            Clear Logs
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 bg-opacity-20 rounded-lg">
              <Activity size={24} className="text-blue-400" />
            </div>
            <div>
              <div className="text-xs text-text-tertiary">Total Requests</div>
              <div className="text-2xl font-bold text-text-primary">{stats?.total || 0}</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 bg-opacity-20 rounded-lg">
              <CheckCircle2 size={24} className="text-green-400" />
            </div>
            <div>
              <div className="text-xs text-text-tertiary">Successful</div>
              <div className="text-2xl font-bold text-green-400">{stats?.successful || 0}</div>
              <div className="text-xs text-text-tertiary">{stats?.successRate}%</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500 bg-opacity-20 rounded-lg">
              <XCircle size={24} className="text-red-400" />
            </div>
            <div>
              <div className="text-xs text-text-tertiary">Failed</div>
              <div className="text-2xl font-bold text-red-400">{stats?.failed || 0}</div>
              <div className="text-xs text-text-tertiary">
                {stats?.total ? ((stats.failed / stats.total) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 bg-opacity-20 rounded-lg">
              <AlertCircle size={24} className="text-orange-400" />
            </div>
            <div>
              <div className="text-xs text-text-tertiary">Error Logs</div>
              <div className="text-2xl font-bold text-orange-400">{errorLogs?.total || 0}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Endpoints */}
      {topEndpoints.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Top Endpoints</h3>
          <div className="space-y-3">
            {topEndpoints.map(([endpoint, data]) => (
              <div key={endpoint} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-primary">{endpoint}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {data.total} calls
                    </Badge>
                    <Badge variant="success" className="text-xs">
                      {data.success} success
                    </Badge>
                    {data.failed > 0 && (
                      <Badge variant="error" className="text-xs">
                        {data.failed} failed
                      </Badge>
                    )}
                    <span className="text-xs text-text-tertiary">{data.avgDuration}ms avg</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top Error Endpoints */}
      {topErrorEndpoints.length > 0 && (
        <Card className="p-6 bg-red-500 bg-opacity-5 border-red-500 border-opacity-30">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Endpoints with Errors</h3>
          <div className="space-y-3">
            {topErrorEndpoints.map(([endpoint, data]) => (
              <div key={endpoint} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-primary">{endpoint}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="error" className="text-xs">
                      {data.failed} errors
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {((data.failed / data.total) * 100).toFixed(1)}% failure rate
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Errors */}
      {errorLogs && errorLogs.errors.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Recent Errors ({errorLogs.total})
          </h3>
          <div className="space-y-2">
            {errorLogs.errors.slice(0, 20).map((err, index) => (
              <Card
                key={index}
                className="p-4 hover:bg-bg-tertiary cursor-pointer transition-colors"
                onClick={() => setSelectedError({ error: err, index })}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="error" className="text-xs">
                        {err.status}
                      </Badge>
                      {err.error_code && (
                        <Badge variant="secondary" className="text-xs">
                          {err.error_code}
                        </Badge>
                      )}
                      <span className="text-xs text-text-tertiary">
                        {new Date(err.time).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-text-primary mb-1">
                      {err.method} {err.path}
                    </div>
                    <div className="text-sm text-text-secondary line-clamp-1">{err.message}</div>
                  </div>
                  <Button variant="ghost" size="sm">
                    View Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* No Errors */}
      {errorLogs && errorLogs.errors.length === 0 && (
        <Card className="p-8 bg-green-500 bg-opacity-5 border-green-500 border-opacity-30">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 size={24} className="text-green-400" />
            <div className="text-center">
              <div className="text-lg font-semibold text-text-primary">No Errors Logged</div>
              <div className="text-sm text-text-tertiary">All API requests are succeeding!</div>
            </div>
          </div>
        </Card>
      )}

      {/* Error Detail Modal */}
      {selectedError && (
        <ErrorDetailModal
          isOpen={!!selectedError}
          onClose={() => setSelectedError(null)}
          error={selectedError.error}
          errorIndex={selectedError.index}
        />
      )}
    </div>
  )
}
