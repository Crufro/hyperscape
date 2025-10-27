/**
 * Tests for Dialogue Converter Utilities
 *
 * Tests the conversion between dialogue tree format and React Flow node/edge format.
 */

import type { DialogueNode } from '../../types/npc-scripts'
import { dialogueToNodes, nodesToDialogue, validateDialogueTree } from '../dialogue-converter'

describe('Dialogue Converter', () => {
  describe('dialogueToNodes', () => {
    it('should convert simple dialogue tree to nodes and edges', () => {
      const dialogueNodes: DialogueNode[] = [
        {
          id: 'greeting',
          text: 'Hello, traveler!',
          responses: [
            {
              id: 'response-1',
              text: 'Hi there!',
              nextNodeId: 'farewell'
            }
          ]
        },
        {
          id: 'farewell',
          text: 'Safe travels!',
          responses: []
        }
      ]

      const result = dialogueToNodes(dialogueNodes, 'greeting')

      // Should have start node, 2 dialogue nodes, 1 response node, 1 end node
      expect(result.nodes.length).toBeGreaterThanOrEqual(4)

      // Should have start node
      const startNode = result.nodes.find(n => n.id === 'start')
      expect(startNode).toBeDefined()
      expect(startNode!.type).toBe('startNode')

      // Should have dialogue nodes
      const greetingNode = result.nodes.find(n => n.id === 'greeting')
      expect(greetingNode).toBeDefined()
      expect(greetingNode!.type).toBe('dialogueNode')
    })
  })

  describe('nodesToDialogue', () => {
    it('should convert React Flow nodes back to dialogue tree', () => {
      // First convert dialogue to nodes
      const originalDialogue: DialogueNode[] = [
        {
          id: 'greeting',
          text: 'Hello!',
          responses: [
            {
              id: 'response-1',
              text: 'Hi!',
              nextNodeId: 'farewell'
            }
          ]
        },
        {
          id: 'farewell',
          text: 'Goodbye!',
          responses: []
        }
      ]

      const { nodes, edges } = dialogueToNodes(originalDialogue, 'greeting')

      // Convert back
      const { dialogueNodes, entryNodeId } = nodesToDialogue(nodes, edges)

      // Should have same number of dialogue nodes
      expect(dialogueNodes.length).toBe(2)
      expect(entryNodeId).toBe('greeting')

      // Check node content
      const greeting = dialogueNodes.find(n => n.id === 'greeting')
      expect(greeting).toBeDefined()
      expect(greeting!.text).toBe('Hello!')
      expect(greeting!.responses.length).toBe(1)
    })
  })

  describe('validateDialogueTree', () => {
    it('should validate a correct dialogue tree', () => {
      const dialogueNodes: DialogueNode[] = [
        {
          id: 'greeting',
          text: 'Hello!',
          responses: [
            {
              id: 'response-1',
              text: 'Hi!',
              nextNodeId: ''
            }
          ]
        }
      ]

      const { nodes, edges } = dialogueToNodes(dialogueNodes, 'greeting')
      const validation = validateDialogueTree(nodes, edges)

      expect(validation.valid).toBe(true)
      expect(validation.errors.length).toBe(0)
    })

    it('should detect missing start node', () => {
      const validation = validateDialogueTree([], [])

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('No start node found')
    })
  })
})
