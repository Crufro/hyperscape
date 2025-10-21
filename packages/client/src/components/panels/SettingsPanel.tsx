/**
 * Settings Panel
 * Modern tab-based settings interface with General and Advanced sections
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { isTouch } from '@hyperscape/shared'
import type { ClientWorld } from '../../types'
import { useFullscreen } from '../useFullscreen'
import {
  FieldBtn,
  FieldRange,
  FieldSwitch,
  FieldText,
  FieldToggle,
} from '../Fields'

interface SettingsPanelProps {
  world: ClientWorld
}

type TabType = 'general' | 'advanced'

const shadowOptions = [
  { label: 'None', value: 'none' },
  { label: 'Low', value: 'low' },
  { label: 'Med', value: 'med' },
  { label: 'High', value: 'high' },
]

  const changeName = (name: string) => {
    if (!name) return setName(player!.name || '')
    player!.name = name
  }

  // Sync music preference with localStorage
  useEffect(() => {
    const updateMusicEnabled = () => {
      const enabled = music > 0
      localStorage.setItem('music_enabled', String(enabled))
    }
    updateMusicEnabled()
  }, [music])

  const dprOptions = useMemo(() => {
    const dpr = window.devicePixelRatio
    const options: Array<{label: string; value: number}> = []
    const add = (label: string, dpr: number) => {
      options.push({
        label,
        value: dpr,
      })
    }
    add('0.5x', 0.5)
    add('1x', 1)
    if (dpr >= 2) add('2x', 2)
    if (dpr >= 3) add('3x', dpr)
    return options
  }, [])

  useEffect(() => {
    const onPrefsChange = (c: unknown) => {
      const changes = c as Record<string, { value: unknown }>
      if (changes.dpr) setDPR(changes.dpr.value as number)
      if (changes.shadows) setShadows(changes.shadows.value as string)
      if (changes.postprocessing) setPostprocessing(changes.postprocessing.value as boolean)
      if (changes.bloom) setBloom(changes.bloom.value as boolean)
      if (changes.music) setMusic(changes.music.value as number)
      if (changes.sfx) setSFX(changes.sfx.value as number)
      if (changes.voice) setVoice(changes.voice.value as number)
      if (changes.ui) setUI(changes.ui.value as number)
      if (changes.stats) setStats(changes.stats.value as boolean)
    }
    prefs?.on?.('change', onPrefsChange)
    return () => {
      prefs?.off?.('change', onPrefsChange)
    }
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
            style={{
              color: '#f2d08a',
              fontSize: 'clamp(0.813rem, 1.6vw, 0.938rem)',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
            }}
          >
            SETTINGS
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1">
          {(['general', 'advanced'] as TabType[]).map((tab) => (
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
      <div className="flex-1 overflow-y-auto noscrollbar">
        <div className="flex flex-col" style={{ gap: 'clamp(0.4rem, 1vw, 0.5rem)' }}>

          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <>
              {/* Quick Settings */}
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
                  Quick Actions
                </div>
                <div className="space-y-2">
                  {/* Fullscreen Toggle */}
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'rgba(242, 208, 138, 0.85)', fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)' }}>
                      Fullscreen Mode
                    </span>
                    <button
                      onClick={() => { if (canFullscreen) toggleFullscreen(!(isFullscreen as boolean)) }}
                      className="rounded px-3 py-1.5 cursor-pointer transition-all duration-150 font-medium"
                      style={{
                        background: (isFullscreen as boolean)
                          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.25) 0%, rgba(34, 197, 94, 0.15) 100%)'
                          : 'rgba(107, 114, 128, 0.2)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: (isFullscreen as boolean) ? 'rgba(34, 197, 94, 0.4)' : 'rgba(107, 114, 128, 0.4)',
                        color: (isFullscreen as boolean) ? '#22c55e' : '#9ca3af',
                        fontSize: 'clamp(0.625rem, 1.2vw, 0.688rem)',
                        minHeight: '32px',
                      }}
                    >
                      {(isFullscreen as boolean) ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {/* Performance Stats Toggle */}
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'rgba(242, 208, 138, 0.85)', fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)' }}>
                      Performance Stats
                    </span>
                    <button
                      onClick={() => {
                        const next = !stats
                        setStats(next)
                        world.prefs!.setStats(next)
                      }}
                      className="rounded px-3 py-1.5 cursor-pointer transition-all duration-150 font-medium"
                      style={{
                        background: stats
                          ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.25) 0%, rgba(34, 197, 94, 0.15) 100%)'
                          : 'rgba(107, 114, 128, 0.2)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: stats ? 'rgba(34, 197, 94, 0.4)' : 'rgba(107, 114, 128, 0.4)',
                        color: stats ? '#22c55e' : '#9ca3af',
                        fontSize: 'clamp(0.625rem, 1.2vw, 0.688rem)',
                        minHeight: '32px',
                      }}
                    >
                      {stats ? 'Shown' : 'Hidden'}
                    </button>
                  </div>

                  {/* Hide Interface Button */}
                  {!isTouch && (
                    <button
                      onClick={() => world.ui?.toggleVisible()}
                      className="w-full rounded px-3 py-2 cursor-pointer transition-all duration-150 font-medium"
                      style={{
                        background: 'linear-gradient(135deg, rgba(139, 69, 19, 0.35) 0%, rgba(139, 69, 19, 0.25) 100%)',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: 'rgba(139, 69, 19, 0.5)',
                        color: '#f2d08a',
                        fontSize: 'clamp(0.625rem, 1.2vw, 0.688rem)',
                        minHeight: '36px',
                      }}
                    >
                      Hide Interface (Press Z)
                    </button>
                  )}
                </div>
              </div>

              {/* Interface Settings */}
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
                  Interface
                </div>
                <div className="space-y-3">
                  {/* UI Scale */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ color: 'rgba(242, 208, 138, 0.85)', fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)' }}>
                        UI Scale
                      </span>
                      <span style={{ color: 'rgba(242, 208, 138, 0.6)', fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)' }}>
                        {ui.toFixed(1)}x
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.6}
                      max={1.6}
                      step={0.05}
                      value={ui}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        setUI(v)
                        world.prefs!.setUI(v)
                      }}
                      className="w-full"
                      style={{
                        accentColor: '#f2d08a',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Audio Settings */}
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
                  Audio & Sound
                </div>
                <div className="space-y-3">
                  {/* Music Volume */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ color: 'rgba(242, 208, 138, 0.85)', fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)' }}>
                        Music Volume
                      </span>
                      <span style={{ color: 'rgba(242, 208, 138, 0.6)', fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)' }}>
                        {Math.round(music * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.05}
                      value={music}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        setMusic(v)
                        world.prefs?.setMusic(v)
                      }}
                      className="w-full"
                      style={{
                        accentColor: '#f2d08a',
                      }}
                    />
                  </div>

                  {/* Effects Volume */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ color: 'rgba(242, 208, 138, 0.85)', fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)' }}>
                        Effects Volume
                      </span>
                      <span style={{ color: 'rgba(242, 208, 138, 0.6)', fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)' }}>
                        {Math.round(sfx * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.05}
                      value={sfx}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        setSFX(v)
                        world.prefs?.setSFX(v)
                      }}
                      className="w-full"
                      style={{
                        accentColor: '#f2d08a',
                      }}
                    />
                  </div>

                  {/* Voice Chat Volume */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ color: 'rgba(242, 208, 138, 0.85)', fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)' }}>
                        Voice Chat Volume
                      </span>
                      <span style={{ color: 'rgba(242, 208, 138, 0.6)', fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)' }}>
                        {Math.round(voice * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2}
                      step={0.05}
                      value={voice}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        setVoice(v)
                        world.prefs?.setVoice(v)
                      }}
                      className="w-full"
                      style={{
                        accentColor: '#f2d08a',
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ADVANCED TAB */}
          {activeTab === 'advanced' && (
            <>
              {/* Character Settings */}
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
                  Character
                </div>
                <FieldText
                  label='Character Name'
                  hint='Change your character name in the game'
                  value={name}
                  onChange={changeName}
                />
              </div>

              {/* Rendering Backend Info */}
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
                  Rendering Backend
                </div>
                <div className="flex items-center gap-2">
                  <span style={{
                    color: world.graphics?.isWebGPU ? '#22c55e' : '#60a5fa',
                    fontSize: 'clamp(0.75rem, 1.3vw, 0.813rem)',
                    fontWeight: '600'
                  }}>
                    {world.graphics?.isWebGPU ? '⚡ WebGPU' : '🔷 WebGL 2'}
                  </span>
                  <span style={{
                    color: 'rgba(242, 208, 138, 0.5)',
                    fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)'
                  }}>
                    {world.graphics?.isWebGPU ? '(Modern, High Performance)' : '(Universal Compatibility)'}
                  </span>
                </div>
              </div>

              {/* Visual Quality */}
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
                  Visual Quality
                </div>
                <div className="space-y-3">
                  <FieldSwitch
                    label='Resolution'
                    hint='Change your display resolution for better performance or quality'
                    options={dprOptions}
                    value={dpr}
                    onChange={dpr => world.prefs?.setDPR(dpr as number)}
                  />
                  <FieldSwitch
                    label='Shadow Quality'
                    hint='Change the quality of shadows cast by objects and characters'
                    options={shadowOptions}
                    value={shadows}
                    onChange={shadows => world.prefs?.setShadows(shadows as string)}
                  />
                  <FieldToggle
                    label='Post-Processing'
                    hint='Enable advanced visual effects like bloom and ambient occlusion'
                    trueLabel='Enabled'
                    falseLabel='Disabled'
                    value={postprocessing}
                    onChange={postprocessing => {
                      world.prefs?.setPostprocessing(postprocessing)
                    }}
                  />
                  {postprocessing && (
                    <FieldToggle
                      label='Bloom Effect'
                      hint='Enable glowing effects on bright and magical objects'
                      trueLabel='Enabled'
                      falseLabel='Disabled'
                      value={bloom}
                      onChange={bloom => {
                        world.prefs?.setBloom(bloom)
                      }}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
