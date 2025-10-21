/**
 * Combat Panel
 * Modern MMORPG-style combat interface with attack styles and combat level
 */

import React, { useEffect, useState } from 'react'
import { PlayerMigration, WeaponType, EventType } from '@hyperscape/shared'
import type { ClientWorld, PlayerStats, PlayerEquipmentItems } from '../../types'

interface CombatPanelProps {
  world: ClientWorld
  stats: PlayerStats | null
  equipment: PlayerEquipmentItems | null
}

export function CombatPanel({ world, stats, equipment }: CombatPanelProps) {
  const [style, setStyle] = useState<string>('accurate')
  const [cooldown, setCooldown] = useState<number>(0)
  const combatLevel = stats?.combatLevel || (stats?.skills ? PlayerMigration.calculateCombatLevel(stats.skills) : 1)

  useEffect(() => {
    const playerId = world.entities?.player?.id
    if (!playerId) return

    const actions = world.getSystem('actions') as { actionMethods?: {
      getAttackStyleInfo?: (id: string, cb: (info: { style: string; cooldown?: number }) => void) => void
      changeAttackStyle?: (id: string, style: string) => void
    }} | null

    actions?.actionMethods?.getAttackStyleInfo?.(playerId, (info: { style: string; cooldown?: number }) => {
      if (info) {
        setStyle(info.style)
        setCooldown(info.cooldown || 0)
      }
    })
    const onUpdate = (data: unknown) => {
      const d = data as { playerId: string; currentStyle: { id: string } }
      if (d.playerId !== playerId) return
      setStyle(d.currentStyle.id)
    }
    const onChanged = (data: unknown) => {
      const d = data as { playerId: string; currentStyle: { id: string } }
      if (d.playerId !== playerId) return
      setStyle(d.currentStyle.id)
    }
    world.on(EventType.UI_ATTACK_STYLE_UPDATE, onUpdate, undefined)
    world.on(EventType.UI_ATTACK_STYLE_CHANGED, onChanged, undefined)
    return () => {
      world.off(EventType.UI_ATTACK_STYLE_UPDATE, onUpdate, undefined, undefined)
      world.off(EventType.UI_ATTACK_STYLE_CHANGED, onChanged, undefined, undefined)
    }
  }, [world])

  const changeStyle = (next: string) => {
    const playerId = world.entities?.player?.id
    if (!playerId) return

    const actions = world.getSystem('actions') as { actionMethods?: {
      changeAttackStyle?: (id: string, style: string) => void
    }} | null

    actions?.actionMethods?.changeAttackStyle?.(playerId, next)
  }

  // Determine if ranged weapon equipped; if so, limit to ranged/defense like RS
  const isRanged = !!(equipment?.arrows || (equipment?.weapon && (equipment.weapon.weaponType === WeaponType.BOW || equipment.weapon.weaponType === WeaponType.CROSSBOW)))
  const styles: Array<{ id: string; label: string; icon: string; description: string }> = isRanged
    ? [
        { id: 'accurate', label: 'Ranged', icon: '🏹', description: 'Accurate ranged attacks' },
        { id: 'defensive', label: 'Defensive', icon: '🛡️', description: 'Defensive stance' },
      ]
    : [
        { id: 'accurate', label: 'Accurate', icon: '🎯', description: 'Precise melee attacks' },
        { id: 'aggressive', label: 'Aggressive', icon: '⚔️', description: 'Powerful strikes' },
        { id: 'defensive', label: 'Defensive', icon: '🛡️', description: 'Defensive stance' },
      ]

  return (
    <div className="flex flex-col h-full" style={{ gap: 'clamp(0.3rem, 0.7vw, 0.4rem)' }}>
      {/* Header */}
      <div
        className="border rounded transition-all duration-200"
        style={{
          background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.98) 0%, rgba(30, 25, 40, 0.95) 100%)',
          borderColor: 'rgba(242, 208, 138, 0.5)',
          borderWidth: '2px',
          padding: 'clamp(0.375rem, 0.9vw, 0.5rem)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(242, 208, 138, 0.1)',
        }}
      >
        <div className="flex items-center justify-between">
          <div
            className="font-bold tracking-wide"
            style={{
              color: '#f2d08a',
              fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
            }}
          >
            COMBAT
          </div>
          <div className="flex items-center" style={{ gap: 'clamp(0.25rem, 0.5vw, 0.3rem)' }}>
            <span
              style={{
                color: 'rgba(242, 208, 138, 0.7)',
                fontSize: 'clamp(0.563rem, 1vw, 0.625rem)',
              }}
            >
              Level
            </span>
            <span
              className="font-bold"
              style={{
                color: '#f2d08a',
                fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
              }}
            >
              {combatLevel}
            </span>
          </div>
        </div>
      </div>

      {/* Attack Styles */}
      <div className="flex-1 overflow-y-auto noscrollbar">
        <div
          className="border rounded transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(25, 20, 35, 0.92) 100%)',
            borderColor: 'rgba(242, 208, 138, 0.35)',
            padding: 'clamp(0.375rem, 0.9vw, 0.5rem)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div
            className="uppercase tracking-wide mb-2 opacity-60"
            style={{
              color: '#f2d08a',
              fontSize: 'clamp(0.563rem, 1vw, 0.625rem)',
            }}
          >
            Attack Style
          </div>

          <div className="flex flex-col" style={{ gap: 'clamp(0.3rem, 0.7vw, 0.4rem)' }}>
            {styles.map(s => (
              <button
                key={s.id}
                onClick={() => changeStyle(s.id)}
                disabled={cooldown > 0}
                className="rounded transition-all duration-200 text-left"
                style={{
                  background: style === s.id
                    ? 'linear-gradient(135deg, rgba(242, 208, 138, 0.2) 0%, rgba(242, 208, 138, 0.15) 100%)'
                    : 'rgba(0, 0, 0, 0.35)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: style === s.id ? 'rgba(242, 208, 138, 0.7)' : 'rgba(242, 208, 138, 0.25)',
                  padding: 'clamp(0.3rem, 0.7vw, 0.375rem)',
                  boxShadow: style === s.id
                    ? '0 2px 4px rgba(242, 208, 138, 0.2), inset 0 1px 0 rgba(242, 208, 138, 0.1)'
                    : 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
                  cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
                  opacity: cooldown > 0 ? 0.6 : 1,
                }}
              >
                <div className="flex items-center" style={{ gap: 'clamp(0.375rem, 0.8vw, 0.5rem)' }}>
                  <span style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)' }}>
                    {s.icon}
                  </span>
                  <div className="flex-1">
                    <div
                      className="font-semibold"
                      style={{
                        color: style === s.id ? '#f2d08a' : 'rgba(242, 208, 138, 0.8)',
                        fontSize: 'clamp(0.688rem, 1.2vw, 0.75rem)',
                      }}
                    >
                      {s.label}
                    </div>
                    <div
                      className="opacity-75"
                      style={{
                        color: style === s.id ? 'rgba(242, 208, 138, 0.8)' : 'rgba(242, 208, 138, 0.6)',
                        fontSize: 'clamp(0.563rem, 1vw, 0.625rem)',
                      }}
                    >
                      {s.description}
                    </div>
                  </div>
                  {style === s.id && (
                    <div
                      style={{
                        color: '#f2d08a',
                        fontSize: 'clamp(0.875rem, 1.8vw, 1.125rem)',
                      }}
                    >
                      ✓
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Cooldown Warning */}
          {cooldown > 0 && (
            <div
              className="mt-2 rounded flex items-center"
              style={{
                background: 'rgba(251, 191, 36, 0.1)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'rgba(251, 191, 36, 0.3)',
                padding: 'clamp(0.3rem, 0.7vw, 0.375rem)',
                gap: 'clamp(0.25rem, 0.5vw, 0.3rem)',
              }}
            >
              <span style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}>⏱️</span>
              <span
                style={{
                  color: '#fbbf24',
                  fontSize: 'clamp(0.563rem, 1vw, 0.625rem)',
                }}
              >
                Style change in {Math.ceil(cooldown / 1000)}s
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
