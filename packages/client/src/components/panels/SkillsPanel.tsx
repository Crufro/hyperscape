
interface SkillsPanelProps {
  world: ClientWorld
  stats: PlayerStats | null
}

interface SkillItem {
  key: string
  label: string
  icon: string
  level: number
  xp: number
}

export function SkillsPanel({ world, stats }: SkillsPanelProps) {
  const s = stats?.skills || ({} as NonNullable<PlayerStats['skills']>)
  const items: SkillItem[] = [
    { key: 'attack', label: 'Attack', icon: '⚔️', level: s?.attack?.level || 1, xp: s?.attack?.xp || 0 },
    { key: 'constitution', label: 'Constitution', icon: '❤️', level: Math.max(10, s?.constitution?.level || 10), xp: s?.constitution?.xp || 0 },
    { key: 'strength', label: 'Strength', icon: '💪', level: s?.strength?.level || 1, xp: s?.strength?.xp || 0 },
    { key: 'defense', label: 'Defense', icon: '🛡️', level: s?.defense?.level || 1, xp: s?.defense?.xp || 0 },
    { key: 'ranged', label: 'Ranged', icon: '🏹', level: s?.ranged?.level || 1, xp: s?.ranged?.xp || 0 },
    { key: 'woodcutting', label: 'Woodcutting', icon: '🪓', level: s?.woodcutting?.level || 1, xp: s?.woodcutting?.xp || 0 },
    { key: 'fishing', label: 'Fishing', icon: '🎣', level: s?.fishing?.level || 1, xp: s?.fishing?.xp || 0 },
    { key: 'firemaking', label: 'Firemaking', icon: '🔥', level: s?.firemaking?.level || 1, xp: s?.firemaking?.xp || 0 },
    { key: 'cooking', label: 'Cooking', icon: '🍳', level: s?.cooking?.level || 1, xp: s?.cooking?.xp || 0 }
  ]
  const totalLevel = items.reduce((sum, it) => sum + (it.level || 1), 0)
  const totalXP = items.reduce((sum, it) => sum + (it.xp || 0), 0)
  const [selectedSkill, setSelectedSkill] = useState<SkillItem | null>(null)

  // XP calculation helper (using same formula as SkillsSystem)
  const calculateXPForLevel = (level: number): number => {
    if (level < 1) return 0
    if (level > 99) level = 99

    let totalXP = 0
    for (let l = 2; l <= level; l++) {
      const xp = Math.floor((l - 1) + 300 * Math.pow(2, (l - 1) / 7)) / 4
      totalXP += Math.floor(xp)
    }
    return Math.floor(totalXP)
  }

  const getSkillProgress = (skill: SkillItem) => {
    if (skill.level >= 99) return { progress: 100, xpToNext: 0, currentLevelXP: skill.xp, nextLevelXP: skill.xp }

    const currentLevelXP = calculateXPForLevel(skill.level)
    const nextLevelXP = calculateXPForLevel(skill.level + 1)
    const progressXP = skill.xp - currentLevelXP
    const requiredXP = nextLevelXP - currentLevelXP
    const progress = (progressXP / requiredXP) * 100
    const xpToNext = nextLevelXP - skill.xp

    return { progress, xpToNext, currentLevelXP, nextLevelXP }
  }

  return (
    <>
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
              SKILLS
            </div>
            <div className="flex items-center" style={{ gap: 'clamp(0.25rem, 0.5vw, 0.3rem)' }}>
              <span style={{ color: 'rgba(242, 208, 138, 0.7)', fontSize: 'clamp(0.563rem, 1vw, 0.625rem)' }}>
                Total
              </span>
              <span className="font-bold" style={{ color: '#f2d08a', fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)' }}>
                {totalLevel}
              </span>
            </div>
          </div>
        </div>

        {/* Condensed Skills Grid */}
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
            <div className="grid grid-cols-3" style={{ gap: 'clamp(0.3rem, 0.7vw, 0.4rem)' }}>
              {items.map((it) => (
                <button
                  key={it.key}
                  onClick={() => setSelectedSkill(it)}
                  className="rounded transition-all duration-200 cursor-pointer group"
                  style={{
                    background: 'rgba(0, 0, 0, 0.35)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'rgba(242, 208, 138, 0.25)',
                    padding: 'clamp(0.3rem, 0.7vw, 0.375rem)',
                    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
                  }}
                >
                  <div className="flex items-center justify-center" style={{ gap: 'clamp(0.25rem, 0.6vw, 0.375rem)' }}>
                    <span
                      className="transition-transform duration-200 group-hover:scale-110"
                      style={{
                        fontSize: 'clamp(0.875rem, 1.8vw, 1rem)',
                        filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5))',
                      }}
                    >
                      {it.icon}
                    </span>
                    <div className="font-bold" style={{ color: 'rgba(242, 208, 138, 0.9)', fontSize: 'clamp(0.625rem, 1.1vw, 0.75rem)' }}>
                      {it.level}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Skill Popup */}
      {selectedSkill && (() => {
        const progress = getSkillProgress(selectedSkill)
        return (
          <div
            className="fixed inset-0 flex items-center justify-center z-[300]"
            style={{ background: 'rgba(0, 0, 0, 0.7)' }}
            onClick={() => setSelectedSkill(null)}
          >
            <div
              className="border rounded"
              style={{
                background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.98) 0%, rgba(30, 25, 40, 0.95) 100%)',
                borderColor: 'rgba(242, 208, 138, 0.5)',
                borderWidth: '2px',
                padding: 'clamp(0.75rem, 1.5vw, 1rem)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.9)',
                width: 'clamp(250px, 40vw, 350px)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center" style={{ gap: 'clamp(0.375rem, 0.8vw, 0.5rem)' }}>
                  <span style={{ fontSize: 'clamp(1.25rem, 2.5vw, 1.5rem)' }}>{selectedSkill.icon}</span>
                  <div>
                    <div className="font-bold" style={{ color: '#f2d08a', fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}>
                      {selectedSkill.label}
                    </div>
                    <div style={{ color: 'rgba(242, 208, 138, 0.7)', fontSize: 'clamp(0.625rem, 1.1vw, 0.75rem)' }}>
                      Level {selectedSkill.level}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSkill(null)}
                  style={{ color: 'rgba(242, 208, 138, 0.7)', fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
                >
                  ✕
                </button>
              </div>

              {/* XP Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between mb-1" style={{ fontSize: 'clamp(0.625rem, 1.1vw, 0.75rem)' }}>
                  <span style={{ color: 'rgba(242, 208, 138, 0.8)' }}>XP Progress</span>
                  <span style={{ color: '#f2d08a', fontWeight: 'bold' }}>
                    {Math.floor(progress.progress)}%
                  </span>
                </div>
                <div
                  className="rounded"
                  style={{
                    background: 'rgba(0, 0, 0, 0.5)',
                    height: 'clamp(12px, 2vw, 16px)',
                    border: '1px solid rgba(242, 208, 138, 0.3)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      background: 'linear-gradient(90deg, rgba(242, 208, 138, 0.6) 0%, rgba(242, 208, 138, 0.8) 100%)',
                      width: `${Math.min(100, Math.max(0, progress.progress))}%`,
                      boxShadow: '0 0 8px rgba(242, 208, 138, 0.5)',
                    }}
                  />
                </div>
              </div>

              {/* XP Details */}
              <div className="space-y-2">
                <div
                  className="flex justify-between"
                  style={{
                    fontSize: 'clamp(0.625rem, 1.1vw, 0.75rem)',
                    color: 'rgba(242, 208, 138, 0.8)',
                  }}
                >
                  <span>Current XP</span>
                  <span style={{ color: '#f2d08a', fontWeight: 'bold' }}>
                    {Math.floor(selectedSkill.xp).toLocaleString()}
                  </span>
                </div>
                {selectedSkill.level < 99 && (
                  <>
                    <div
                      className="flex justify-between"
                      style={{
                        fontSize: 'clamp(0.625rem, 1.1vw, 0.75rem)',
                        color: 'rgba(242, 208, 138, 0.8)',
                      }}
                    >
                      <span>XP to Level {selectedSkill.level + 1}</span>
                      <span style={{ color: '#f2d08a', fontWeight: 'bold' }}>
                        {Math.floor(progress.xpToNext).toLocaleString()}
                      </span>
                    </div>
                    <div
                      className="flex justify-between"
                      style={{
                        fontSize: 'clamp(0.625rem, 1.1vw, 0.75rem)',
                        color: 'rgba(242, 208, 138, 0.8)',
                      }}
                    >
                      <span>Next Level at</span>
                      <span style={{ color: '#f2d08a', fontWeight: 'bold' }}>
                        {Math.floor(progress.nextLevelXP).toLocaleString()} XP
                      </span>
                    </div>
                  </>
                )}
                {selectedSkill.level === 99 && (
                  <div
                    className="text-center font-bold"
                    style={{
                      color: '#f2d08a',
                      fontSize: 'clamp(0.688rem, 1.2vw, 0.75rem)',
                      padding: 'clamp(0.375rem, 0.8vw, 0.5rem)',
                      background: 'rgba(242, 208, 138, 0.1)',
                      borderRadius: '4px',
                    }}
                  >
                    ⭐ MASTERED ⭐
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}


