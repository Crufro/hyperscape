/**
 * Admin Dashboard Page
 * Admin panel for managing users, whitelist, and system stats
 */

import { Shield, Activity, Users, Settings, Cpu } from 'lucide-react'
import { StatsCards, UserTable, WhitelistManager, ActivityFeed } from '@/components/Admin'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/common'
import { AdminRoute } from '@/components/guards/AdminRoute'
import { ModelConfiguration } from '@/components/Admin/ModelConfiguration'

export function AdminDashboardPage() {
  return (
    <AdminRoute>
      <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-bg-secondary border-b border-border-primary backdrop-blur-md">
        <div className="max-w-[1920px] mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 backdrop-blur-sm">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Admin Dashboard</h1>
              <p className="text-text-secondary mt-1">Manage users, monitor activity, and configure system settings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1920px] mx-auto px-6 py-6 space-y-6">
        {/* Stats Overview */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-text-primary">Platform Overview</h2>
          </div>
          <StatsCards />
        </div>

        {/* User Management & Whitelist */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Table - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-text-primary">User Management</h2>
            </div>
            <UserTable />
          </div>

          {/* Whitelist Manager - Takes 1 column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-text-primary">Access Control</h2>
            </div>
            <WhitelistManager />
          </div>
        </div>

        {/* AI Model Configuration */}
        <div>
          <Card className="bg-bg-secondary border-border-primary backdrop-blur-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-primary" />
                <CardTitle>AI Model Configuration</CardTitle>
              </div>
              <CardDescription>Configure which AI models are used for different tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <ModelConfiguration />
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <div>
          <Card className="bg-bg-secondary border-border-primary backdrop-blur-md">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <CardTitle>Recent Activity</CardTitle>
              </div>
              <CardDescription>Real-time feed of platform events and user actions</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityFeed />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </AdminRoute>
  )
}
