/**
 * Dialogue Tree Converter
 *
 * Utilities for converting between dialogue tree data structures and React Flow nodes/edges.
 * Handles validation, layout, and transformation logic.
 */

import type { Node, Edge } from '@xyflow/react'
import type { DialogueNode as DialogueTreeNode, DialogueResponse, DialogueCondition } from '../types/npc-scripts'
import type { DialogueNodeData, ResponseNodeData, StartNodeData, EndNodeData } from '../components/GameContent/DialogueNodes'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface ConversionResult {
  nodes: Node[]
  edges: Edge[]
}

/**
 * Convert dialogue tree nodes to React Flow format
 */
export function dialogueToNodes(
  dialogueNodes: DialogueTreeNode[],
  entryNodeId: string
): ConversionResult {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const nodePositions = calculateTreeLayout(dialogueNodes, entryNodeId)

  // Add start node
  nodes.push({
    id: 'start',
    type: 'startNode',
    position: { x: 400, y: 50 },
    data: { id: 'start' } as StartNodeData
  })

  // Connect start to entry node
  edges.push({
    id: `start-to-${entryNodeId}`,
    source: 'start',
    target: entryNodeId,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#a78bfa' }
  })

  // Track terminal nodes (no responses) for end nodes
  const terminalNodeIds: string[] = []

  // Convert dialogue nodes
  for (const dialogueNode of dialogueNodes) {
    const position = nodePositions.get(dialogueNode.id) || { x: 400, y: 200 }

    // Add dialogue node
    nodes.push({
      id: dialogueNode.id,
      type: 'dialogueNode',
      position,
      data: {
        id: dialogueNode.id,
        text: dialogueNode.text
      } as DialogueNodeData
    })

    // Track terminal nodes
    if (dialogueNode.responses.length === 0) {
      terminalNodeIds.push(dialogueNode.id)
    }

    // Convert responses to response nodes and edges
    for (let i = 0; i < dialogueNode.responses.length; i++) {
      const response = dialogueNode.responses[i]
      const responseNodeId = `${dialogueNode.id}-response-${i}`

      // Calculate response position (between dialogue nodes)
      const responsePosition = {
        x: position.x - 150 + (i * 100),
        y: position.y + 150
      }

      // Add response node
      nodes.push({
        id: responseNodeId,
        type: 'responseNode',
        position: responsePosition,
        data: {
          id: response.id,
          text: response.text,
          questReference: response.questReference,
          conditions: response.conditions?.map(c => c.type)
        } as ResponseNodeData
      })

      // Edge from dialogue to response
      edges.push({
        id: `${dialogueNode.id}-to-${responseNodeId}`,
        source: dialogueNode.id,
        target: responseNodeId,
        type: 'smoothstep',
        style: { stroke: '#60a5fa' }
      })

      // Edge from response to next dialogue (if exists)
      if (response.nextNodeId) {
        edges.push({
          id: `${responseNodeId}-to-${response.nextNodeId}`,
          source: responseNodeId,
          target: response.nextNodeId,
          type: 'smoothstep',
          style: { stroke: '#34d399' }
        })
      }
    }
  }

  // Add end nodes for terminal dialogues
  for (let i = 0; i < terminalNodeIds.length; i++) {
    const terminalNodeId = terminalNodeIds[i]
    const endNodeId = `end-${i}`
    const terminalNode = nodes.find(n => n.id === terminalNodeId)

    if (terminalNode) {
      nodes.push({
        id: endNodeId,
        type: 'endNode',
        position: {
          x: terminalNode.position.x,
          y: terminalNode.position.y + 150
        },
        data: { id: endNodeId } as EndNodeData
      })

      edges.push({
        id: `${terminalNodeId}-to-${endNodeId}`,
        source: terminalNodeId,
        target: endNodeId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#f87171' }
      })
    }
  }

  return { nodes, edges }
}

/**
 * Convert React Flow nodes/edges back to dialogue tree format
 */
export function nodesToDialogue(
  nodes: Node[],
  edges: Edge[]
): { dialogueNodes: DialogueTreeNode[], entryNodeId: string } {
  const dialogueNodes: DialogueTreeNode[] = []

  // Find entry node (connected to start)
  const startEdge = edges.find(e => e.source === 'start')
  const entryNodeId = startEdge?.target || ''

  // Filter to only dialogue nodes
  const dialogueNodeList = nodes.filter(n => n.type === 'dialogueNode')

  for (const node of dialogueNodeList) {
    const nodeData = node.data as DialogueNodeData

    // Find all response nodes connected to this dialogue
    const outgoingEdges = edges.filter(e => e.source === node.id)
    const responses: DialogueResponse[] = []

    for (const edge of outgoingEdges) {
      const responseNode = nodes.find(n => n.id === edge.target && n.type === 'responseNode')
      if (!responseNode) continue

      const responseData = responseNode.data as ResponseNodeData

      // Find next dialogue node
      const nextEdge = edges.find(e => e.source === responseNode.id)
      const nextNodeId = nextEdge?.target || ''

      responses.push({
        id: responseData.id,
        text: responseData.text,
        nextNodeId: nextNodeId.startsWith('end-') ? '' : nextNodeId,
        questReference: responseData.questReference,
        conditions: responseData.conditions?.map(conditionStr => {
          // Map simple string conditions to DialogueCondition format
          const typeMap: Record<string, DialogueCondition['type']> = {
            'questComplete': 'QUEST_COMPLETE',
            'itemOwned': 'HAS_ITEM',
            'flagSet': 'FLAG_SET'
          }
          return {
            type: typeMap[conditionStr] || 'FLAG_SET',
            data: {}
          }
        })
      })
    }

    dialogueNodes.push({
      id: nodeData.id,
      text: nodeData.text,
      responses
    })
  }

  return { dialogueNodes, entryNodeId }
}

/**
 * Calculate tree layout positions for nodes
 */
function calculateTreeLayout(
  nodes: DialogueTreeNode[],
  entryNodeId: string
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  const visited = new Set<string>()

  const verticalSpacing = 300
  const horizontalSpacing = 400

  function layoutNode(nodeId: string, level: number, column: number) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const node = nodes.find(n => n.id === nodeId)
    if (!node) return

    // Calculate position
    const x = 400 + (column * horizontalSpacing)
    const y = 150 + (level * verticalSpacing)

    positions.set(nodeId, { x, y })

    // Layout children
    let childColumn = column - Math.floor(node.responses.length / 2)
    for (const response of node.responses) {
      if (response.nextNodeId) {
        layoutNode(response.nextNodeId, level + 1, childColumn)
        childColumn++
      }
    }
  }

  layoutNode(entryNodeId, 0, 0)

  return positions
}

/**
 * Validate dialogue tree structure
 */
export function validateDialogueTree(nodes: Node[], edges: Edge[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for start node
  const startNode = nodes.find(n => n.id === 'start')
  if (!startNode) {
    errors.push('No start node found')
  }

  // Check for entry connection
  const entryEdge = edges.find(e => e.source === 'start')
  if (!entryEdge) {
    errors.push('Start node not connected to entry dialogue')
  }

  // Find all dialogue nodes
  const dialogueNodes = nodes.filter(n => n.type === 'dialogueNode')

  // Check for empty dialogue text
  for (const node of dialogueNodes) {
    const data = node.data as DialogueNodeData
    if (!data.text || data.text.trim() === '') {
      warnings.push(`Dialogue node ${data.id} has empty text`)
    }
  }

  // Check for orphaned nodes (no incoming edges except start)
  for (const node of dialogueNodes) {
    const hasIncoming = edges.some(e => e.target === node.id)
    if (!hasIncoming && node.id !== entryEdge?.target) {
      warnings.push(`Dialogue node ${node.id} is unreachable`)
    }
  }

  // Check for dead ends (dialogue nodes with no responses and no end node)
  for (const node of dialogueNodes) {
    const hasOutgoing = edges.some(e => e.source === node.id)
    if (!hasOutgoing) {
      warnings.push(`Dialogue node ${node.id} has no responses (terminal node)`)
    }
  }

  // Check for cycles
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId)
    recursionStack.add(nodeId)

    const outgoingEdges = edges.filter(e => e.source === nodeId)
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        if (hasCycle(edge.target)) return true
      } else if (recursionStack.has(edge.target)) {
        return true
      }
    }

    recursionStack.delete(nodeId)
    return false
  }

  if (entryEdge && hasCycle(entryEdge.target)) {
    warnings.push('Dialogue tree contains cycles (may cause infinite loops)')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Auto-layout algorithm using hierarchical layout
 */
export function autoLayoutNodes(nodes: Node[], edges: Edge[]): Node[] {
  // Find start node and entry
  const startNode = nodes.find(n => n.id === 'start')
  const entryEdge = edges.find(e => e.source === 'start')

  if (!startNode || !entryEdge) return nodes

  const positions = new Map<string, { x: number; y: number }>()
  const visited = new Set<string>()

  const levelWidth = new Map<number, number>()
  const nodeLevel = new Map<string, number>()

  // Calculate levels
  function calculateLevels(nodeId: string, level: number) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    nodeLevel.set(nodeId, level)
    levelWidth.set(level, (levelWidth.get(level) || 0) + 1)

    const outgoing = edges.filter(e => e.source === nodeId)
    for (const edge of outgoing) {
      calculateLevels(edge.target, level + 1)
    }
  }

  calculateLevels('start', 0)

  // Position nodes
  const levelCounters = new Map<number, number>()
  visited.clear()

  function positionNode(nodeId: string) {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const level = nodeLevel.get(nodeId) || 0
    const width = levelWidth.get(level) || 1
    const counter = levelCounters.get(level) || 0

    levelCounters.set(level, counter + 1)

    const x = 400 + (counter - width / 2) * 350
    const y = 50 + level * 250

    positions.set(nodeId, { x, y })

    const outgoing = edges.filter(e => e.source === nodeId)
    for (const edge of outgoing) {
      positionNode(edge.target)
    }
  }

  positionNode('start')

  // Apply positions
  return nodes.map(node => {
    const pos = positions.get(node.id)
    if (pos) {
      return { ...node, position: pos }
    }
    return node
  })
}
