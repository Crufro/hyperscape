/**
 * Visual Dialogue Editor
 *
 * React Flow-based visual editor for dialogue trees.
 * Replaces the text-based editor with an interactive node graph.
 *
 * Features:
 * - Drag-and-drop node creation
 * - Visual node connections
 * - Inline text editing
 * - Auto-layout
 * - Validation
 * - Export/Import JSON
 */

import React, { useCallback, useState, useMemo, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Panel,
  NodeTypes
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Plus,
  Layout,
  CheckCircle,
  FileJson,
  MessageSquare,
  MessageCircle,
  Trash2,
  Download
} from 'lucide-react'

import { DialogueNode, ResponseNode, StartNode, EndNode } from './DialogueNodes'
import type { DialogueNodeData, ResponseNodeData } from './DialogueNodes'
import type { DialogueNode as DialogueTreeNode } from '../../types/npc-scripts'
import {
  dialogueToNodes,
  nodesToDialogue,
  validateDialogueTree,
  autoLayoutNodes
} from '../../utils/dialogue-converter'
import { Button } from '../common/Button'
import { Card } from '../common/Card'
import { Badge } from '../common/Badge'

interface VisualDialogueEditorProps {
  nodes: DialogueTreeNode[]
  entryNodeId: string
  onNodesChange: (nodes: DialogueTreeNode[], entryNodeId: string) => void
}

const nodeTypes: NodeTypes = {
  dialogueNode: DialogueNode,
  responseNode: ResponseNode,
  startNode: StartNode,
  endNode: EndNode
}

export function VisualDialogueEditor({
  nodes: dialogueTreeNodes,
  entryNodeId,
  onNodesChange
}: VisualDialogueEditorProps) {
  // Convert dialogue tree to React Flow format
  const initialFlow = useMemo(
    () => dialogueToNodes(dialogueTreeNodes, entryNodeId),
    [dialogueTreeNodes, entryNodeId]
  )

  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialFlow.nodes)
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialFlow.edges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // Validation state
  const validation = useMemo(() => validateDialogueTree(nodes, edges), [nodes, edges])

  // Handle node text changes
  const handleDialogueTextChange = useCallback((id: string, text: string) => {
    setNodes(nds =>
      nds.map(node => {
        if (node.id === id && node.type === 'dialogueNode') {
          return {
            ...node,
            data: { ...node.data, text } as DialogueNodeData
          }
        }
        return node
      })
    )
  }, [setNodes])

  const handleResponseTextChange = useCallback((id: string, text: string) => {
    setNodes(nds =>
      nds.map(node => {
        if (node.data.id === id && node.type === 'responseNode') {
          return {
            ...node,
            data: { ...node.data, text } as ResponseNodeData
          }
        }
        return node
      })
    )
  }, [setNodes])

  // Update node data to include change handlers
  useEffect(() => {
    setNodes(nds =>
      nds.map(node => {
        if (node.type === 'dialogueNode') {
          return {
            ...node,
            data: {
              ...node.data,
              onTextChange: handleDialogueTextChange
            } as DialogueNodeData
          }
        }
        if (node.type === 'responseNode') {
          return {
            ...node,
            data: {
              ...node.data,
              onTextChange: handleResponseTextChange
            } as ResponseNodeData
          }
        }
        return node
      })
    )
  }, [handleDialogueTextChange, handleResponseTextChange, setNodes])

  // Handle connections
  const onConnect = useCallback(
    (params: Connection | Edge) => {
      setEdges(eds => addEdge({ ...params, type: 'smoothstep' }, eds))
    },
    [setEdges]
  )

  // Add new dialogue node
  const addDialogueNode = useCallback(() => {
    const newNodeId = `dialogue-${Date.now()}`
    const newNode: Node<DialogueNodeData> = {
      id: newNodeId,
      type: 'dialogueNode',
      position: { x: 400, y: nodes.length * 100 + 200 },
      data: {
        id: newNodeId,
        text: '',
        onTextChange: handleDialogueTextChange
      }
    }
    setNodes(nds => [...nds, newNode])
  }, [nodes.length, setNodes, handleDialogueTextChange])

  // Add new response node
  const addResponseNode = useCallback(() => {
    const newNodeId = `response-${Date.now()}`
    const newNode: Node<ResponseNodeData> = {
      id: newNodeId,
      type: 'responseNode',
      position: { x: 600, y: nodes.length * 100 + 200 },
      data: {
        id: newNodeId,
        text: '',
        onTextChange: handleResponseTextChange
      }
    }
    setNodes(nds => [...nds, newNode])
  }, [nodes.length, setNodes, handleResponseTextChange])

  // Auto-layout
  const handleAutoLayout = useCallback(() => {
    const layoutedNodes = autoLayoutNodes(nodes, edges)
    setNodes(layoutedNodes)
  }, [nodes, edges, setNodes])

  // Delete selected node
  const deleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return

    // Don't allow deleting start node
    if (selectedNodeId === 'start') return

    setNodes(nds => nds.filter(n => n.id !== selectedNodeId))
    setEdges(eds => eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId))
    setSelectedNodeId(null)
  }, [selectedNodeId, setNodes, setEdges])

  // Export to JSON
  const handleExport = useCallback(() => {
    const { dialogueNodes: exportedNodes, entryNodeId: exportedEntry } = nodesToDialogue(
      nodes,
      edges
    )

    const exportData = {
      entryNodeId: exportedEntry,
      nodes: exportedNodes
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `dialogue-tree-${Date.now()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }, [nodes, edges])

  // Save changes back to parent
  const handleSave = useCallback(() => {
    const { dialogueNodes: savedNodes, entryNodeId: savedEntry } = nodesToDialogue(nodes, edges)
    onNodesChange(savedNodes, savedEntry)
  }, [nodes, edges, onNodesChange])

  // Handle node selection
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id)
  }, [])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId && selectedNodeId !== 'start') {
          deleteSelectedNode()
        }
      }
      // Save (Cmd/Ctrl + S)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodeId, deleteSelectedNode, handleSave])

  return (
    <Card className="p-0 h-[800px] relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeInternal}
        onEdgesChange={onEdgesChangeInternal}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-bg-secondary rounded-lg"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'startNode':
                return '#a78bfa'
              case 'dialogueNode':
                return '#60a5fa'
              case 'responseNode':
                return '#34d399'
              case 'endNode':
                return '#f87171'
              default:
                return '#666'
            }
          }}
        />

        {/* Toolbar */}
        <Panel position="top-left" className="flex gap-2 bg-bg-primary bg-opacity-90 p-3 rounded-lg border border-border-primary">
          <Button onClick={addDialogueNode} size="sm" variant="secondary">
            <MessageSquare size={14} className="mr-1" />
            Add Dialogue
          </Button>
          <Button onClick={addResponseNode} size="sm" variant="secondary">
            <MessageCircle size={14} className="mr-1" />
            Add Response
          </Button>
          <Button onClick={handleAutoLayout} size="sm" variant="ghost">
            <Layout size={14} className="mr-1" />
            Auto Layout
          </Button>
          {selectedNodeId && selectedNodeId !== 'start' && (
            <Button onClick={deleteSelectedNode} size="sm" variant="ghost">
              <Trash2 size={14} className="mr-1" />
              Delete
            </Button>
          )}
        </Panel>

        {/* Validation Panel */}
        <Panel position="top-right" className="bg-bg-primary bg-opacity-90 p-3 rounded-lg border border-border-primary max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle
              size={16}
              className={validation.valid ? 'text-green-400' : 'text-yellow-400'}
            />
            <span className="text-sm font-semibold text-text-primary">
              {validation.valid ? 'Valid Tree' : 'Validation Issues'}
            </span>
          </div>

          {validation.errors.length > 0 && (
            <div className="space-y-1 mb-2">
              {validation.errors.map((error, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs block">
                  Error: {error}
                </Badge>
              ))}
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="space-y-1">
              {validation.warnings.slice(0, 3).map((warning, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs block">
                  {warning}
                </Badge>
              ))}
              {validation.warnings.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{validation.warnings.length - 3} more warnings
                </Badge>
              )}
            </div>
          )}
        </Panel>

        {/* Action Buttons */}
        <Panel position="bottom-right" className="flex gap-2 bg-bg-primary bg-opacity-90 p-3 rounded-lg border border-border-primary">
          <Button onClick={handleExport} size="sm" variant="ghost">
            <Download size={14} className="mr-1" />
            Export JSON
          </Button>
          <Button onClick={handleSave} size="sm" variant="primary">
            <FileJson size={14} className="mr-1" />
            Save Changes
          </Button>
        </Panel>
      </ReactFlow>
    </Card>
  )
}
