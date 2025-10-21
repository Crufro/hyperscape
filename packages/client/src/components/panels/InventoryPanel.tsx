/**
 * Inventory Panel
 * Modern MMORPG-style inventory interface with drag-and-drop functionality
 */

import React, { useEffect, useRef, useState } from 'react'
import { DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { EventType } from '@hyperscape/shared'
import type { ClientWorld, InventorySlotItem } from '../../types'

type InventorySlotViewItem = Pick<InventorySlotItem, 'slot' | 'itemId' | 'quantity'>

interface InventoryPanelProps {
  items: InventorySlotViewItem[]
  coins: number
  world?: ClientWorld
  onItemMove?: (fromIndex: number, toIndex: number) => void
  onItemUse?: (item: InventorySlotViewItem, index: number) => void
  onItemEquip?: (item: InventorySlotViewItem) => void
}

interface DraggableItemProps {
  item: InventorySlotViewItem | null
  index: number
}

function DraggableInventorySlot({ item, index }: DraggableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `inventory-${index}`, data: { item, index } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="relative border rounded flex items-center justify-center transition-all duration-200 group aspect-square"
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!item) return
        const items = [
          { id: 'drop', label: `Drop ${item.itemId}`, enabled: true },
          { id: 'examine', label: 'Examine', enabled: true },
        ]
        const evt = new CustomEvent('contextmenu', {
          detail: {
            target: {
              id: `inventory_slot_${index}`,
              type: 'inventory',
              name: item.itemId,
            },
            mousePosition: { x: e.clientX, y: e.clientY },
            items,
          },
        })
        window.dispatchEvent(evt)
      }}
      title={item ? `${item.item?.name || item.itemId}${item.item?.rarity ? ` (${item.item.rarity})` : ''}` : 'Empty slot'}
      style={{
        ...style,
        borderColor: item ? rarityColor : 'rgba(242, 208, 138, 0.2)',
        background: item
          ? 'linear-gradient(135deg, rgba(242, 208, 138, 0.08) 0%, rgba(242, 208, 138, 0.04) 100%)'
          : 'rgba(0, 0, 0, 0.35)',
        boxShadow: item
          ? `0 1px 3px ${rarityColor}40, inset 0 1px 0 rgba(242, 208, 138, 0.05)`
          : 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
        cursor: item ? 'grab' : 'default',
      }}
    >
      {/* Rarity Glow */}
      {item?.item?.rarity && (
        <div
          className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: rarityColor,
            boxShadow: `0 0 4px ${rarityColor}`,
          }}
        />
      )}

      {/* Item Icon - Centered */}
      {item ? (
        <div
          className="transition-transform duration-200 group-hover:scale-110"
          style={{
            color: rarityColor === 'rgba(242, 208, 138, 0.3)' ? '#f2d08a' : rarityColor,
            filter: item.item?.rarity ? `drop-shadow(0 0 2px ${rarityColor})` : 'none',
            fontSize: 'clamp(0.875rem, 2vw, 1.125rem)',
          }}
        >
          {item.itemId.includes('sword') ? '⚔️' :
           item.itemId.includes('shield') ? '🛡️' :
           item.itemId.includes('helmet') || item.itemId.includes('helm') ? '⛑️' :
           item.itemId.includes('boots') || item.itemId.includes('boot') ? '👢' :
           item.itemId.includes('glove') ? '🧤' :
           item.itemId.includes('cape') ? '🧥' :
           item.itemId.includes('amulet') ? '📿' :
           item.itemId.includes('ring') ? '💍' :
           item.itemId.includes('arrow') ? '🏹' :
           item.itemId.includes('fish') ? '🐟' :
           item.itemId.includes('log') || item.itemId.includes('wood') ? '🪵' :
           item.itemId.includes('ore') ? '⛏️' :
           item.itemId.includes('coin') ? '💰' :
           item.itemId.includes('potion') ? '🧪' :
           item.itemId.substring(0, 2).toUpperCase()}
        </div>
      ) : (
        <div
          className="opacity-20"
          style={{
            color: '#f2d08a',
            fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)',
          }}
        >
          •
        </div>
      )}

      {/* Quantity Badge */}
      {item && item.quantity > 1 && (
        <div
          className="absolute bottom-0.5 right-0.5 font-bold rounded px-1 py-0.5 leading-none"
          style={{
            background: 'linear-gradient(135deg, rgba(242, 208, 138, 0.95) 0%, rgba(242, 208, 138, 0.85) 100%)',
            color: 'rgba(20, 20, 30, 0.95)',
            fontSize: 'clamp(0.5rem, 1.2vw, 0.625rem)',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.6)',
          }}
        >
          {item.quantity}
        </div>
      )}
    </div>
  )
}

export function InventoryPanel({ items, coins, world, onItemMove, onItemUse: _onItemUse, onItemEquip: _onItemEquip }: InventoryPanelProps) {
  const slots: (InventorySlotViewItem | null)[] = Array(28).fill(null)
  items.forEach((item) => {
    const s = (item as { slot?: number }).slot
    if (typeof s === 'number' && s >= 0 && s < 28) {
      slots[s] = item
    }
  })

  useEffect(() => {
    const onCtxSelect = (evt: Event) => {
      const ce = evt as CustomEvent<{ actionId: string; targetId: string }>
      const target = ce.detail?.targetId || ''
      if (!target.startsWith('inventory_slot_')) return
      const slotIndex = parseInt(target.replace('inventory_slot_', ''), 10)
      if (Number.isNaN(slotIndex)) return
      const it = slotItems[slotIndex]
      if (!it) return
      if (ce.detail.actionId === 'drop') {
        if (world?.network?.dropItem) {
          world.network.dropItem(it.itemId, slotIndex, it.quantity || 1)
        } else if (world?.network?.send) {
          world.network.send('dropItem', { itemId: it.itemId, slot: slotIndex, quantity: it.quantity || 1 })
        }
      }
      if (ce.detail.actionId === 'examine') {
      }
    }
    window.addEventListener('contextmenu:select', onCtxSelect as EventListener)
    return () => window.removeEventListener('contextmenu:select', onCtxSelect as EventListener)
  }, [slotItems, world])

  useEffect(() => {
    const newSlots: (InventorySlotViewItem | null)[] = Array(28).fill(null)
    items.forEach((item) => {
      const s = (item as { slot?: number }).slot
      if (typeof s === 'number' && s >= 0 && s < 28) {
        newSlots[s] = item
      }
    })
    setSlotItems(newSlots)
  }, [items])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) return

    const fromIndex = parseInt((active.id as string).split('-')[1])
    const toIndex = parseInt((over.id as string).split('-')[1])

    const newSlots = [...slotItems]
    const [movedItem] = newSlots.splice(fromIndex, 1)
    newSlots.splice(toIndex, 0, movedItem)
    setSlotItems(newSlots)

    if (onItemMove) {
      onItemMove(fromIndex, toIndex)
    }
  }

  const activeItem = activeId ? slotItems[parseInt(activeId.split('-')[1])] : null

  // Calculate total weight
  const totalWeight = items.reduce((sum, item) => {
    const weight = item.item?.weight || 0
    const quantity = item.quantity || 1
    return sum + (weight * quantity)
  }, 0)

  const itemCount = items.filter(item => item !== null).length
  const maxSlots = 28

  // Get current page items
  const startIndex = currentPage * SLOTS_PER_PAGE
  const endIndex = Math.min(startIndex + SLOTS_PER_PAGE, 28)
  const currentPageItems = slotItems.slice(startIndex, endIndex)

  return (
          </div>
        </div>
      </div>

      {/* Inventory Grid */}
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
          <SortableContext items={slotItems.map((_, i) => `inventory-${i}`)} strategy={rectSortingStrategy}>
            <div
              className="grid grid-cols-4"
              style={{
                gridAutoRows: '1fr',
                gap: 'clamp(0.3rem, 0.7vw, 0.4rem)',
              }}
            >
              {currentPageItems.map((item, i) => {
                const actualIndex = startIndex + i
                return (
                  <DraggableInventorySlot
                    key={actualIndex}
                    item={item}
                    index={actualIndex}
                  />
                )
              })}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeItem ? (
              <div
                className="border rounded flex items-center justify-center aspect-square"
                style={{
                  width: 'clamp(40px, 8vw, 60px)',
                  borderColor: activeItem.item?.rarity
                    ? activeItem.item.rarity === 'legendary' ? '#fbbf24'
                    : activeItem.item.rarity === 'epic' ? '#a855f7'
                    : activeItem.item.rarity === 'rare' ? '#3b82f6'
                    : activeItem.item.rarity === 'uncommon' ? '#22c55e'
                    : 'rgba(242, 208, 138, 0.3)'
                    : 'rgba(242, 208, 138, 0.3)',
                  background: 'linear-gradient(135deg, rgba(242, 208, 138, 0.15) 0%, rgba(242, 208, 138, 0.08) 100%)',
                  fontSize: 'clamp(1rem, 2.5vw, 1.5rem)',
                  color: '#f2d08a',
                }}
              >
                {activeItem.itemId.substring(0, 2).toUpperCase()}
              </div>
            ) : null}
          </DragOverlay>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="flex flex-col" style={{ gap: 'clamp(0.3rem, 0.7vw, 0.4rem)' }}>
        {/* Page Navigation */}
        <div
          className="border rounded transition-all duration-200 flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(25, 20, 35, 0.92) 100%)',
            borderColor: 'rgba(242, 208, 138, 0.35)',
            padding: 'clamp(0.3rem, 0.7vw, 0.375rem)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div className="flex items-center" style={{ gap: 'clamp(0.3rem, 0.7vw, 0.4rem)' }}>
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="transition-all duration-200"
              style={{
                color: currentPage === 0 ? 'rgba(242, 208, 138, 0.3)' : '#f2d08a',
                fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                cursor: currentPage === 0 ? 'default' : 'pointer',
                opacity: currentPage === 0 ? 0.5 : 1,
                fontWeight: 'bold',
              }}
            >
              ◀
            </button>
            <div
              className="font-medium"
              style={{
                color: '#f2d08a',
                fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
                minWidth: 'clamp(2.5rem, 5vw, 3.5rem)',
                textAlign: 'center',
              }}
            >
              Page {currentPage + 1}/{totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              className="transition-all duration-200"
              style={{
                color: currentPage === totalPages - 1 ? 'rgba(242, 208, 138, 0.3)' : '#f2d08a',
                fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                cursor: currentPage === totalPages - 1 ? 'default' : 'pointer',
                opacity: currentPage === totalPages - 1 ? 0.5 : 1,
                fontWeight: 'bold',
              }}
            >
              ▶
            </button>
          </div>
        </div>

        {/* Coins */}
        <div
          className="border rounded transition-all duration-200 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.08) 100%)',
            borderColor: 'rgba(251, 191, 36, 0.4)',
            padding: 'clamp(0.3rem, 0.7vw, 0.375rem)',
            boxShadow: '0 1px 3px rgba(251, 191, 36, 0.2)',
          }}
        >
          <div className="flex items-center" style={{ gap: 'clamp(0.25rem, 0.6vw, 0.375rem)' }}>
            <span style={{ fontSize: 'clamp(0.875rem, 1.8vw, 1.125rem)' }}>💰</span>
            <span
              className="font-medium"
              style={{
                color: '#fbbf24',
                fontSize: 'clamp(0.625rem, 1.1vw, 0.688rem)',
              }}
            >
              Coins
            </span>
          </div>
          <span
            className="font-bold"
            style={{
              color: '#fbbf24',
              fontSize: 'clamp(0.688rem, 1.2vw, 0.75rem)',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)',
            }}
          >
            {coins.toLocaleString()}
          </span>
        </div>

        {/* Weight */}
        <div
          className="border rounded transition-all duration-200 flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.95) 0%, rgba(25, 20, 35, 0.92) 100%)',
            borderColor: 'rgba(242, 208, 138, 0.35)',
            padding: 'clamp(0.3rem, 0.7vw, 0.375rem)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div className="flex items-center" style={{ gap: 'clamp(0.25rem, 0.5vw, 0.3rem)' }}>
            <span style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}>⚖️</span>
            <span
              className="font-medium opacity-75"
              style={{
                color: '#f2d08a',
                fontSize: 'clamp(0.563rem, 1vw, 0.625rem)',
              }}
            >
              Weight
            </span>
          </div>
          <span
            className="font-semibold"
            style={{
              color: 'rgba(242, 208, 138, 0.9)',
              fontSize: 'clamp(0.563rem, 1vw, 0.625rem)',
            }}
          >
            {totalWeight.toFixed(1)} kg
          </span>
        </div>
      </div>
    </div>
  )
}
