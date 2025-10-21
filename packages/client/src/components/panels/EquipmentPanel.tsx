import { EquipmentSlotName } from '@hyperscape/shared'
import type { PlayerEquipmentItems, Item } from '../../types'

interface EquipmentPanelProps {
  equipment: PlayerEquipmentItems | null
  onItemDrop?: (item: Item, slot: keyof typeof EquipmentSlotName) => void
}

interface DroppableEquipmentSlotProps {
  slotKey: string
  label: string
  item: Item | null
  icon: string
}

  })

  const {
    attributes,
    listeners,
    setNodeRef: setDraggableRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `equipment-${slotKey}`,
    data: { slot: slotKey, item },
    disabled: !item, // Only draggable if item is equipped
  })

  const style = {
    borderColor: isOver ? 'rgba(242, 208, 138, 0.7)' : item ? 'rgba(34, 197, 94, 0.4)' : 'rgba(242, 208, 138, 0.3)',
    backgroundColor: isOver
      ? 'rgba(242, 208, 138, 0.15)'
      : item
        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.08) 100%)'
        : 'rgba(0, 0, 0, 0.35)',
    background: item && !isOver
      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.08) 100%)'
      : undefined,
    minHeight: '64px',
    padding: 'clamp(0.4rem, 1vw, 0.5rem)',
    boxShadow: item ? '0 2px 6px rgba(34, 197, 94, 0.2)' : 'inset 0 2px 4px rgba(0, 0, 0, 0.3)',
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: item ? 'grab' : 'default',
  }

  // Combine both refs
  const setRefs = (element: HTMLDivElement | null) => {
    setDroppableRef(element)
    setDraggableRef(element)
  }

  return (
    <div
      ref={setRefs}
      {...(item ? attributes : {})}
      {...(item ? listeners : {})}
      className="border rounded-lg flex flex-col items-center justify-center relative transition-all duration-200 group"
      style={style}
      title={item ? `${item.name}${item.rarity ? ` (${item.rarity})` : ''}` : label}
    >
      {/* Slot Icon */}
      <div
        className="text-2xl mb-1 transition-transform duration-200"
        style={{
          color: item ? '#22c55e' : 'rgba(242, 208, 138, 0.4)',
          filter: item ? 'drop-shadow(0 0 4px rgba(34, 197, 94, 0.6))' : 'none',
          transform: isOver ? 'scale(1.1)' : 'scale(1)',
        }}
      >
        {icon}
      </div>

      {/* Slot Label */}
      <div
        className="text-xs font-medium uppercase tracking-wide"
        style={{
          color: item ? '#22c55e' : 'rgba(242, 208, 138, 0.6)',
          fontSize: 'clamp(0.563rem, 1vw, 0.625rem)',
        }}
      >
        {label}
      </div>

      {/* Item Name (if equipped) */}
      {item && (
        <div
          className="text-xs mt-1 text-center line-clamp-2"
          style={{
            color: 'rgba(242, 208, 138, 0.9)',
            fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)',
          }}
        >
          {item.name}
        </div>
      )}

      {/* Rarity Indicator */}
      {item && item.rarity && (
        <div
          className="absolute top-1 right-1 w-2 h-2 rounded-full"
          style={{
            backgroundColor: item.rarity === 'legendary' ? '#fbbf24'
              : item.rarity === 'epic' ? '#a855f7'
              : item.rarity === 'rare' ? '#3b82f6'
              : item.rarity === 'uncommon' ? '#22c55e'
              : '#9ca3af',
            boxShadow: '0 0 6px currentColor',
          }}
          title={item.rarity}
        />
      )}
    </div>
  )
}

export function EquipmentPanel({ equipment, onItemDrop: _onItemDrop }: EquipmentPanelProps) {
  const [activeTab] = useState<'equipment' | 'stats'>('equipment')

  // Equipment slot configuration with icons
  const slotConfig = {
    [EquipmentSlotName.HELMET]: { label: 'Helmet', icon: '⛑️', row: 0, col: 1 },
    [EquipmentSlotName.CAPE]: { label: 'Cape', icon: '🧥', row: 1, col: 0 },
    [EquipmentSlotName.AMULET]: { label: 'Amulet', icon: '📿', row: 1, col: 2 },
    [EquipmentSlotName.WEAPON]: { label: 'Weapon', icon: '⚔️', row: 2, col: 0 },
    [EquipmentSlotName.BODY]: { label: 'Body', icon: '🛡️', row: 2, col: 1 },
    [EquipmentSlotName.SHIELD]: { label: 'Shield', icon: '🔰', row: 2, col: 2 },
    [EquipmentSlotName.LEGS]: { label: 'Legs', icon: '👖', row: 3, col: 1 },
    [EquipmentSlotName.GLOVES]: { label: 'Gloves', icon: '🧤', row: 4, col: 0 },
    [EquipmentSlotName.BOOTS]: { label: 'Boots', icon: '👢', row: 4, col: 2 },
    [EquipmentSlotName.RING]: { label: 'Ring', icon: '💍', row: 5, col: 1 },
    [EquipmentSlotName.ARROWS]: { label: 'Arrows', icon: '🏹', row: 5, col: 2 },
  }

  // Equipment slots are keyed by EquipmentSlotName enum values
  const itemMap: Record<string, Item | null> = equipment ? {
    helmet: equipment.helmet || null,
    body: equipment.body || null,
    legs: equipment.legs || null,
    weapon: equipment.weapon || null,
    shield: equipment.shield || null,
    arrows: equipment.arrows || null,
  } : {}

  // Calculate total stats from equipped items
  const calculateStats = () => {
    const stats = {
      attackBonus: 0,
      strengthBonus: 0,
      defenseBonus: 0,
      rangedBonus: 0,
      magicBonus: 0,
      prayer: 0,
    }

    Object.values(itemMap).forEach((item) => {
      if (item && item.bonuses) {
        stats.attackBonus += item.bonuses.attackBonus || 0
        stats.strengthBonus += item.bonuses.strengthBonus || 0
        stats.defenseBonus += item.bonuses.defenseBonus || 0
        stats.rangedBonus += item.bonuses.rangedBonus || 0
        stats.magicBonus += item.bonuses.magicBonus || 0
        stats.prayer += item.bonuses.prayer || 0
      }
    })

    return stats
  }

  const stats = calculateStats()
  const equippedCount = Object.values(itemMap).filter(item => item !== null).length
  const totalSlots = Object.keys(slotConfig).length

  return (
            </div>
          )}

          {/* Combat Stats Card */}
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
              Combat Bonuses
            </div>
            <div className="grid grid-cols-2 gap-2" style={{ fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)' }}>
              <div className="flex items-center justify-between">
                <span style={{ color: 'rgba(242, 208, 138, 0.75)' }}>⚔️ Attack:</span>
                <span className="font-semibold" style={{ color: stats.attackBonus > 0 ? '#22c55e' : 'rgba(242, 208, 138, 0.9)' }}>
                  {stats.attackBonus > 0 ? '+' : ''}{stats.attackBonus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: 'rgba(242, 208, 138, 0.75)' }}>💪 Strength:</span>
                <span className="font-semibold" style={{ color: stats.strengthBonus > 0 ? '#22c55e' : 'rgba(242, 208, 138, 0.9)' }}>
                  {stats.strengthBonus > 0 ? '+' : ''}{stats.strengthBonus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: 'rgba(242, 208, 138, 0.75)' }}>🛡️ Defense:</span>
                <span className="font-semibold" style={{ color: stats.defenseBonus > 0 ? '#22c55e' : 'rgba(242, 208, 138, 0.9)' }}>
                  {stats.defenseBonus > 0 ? '+' : ''}{stats.defenseBonus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: 'rgba(242, 208, 138, 0.75)' }}>🏹 Ranged:</span>
                <span className="font-semibold" style={{ color: stats.rangedBonus > 0 ? '#22c55e' : 'rgba(242, 208, 138, 0.9)' }}>
                  {stats.rangedBonus > 0 ? '+' : ''}{stats.rangedBonus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: 'rgba(242, 208, 138, 0.75)' }}>✨ Magic:</span>
                <span className="font-semibold" style={{ color: stats.magicBonus > 0 ? '#22c55e' : 'rgba(242, 208, 138, 0.9)' }}>
                  {stats.magicBonus > 0 ? '+' : ''}{stats.magicBonus}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: 'rgba(242, 208, 138, 0.75)' }}>🙏 Prayer:</span>
                <span className="font-semibold" style={{ color: stats.prayer > 0 ? '#22c55e' : 'rgba(242, 208, 138, 0.9)' }}>
                  {stats.prayer > 0 ? '+' : ''}{stats.prayer}
                </span>
              </div>
            </div>
          </div>

          {/* Equipment Quick Info */}
          {equippedCount > 0 && (
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
                Equipment Summary
              </div>
              <div className="space-y-1" style={{ fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)' }}>
                {Object.entries(itemMap)
                  .filter(([_, item]) => item !== null)
                  .map(([slot, item]) => (
                    <div key={slot} className="flex items-center justify-between">
                      <span style={{ color: 'rgba(242, 208, 138, 0.7)' }}>
                        {slotConfig[slot as EquipmentSlotName]?.icon} {slotConfig[slot as EquipmentSlotName]?.label}:
                      </span>
                      <span
                        className="font-medium truncate ml-2"
                        style={{
                          color: 'rgba(242, 208, 138, 0.9)',
                          maxWidth: '60%'
                        }}
                      >
                        {item!.name}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
