/**
 * Account Management Panel
 * Shows login status, user info, and account controls
 */

import React, { useEffect, useState } from 'react'
import type { ClientWorld } from '../../types'
import { privyAuthManager } from '../../PrivyAuthManager'

interface AccountPanelProps {
  world: ClientWorld
}

type TabType = 'profile' | 'stats'

export function AccountPanel({ world }: AccountPanelProps) {
  const [authState, setAuthState] = useState(privyAuthManager.getState())
  const [playerName, setPlayerName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const [sessionStartTime] = useState(Date.now())

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = privyAuthManager.subscribe(setAuthState)
    return unsubscribe
  }, [])

  // Get player name from world
  useEffect(() => {
    const worldWithEntities = world as ClientWorld & { entities?: { player?: { name?: string } } }
    const player = worldWithEntities.entities?.player
    if (player?.name) {
      setPlayerName(player.name)
      setTempName(player.name)
    }
  }, [world])

  const handleLogout = async () => {
    // Use global Privy logout
    const windowWithLogout = window as typeof window & { privyLogout: () => void }
    await windowWithLogout.privyLogout()

    // Clear auth state
    privyAuthManager.clearAuth()

    // Reload page after logout
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  const handleNameChange = () => {
    if (tempName && tempName !== playerName) {
      const worldWithEntities = world as ClientWorld & { entities?: { player?: { name?: string } }; network?: { send: (type: string, data: unknown) => void } }
      const player = worldWithEntities.entities?.player
      if (player) {
        player.name = tempName
        setPlayerName(tempName)
        setIsEditingName(false)

        // Send name update to server
        world.network?.send?.('chat', {
          type: 'system',
          message: `Changed name to ${tempName}`
        })
      }
    } else {
      setIsEditingName(false)
      setTempName(playerName)
    }
  }

  // Get user info from authState (works with or without Privy)
  const authenticated = authState.isAuthenticated
  const userId = authState.privyUserId
  const walletAddress = (authState.user as { wallet?: { address?: string } })?.wallet?.address
  const farcasterFid = authState.farcasterFid
  const email = (authState.user as { email?: { address?: string } })?.email?.address

  // Get player stats from world
  const player = (world as ClientWorld & { entities?: { player?: { position?: { x: number; y: number; z: number } }; players?: Map<unknown, unknown> } }).entities?.player
  const position = player?.position
  const health = (player as { health?: { current: number; max: number } })?.health
  const playTime = Math.floor((Date.now() - sessionStartTime) / 1000 / 60) // minutes
  const fps = Math.round(1000 / (world.fixedDeltaTime * 1000)) // Approximate FPS

  // Get players online count
  const worldWithEntities = world as ClientWorld & { entities?: { players?: Map<unknown, unknown> } }
  const playersOnline = worldWithEntities.entities?.players ? worldWithEntities.entities.players.size : 0

  // Get world time/frame info
  const worldTime = Math.floor(world.time)
  const frameCount = world.frame

  return (
    <div className="flex flex-col h-full" style={{ gap: 'clamp(0.4rem, 1vw, 0.5rem)' }}>
      {/* Header with Status and Tabs */}
      <div
        className="border rounded-lg transition-all duration-200"
        style={{
          background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.98) 0%, rgba(30, 25, 40, 0.95) 100%)',
          borderColor: 'rgba(242, 208, 138, 0.5)',
          borderWidth: '2px',
          padding: 'clamp(0.5rem, 1.2vw, 0.625rem)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(242, 208, 138, 0.1)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div
            className="font-bold tracking-wide"
            style={{
              color: '#f2d08a',
              fontSize: 'clamp(0.813rem, 1.6vw, 0.938rem)',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
            }}
          >
            ACCOUNT
          </div>
          <div
            className={`px-2 py-1 rounded-full text-xs font-semibold ${authenticated ? 'bg-green-900/40 text-green-300' : 'bg-gray-800/40 text-gray-400'}`}
            role="status"
            aria-live="polite"
            style={{
              borderWidth: '1px',
              borderColor: authenticated ? 'rgba(34, 197, 94, 0.4)' : 'rgba(107, 114, 128, 0.4)',
              fontSize: 'clamp(0.625rem, 1.2vw, 0.688rem)',
            }}
          >
            {authenticated ? '✓ LOGGED IN' : '○ GUEST'}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1">
          {(['profile', 'stats'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-1.5 px-2 rounded cursor-pointer transition-all duration-200 font-medium uppercase tracking-wide"
              style={{
                background: activeTab === tab
                  ? 'linear-gradient(135deg, rgba(242, 208, 138, 0.2) 0%, rgba(242, 208, 138, 0.15) 100%)'
                  : 'rgba(20, 20, 30, 0.5)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: activeTab === tab ? 'rgba(242, 208, 138, 0.5)' : 'rgba(242, 208, 138, 0.2)',
                color: activeTab === tab ? '#f2d08a' : 'rgba(242, 208, 138, 0.5)',
                fontSize: 'clamp(0.563rem, 1vw, 0.625rem)',
                boxShadow: activeTab === tab ? '0 2px 4px rgba(0, 0, 0, 0.4)' : 'none',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col" style={{ gap: 'clamp(0.4rem, 1vw, 0.5rem)' }}>

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <>
              {/* Character Name */}
              <div
                className="border rounded-lg transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(25, 20, 35, 0.92) 100%)',
                  borderColor: 'rgba(242, 208, 138, 0.35)',
                  padding: 'clamp(0.5rem, 1.2vw, 0.625rem)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                }}
              >
                {!isEditingName ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-xs uppercase tracking-wide mb-1 opacity-60"
                        style={{
                          color: '#f2d08a',
                          fontSize: 'clamp(0.563rem, 1vw, 0.625rem)',
                        }}
                      >
                        Character
                      </div>
                      <div
                        className="font-semibold truncate"
                        style={{
                          color: '#f2d08a',
                          fontSize: 'clamp(0.75rem, 1.4vw, 0.813rem)',
                        }}
                      >
                        {playerName || 'Unknown'}
                      </div>
                    </div>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="rounded px-2 py-1.5 cursor-pointer transition-all duration-150 hover:brightness-110 flex-shrink-0"
                      style={{
                        backgroundColor: 'rgba(242, 208, 138, 0.12)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: 'rgba(242, 208, 138, 0.4)',
                        color: '#f2d08a',
                        fontSize: 'clamp(0.625rem, 1.2vw, 0.688rem)',
                        minHeight: '32px',
                      }}
                      aria-label="Edit character name"
                    >
                      Edit
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="w-full py-1.5 px-2 bg-black/30 border rounded"
                      style={{
                        borderColor: 'rgba(242, 208, 138, 0.4)',
                        color: '#f2d08a',
                        fontSize: 'clamp(0.688rem, 1.2vw, 0.75rem)',
                      }}
                      placeholder="Character name..."
                      maxLength={20}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleNameChange()
                        if (e.key === 'Escape') {
                          setIsEditingName(false)
                          setTempName(playerName)
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleNameChange}
                        className="flex-1 rounded px-2 py-1.5 cursor-pointer transition-all duration-150 hover:brightness-110 font-medium"
                        style={{
                          backgroundColor: 'rgba(34, 197, 94, 0.2)',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: 'rgba(34, 197, 94, 0.4)',
                          color: '#22c55e',
                          fontSize: 'clamp(0.625rem, 1.2vw, 0.688rem)',
                          minHeight: '32px',
                        }}
                        aria-label="Save character name"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingName(false)
                          setTempName(playerName)
                        }}
                        className="flex-1 rounded px-2 py-1.5 cursor-pointer transition-all duration-150 hover:brightness-110"
                        style={{
                          backgroundColor: 'rgba(107, 114, 128, 0.2)',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: 'rgba(107, 114, 128, 0.4)',
                          color: '#9ca3af',
                          fontSize: 'clamp(0.625rem, 1.2vw, 0.688rem)',
                          minHeight: '32px',
                        }}
                        aria-label="Cancel editing"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Info - Condensed */}
              {authenticated && userId && (
                <div
                  className="border rounded-lg transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(25, 20, 35, 0.92) 100%)',
                    borderColor: 'rgba(242, 208, 138, 0.35)',
                    padding: 'clamp(0.5rem, 1.2vw, 0.625rem)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                  }}
                >
                  <div
                    className="text-xs uppercase tracking-wide mb-2 opacity-60"
                    style={{
                      color: '#f2d08a',
                      fontSize: 'clamp(0.563rem, 1vw, 0.625rem)',
                    }}
                  >
                    Account Details
                  </div>

                  <div className="space-y-1.5" style={{ fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)' }}>
                    <div className="flex items-center gap-2">
                      <span className="opacity-60" style={{ color: '#f2d08a', minWidth: '40px' }}>ID:</span>
                      <span className="font-mono text-xs truncate" style={{ color: 'rgba(242, 208, 138, 0.85)' }}>
                        {userId.substring(0, 16)}...
                      </span>
                    </div>

                    {walletAddress && (
                      <div className="flex items-center gap-2">
                        <span className="opacity-60" style={{ color: '#f2d08a', minWidth: '40px' }}>Wallet:</span>
                        <span className="font-mono text-xs" style={{ color: 'rgba(242, 208, 138, 0.85)' }}>
                          {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                        </span>
                      </div>
                    )}

                    {email && (
                      <div className="flex items-center gap-2">
                        <span className="opacity-60" style={{ color: '#f2d08a', minWidth: '40px' }}>Email:</span>
                        <span className="text-xs truncate" style={{ color: 'rgba(242, 208, 138, 0.85)' }}>
                          {email}
                        </span>
                      </div>
                    )}

                    {farcasterFid && (
                      <div className="flex items-center gap-2">
                        <span className="opacity-60" style={{ color: '#f2d08a', minWidth: '40px' }}>FC:</span>
                        <span className="text-xs" style={{ color: 'rgba(242, 208, 138, 0.85)' }}>
                          🎭 {farcasterFid}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Guest Mode Notice */}
              {!authenticated && (
                <div
                  className="border rounded-lg transition-all duration-200"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139, 69, 19, 0.15) 0%, rgba(139, 69, 19, 0.08) 100%)',
                    borderColor: 'rgba(139, 69, 19, 0.4)',
                    padding: 'clamp(0.5rem, 1.2vw, 0.625rem)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                  }}
                  role="status"
                >
                  <div
                    className="text-xs leading-relaxed"
                    style={{
                      color: 'rgba(242, 208, 138, 0.75)',
                      fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)',
                    }}
                  >
                    Playing as guest. Progress won't sync across devices.
                  </div>
                </div>
              )}

              {/* Session Summary */}
              <div
                className="border rounded-lg transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(25, 20, 35, 0.92) 100%)',
                  borderColor: 'rgba(242, 208, 138, 0.35)',
                  padding: 'clamp(0.5rem, 1.2vw, 0.625rem)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                }}
              >
                <div
                  className="text-xs uppercase tracking-wide mb-2 opacity-60"
                  style={{
                    color: '#f2d08a',
                    fontSize: 'clamp(0.563rem, 1vw, 0.625rem)',
                  }}
                >
                  Current Session
                </div>
                <div className="space-y-1.5" style={{ fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)' }}>
                  <div className="flex items-center justify-between">
                    <span className="opacity-60" style={{ color: '#f2d08a' }}>Online Players:</span>
                    <span className="font-semibold" style={{ color: 'rgba(242, 208, 138, 0.9)' }}>
                      {playersOnline}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="opacity-60" style={{ color: '#f2d08a' }}>Play Time:</span>
                    <span className="font-semibold" style={{ color: 'rgba(242, 208, 138, 0.9)' }}>
                      {playTime} min
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="opacity-60" style={{ color: '#f2d08a' }}>Performance:</span>
                    <span className="font-semibold" style={{ color: 'rgba(242, 208, 138, 0.9)' }}>
                      {fps} FPS
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Features */}
              <div
                className="border rounded-lg transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(25, 20, 35, 0.92) 100%)',
                  borderColor: 'rgba(242, 208, 138, 0.35)',
                  padding: 'clamp(0.5rem, 1.2vw, 0.625rem)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                }}
              >
                <div
                  className="text-xs uppercase tracking-wide mb-2 opacity-60"
                  style={{
                    color: '#f2d08a',
                    fontSize: 'clamp(0.563rem, 1vw, 0.625rem)',
                  }}
                >
                  Account Features
                </div>
                <div
                  className="grid grid-cols-2 gap-2"
                  style={{
                    fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)',
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={authenticated ? 'text-green-400' : 'text-gray-600'} aria-hidden="true">
                      {authenticated ? '✓' : '○'}
                    </span>
                    <span style={{ color: 'rgba(242, 208, 138, 0.75)' }}>Cloud Sync</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={authenticated ? 'text-green-400' : 'text-gray-600'} aria-hidden="true">
                      {authenticated ? '✓' : '○'}
                    </span>
                    <span style={{ color: 'rgba(242, 208, 138, 0.75)' }}>Save Data</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={authenticated ? 'text-green-400' : 'text-gray-600'} aria-hidden="true">
                      {authenticated ? '✓' : '○'}
                    </span>
                    <span style={{ color: 'rgba(242, 208, 138, 0.75)' }}>Recovery</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={farcasterFid ? 'text-green-400' : 'text-gray-600'} aria-hidden="true">
                      {farcasterFid ? '✓' : '○'}
                    </span>
                    <span style={{ color: 'rgba(242, 208, 138, 0.75)' }}>Farcaster</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={walletAddress ? 'text-green-400' : 'text-gray-600'} aria-hidden="true">
                      {walletAddress ? '✓' : '○'}
                    </span>
                    <span style={{ color: 'rgba(242, 208, 138, 0.75)' }}>Web3 Wallet</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={email ? 'text-green-400' : 'text-gray-600'} aria-hidden="true">
                      {email ? '✓' : '○'}
                    </span>
                    <span style={{ color: 'rgba(242, 208, 138, 0.75)' }}>Email Link</span>
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              {authenticated && (
                <button
                  onClick={handleLogout}
                  className="rounded-lg py-1.5 px-3 cursor-pointer font-semibold transition-all duration-150 hover:brightness-110"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139, 69, 19, 0.35) 0%, rgba(139, 69, 19, 0.25) 100%)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'rgba(139, 69, 19, 0.5)',
                    color: '#f2d08a',
                    fontSize: 'clamp(0.688rem, 1.3vw, 0.75rem)',
                    minHeight: '36px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                  }}
                  aria-label="Log out of your account"
                >
                  LOGOUT
                </button>
              )}
            </>
          )}

          {/* STATS TAB */}
          {activeTab === 'stats' && (
            <>
              {/* Session Info */}
              <div
                className="border rounded-lg transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(25, 20, 35, 0.92) 100%)',
                  borderColor: 'rgba(242, 208, 138, 0.35)',
                  padding: 'clamp(0.5rem, 1.2vw, 0.625rem)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                }}
              >
                <div
                  className="text-xs uppercase tracking-wide mb-2 opacity-60"
                  style={{
                    color: '#f2d08a',
                    fontSize: 'clamp(0.563rem, 1vw, 0.625rem)',
                  }}
                >
                  Session Info
                </div>
                <div className="space-y-1.5" style={{ fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)' }}>
                  <div className="flex items-center justify-between">
                    <span className="opacity-60" style={{ color: '#f2d08a' }}>Play Time:</span>
                    <span className="font-semibold" style={{ color: 'rgba(242, 208, 138, 0.9)' }}>
                      {playTime} min
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="opacity-60" style={{ color: '#f2d08a' }}>FPS:</span>
                    <span className="font-semibold" style={{ color: 'rgba(242, 208, 138, 0.9)' }}>
                      {fps}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="opacity-60" style={{ color: '#f2d08a' }}>Players Online:</span>
                    <span className="font-semibold" style={{ color: 'rgba(242, 208, 138, 0.9)' }}>
                      {playersOnline}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="opacity-60" style={{ color: '#f2d08a' }}>Position:</span>
                    <span className="font-mono text-xs" style={{ color: 'rgba(242, 208, 138, 0.9)' }}>
                      {position ? `${Math.round(position.x)}, ${Math.round(position.y)}, ${Math.round(position.z)}` : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              {/* World Info */}
              <div
                className="border rounded-lg transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(25, 20, 35, 0.92) 100%)',
                  borderColor: 'rgba(242, 208, 138, 0.35)',
                  padding: 'clamp(0.5rem, 1.2vw, 0.625rem)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                }}
              >
                <div
                  className="text-xs uppercase tracking-wide mb-2 opacity-60"
                  style={{
                    color: '#f2d08a',
                    fontSize: 'clamp(0.563rem, 1vw, 0.625rem)',
                  }}
                >
                  World Info
                </div>
                <div className="space-y-1.5" style={{ fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)' }}>
                  <div className="flex items-center justify-between">
                    <span className="opacity-60" style={{ color: '#f2d08a' }}>World Time:</span>
                    <span className="font-semibold" style={{ color: 'rgba(242, 208, 138, 0.9)' }}>
                      {worldTime}s
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="opacity-60" style={{ color: '#f2d08a' }}>Frame Count:</span>
                    <span className="font-semibold" style={{ color: 'rgba(242, 208, 138, 0.9)' }}>
                      {frameCount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="opacity-60" style={{ color: '#f2d08a' }}>Server ID:</span>
                    <span className="font-mono text-xs truncate" style={{ color: 'rgba(242, 208, 138, 0.9)' }}>
                      {world.id.substring(0, 12)}...
                    </span>
                  </div>
                </div>
              </div>

              {/* Character Stats */}
              <div
                className="border rounded-lg transition-all duration-200"
                style={{
                  background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(25, 20, 35, 0.92) 100%)',
                  borderColor: 'rgba(242, 208, 138, 0.35)',
                  padding: 'clamp(0.5rem, 1.2vw, 0.625rem)',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
                }}
              >
                <div
                  className="text-xs uppercase tracking-wide mb-2 opacity-60"
                  style={{
                    color: '#f2d08a',
                    fontSize: 'clamp(0.563rem, 1vw, 0.625rem)',
                  }}
                >
                  Character Stats
                </div>
                {health ? (
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-1" style={{ fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)' }}>
                        <span className="opacity-60" style={{ color: '#f2d08a' }}>Health</span>
                        <span className="font-semibold" style={{ color: 'rgba(242, 208, 138, 0.9)' }}>
                          {health.current} / {health.max}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
                          style={{ width: `${(health.current / health.max) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2" style={{ color: 'rgba(242, 208, 138, 0.6)', fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)' }}>
                    Health data not available
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
