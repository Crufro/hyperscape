/**
 * Profile Page
 * User profile and account settings
 */

import { User, Mail, Shield, Bell, Palette, Key, Save, CheckCircle, AlertCircle, GraduationCap, Play, RotateCcw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Badge, Checkbox } from '@/components/common'
import { apiFetch } from '@/utils/api'
import { useOnboardingStore } from '@/stores/useOnboardingStore'
import { useManualTour } from '@/hooks/useTour'
import { tours } from '@/config/tours'

export function ProfilePage() {
  const { user: privyUser } = usePrivy()

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')

  // Settings state
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [browserNotifications, setBrowserNotifications] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light' | 'auto'>('dark')

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Onboarding tours
  const { getTourStatus, resetTour, resetAllTours, getProgress } = useOnboardingStore()
  const { startManualTour } = useManualTour()
  const progress = getProgress()

  // Get user data from Privy
  const user = {
    name: privyUser?.email?.address?.split('@')[0] || privyUser?.wallet?.address || 'User',
    email: privyUser?.email?.address || 'Not connected',
    role: 'member',
    joinedDate: privyUser?.createdAt ? new Date(privyUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently',
    walletAddress: privyUser?.wallet?.address
  }

  // Load user data on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const response = await apiFetch('/api/users/me')
        if (response.ok) {
          const data = await response.json()
          setDisplayName(data.user.name || user.name)
          setEmail(data.user.email || user.email)
        }
      } catch (error) {
        console.error('Failed to load user data:', error)
      }
    }
    loadUserData()
  }, [user.name, user.email])

  // Handle profile save
  const handleSaveProfile = async () => {
    setIsSaving(true)
    setSaveSuccess(null)
    setSaveError(null)

    try {
      const response = await apiFetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: displayName,
          email: email
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update profile')
      }

      setSaveSuccess('Profile updated successfully!')
      setTimeout(() => setSaveSuccess(null), 3000)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save changes')
      setTimeout(() => setSaveError(null), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle settings save
  const handleSaveSettings = async (settings: { emailNotifications?: boolean, browserNotifications?: boolean, theme?: string }) => {
    try {
      const response = await apiFetch('/api/users/me/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update settings')
      }

      setSaveSuccess('Settings updated successfully!')
      setTimeout(() => setSaveSuccess(null), 3000)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save settings')
      setTimeout(() => setSaveError(null), 5000)
    }
  }

  // Handle notification changes
  const handleEmailNotificationChange = (checked: boolean) => {
    setEmailNotifications(checked)
    handleSaveSettings({ emailNotifications: checked })
  }

  const handleBrowserNotificationChange = (checked: boolean) => {
    setBrowserNotifications(checked)
    handleSaveSettings({ browserNotifications: checked })
  }

  // Handle theme changes
  const handleThemeChange = (newTheme: 'dark' | 'light' | 'auto') => {
    setTheme(newTheme)
    handleSaveSettings({ theme: newTheme })
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-bg-secondary border-b border-border-primary backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 backdrop-blur-sm">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-primary">Profile Settings</h1>
              <p className="text-text-secondary mt-1">Manage your account and preferences</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
        {/* Profile Information */}
        <Card className="bg-bg-secondary border-border-primary backdrop-blur-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <CardTitle>Profile Information</CardTitle>
            </div>
            <CardDescription>Your basic account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 backdrop-blur-sm">
                <User className="w-10 h-10 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-text-primary">{user.name}</h3>
                  <Badge variant="secondary">{user.role}</Badge>
                </div>
                <p className="text-sm text-text-secondary">Member since {user.joinedDate}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Display Name
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-bg-tertiary border-border-primary text-text-primary placeholder:text-text-tertiary"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Email Address
                </label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="bg-bg-tertiary border-border-primary text-text-primary placeholder:text-text-tertiary"
                />
              </div>
            </div>

            {user.walletAddress && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  Wallet Address
                </label>
                <Input value={user.walletAddress} readOnly className="bg-bg-tertiary border-border-primary text-text-secondary font-mono" />
              </div>
            )}

            <div className="flex justify-end pt-4">
              {saveSuccess && (
                <div className="flex items-center gap-2 text-green-400 text-sm mr-4">
                  <CheckCircle className="w-4 h-4" />
                  {saveSuccess}
                </div>
              )}
              {saveError && (
                <div className="flex items-center gap-2 text-red-400 text-sm mr-4">
                  <AlertCircle className="w-4 h-4" />
                  {saveError}
                </div>
              )}
              <Button
                variant="primary"
                className="gap-2"
                onClick={handleSaveProfile}
                disabled={isSaving}
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-bg-secondary border-border-primary backdrop-blur-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg border border-border-primary">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-text-primary">Email Notifications</h4>
                <p className="text-xs text-text-secondary mt-1">Receive updates about your assets and projects</p>
              </div>
              <Checkbox
                checked={emailNotifications}
                onChange={(e) => handleEmailNotificationChange(e.target.checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg border border-border-primary">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-text-primary">Browser Notifications</h4>
                <p className="text-xs text-text-secondary mt-1">Get real-time alerts in your browser</p>
              </div>
              <Checkbox
                checked={browserNotifications}
                onChange={(e) => handleBrowserNotificationChange(e.target.checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="bg-bg-secondary border-border-primary backdrop-blur-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>Customize your workspace theme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleThemeChange('dark')}
                className={`p-4 bg-bg-tertiary rounded-lg border-2 ${theme === 'dark' ? 'border-primary' : 'border-border-primary'} hover:border-primary/50 transition-all`}
              >
                <div className="w-full h-16 bg-gradient-to-br from-gray-900 to-gray-800 rounded mb-3 border border-border-primary"></div>
                <p className="text-sm font-medium text-text-primary">Dark</p>
                <p className="text-xs text-text-tertiary">Classic dark theme</p>
              </button>
              <button
                onClick={() => handleThemeChange('light')}
                className={`p-4 bg-bg-tertiary rounded-lg border-2 ${theme === 'light' ? 'border-primary' : 'border-border-primary'} hover:border-primary/50 transition-all`}
              >
                <div className="w-full h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded mb-3 border border-border-primary"></div>
                <p className="text-sm font-medium text-text-primary">Light</p>
                <p className="text-xs text-text-tertiary">Clean light theme</p>
              </button>
              <button
                onClick={() => handleThemeChange('auto')}
                className={`p-4 bg-bg-tertiary rounded-lg border-2 ${theme === 'auto' ? 'border-primary' : 'border-border-primary'} hover:border-primary/50 transition-all`}
              >
                <div className="w-full h-16 bg-gradient-to-br from-gray-900 via-gray-700 to-gray-100 rounded mb-3 border border-border-primary"></div>
                <p className="text-sm font-medium text-text-primary">Auto</p>
                <p className="text-xs text-text-tertiary">Match system</p>
              </button>
            </div>
          </CardContent>
        </Card>


        {/* Security */}
        <Card className="bg-bg-secondary border-border-primary backdrop-blur-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <CardTitle>Security</CardTitle>
            </div>
            <CardDescription>Manage your account security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg border border-border-primary">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-text-primary">Two-Factor Authentication</h4>
                <p className="text-xs text-text-secondary mt-1">Add an extra layer of security to your account</p>
              </div>
              <Badge variant="secondary">Not enabled</Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg border border-border-primary">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-text-primary">Active Sessions</h4>
                <p className="text-xs text-text-secondary mt-1">Manage devices with access to your account</p>
              </div>
              <Button variant="ghost" size="sm">View</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
