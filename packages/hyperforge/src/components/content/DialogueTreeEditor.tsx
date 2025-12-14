"use client";

import { useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  MarkerType,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { NeonInput } from "@/components/ui/neon-input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { Plus, Trash2, Save, Wand2 } from "lucide-react";
import type {
  DialogueTree,
  DialogueNode,
  DialogueResponse,
} from "@/types/game/dialogue-types";

interface DialogueTreeEditorProps {
  initialTree?: DialogueTree;
  npcName: string;
  onSave: (tree: DialogueTree) => void;
  onGenerate?: () => void;
}

// Custom node component for dialogue nodes
function DialogueNodeComponent({
  data,
  selected,
}: {
  data: {
    label: string;
    text: string;
    responses: DialogueResponse[];
    isEntry: boolean;
    onEdit: () => void;
  };
  selected: boolean;
}) {
  return (
    <div
      className={`
        p-3 rounded-lg border-2 min-w-[200px] max-w-[300px]
        ${selected ? "border-primary shadow-lg shadow-primary/20" : "border-glass-border"}
        ${data.isEntry ? "bg-green-900/30" : "bg-glass-bg"}
        backdrop-blur-sm
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-primary"
      />

      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground">
          {data.label}
        </span>
        {data.isEntry && (
          <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
            ENTRY
          </span>
        )}
      </div>

      <p className="text-sm mb-2 text-foreground">{data.text}</p>

      {data.responses && data.responses.length > 0 && (
        <div className="space-y-1 border-t border-glass-border pt-2">
          {data.responses.map((response, index) => (
            <div
              key={index}
              className="text-xs text-muted-foreground bg-glass-bg/50 px-2 py-1 rounded"
            >
              → {response.text}
              {response.effect && (
                <span className="ml-1 text-primary">[{response.effect}]</span>
              )}
            </div>
          ))}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-primary"
      />
    </div>
  );
}

const nodeTypes = {
  dialogue: DialogueNodeComponent,
};

export function DialogueTreeEditor({
  initialTree,
  npcName,
  onSave,
  onGenerate,
}: DialogueTreeEditorProps) {
  const { toast } = useToast();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<DialogueNode | null>(null);

  // Convert dialogue tree to React Flow nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!initialTree) {
      return { initialNodes: [], initialEdges: [] };
    }

    const nodes: Node[] = initialTree.nodes.map((node, index) => ({
      id: node.id,
      type: "dialogue",
      position: {
        x: 100 + (index % 3) * 350,
        y: 100 + Math.floor(index / 3) * 200,
      },
      data: {
        label: node.id,
        text: node.text,
        responses: node.responses || [],
        isEntry: node.id === initialTree.entryNodeId,
        onEdit: () => setEditingNode(node),
      },
    }));

    const edges: Edge[] = [];
    for (const node of initialTree.nodes) {
      if (node.responses) {
        for (const response of node.responses) {
          if (response.nextNodeId !== "end") {
            edges.push({
              id: `${node.id}-${response.nextNodeId}`,
              source: node.id,
              target: response.nextNodeId,
              label:
                response.text.slice(0, 20) +
                (response.text.length > 20 ? "..." : ""),
              markerEnd: { type: MarkerType.ArrowClosed },
              style: { stroke: "oklch(var(--primary))" },
              labelStyle: { fill: "oklch(var(--foreground))", fontSize: 10 },
            });
          }
        }
      }
    }

    return { initialNodes: nodes, initialEdges: edges };
  }, [initialTree]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: "oklch(var(--primary))" },
          },
          eds,
        ),
      );
    },
    [setEdges],
  );

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      setSelectedNodeId(node.id);
      // Find the full node data
      const dialogueNode = initialTree?.nodes.find((n) => n.id === node.id);
      if (dialogueNode) {
        setEditingNode({ ...dialogueNode });
      }
    },
    [initialTree],
  );

  // Convert React Flow state back to DialogueTree
  const buildDialogueTree = useCallback((): DialogueTree => {
    const dialogueNodes: DialogueNode[] = nodes.map((node) => ({
      id: node.id,
      text: node.data.text as string,
      responses: node.data.responses as DialogueResponse[],
    }));

    // Find entry node
    const entryNode = nodes.find((n) => n.data.isEntry);
    const entryNodeId =
      entryNode?.id || (nodes.length > 0 ? nodes[0].id : "greeting");

    return {
      entryNodeId,
      nodes: dialogueNodes,
    };
  }, [nodes]);

  const handleSave = () => {
    const tree = buildDialogueTree();
    onSave(tree);
    toast({
      variant: "success",
      title: "Dialogue Saved",
      description: `Saved ${tree.nodes.length} nodes`,
    });
  };

  const handleAddNode = () => {
    const newId = `node_${Date.now()}`;
    const newNode: Node = {
      id: newId,
      type: "dialogue",
      position: { x: 250, y: 250 },
      data: {
        label: newId,
        text: "New dialogue text...",
        responses: [],
        isEntry: nodes.length === 0,
        onEdit: () => {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(newId);
    setEditingNode({
      id: newId,
      text: "New dialogue text...",
      responses: [],
    });
  };

  const handleDeleteNode = () => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) =>
      eds.filter(
        (e) => e.source !== selectedNodeId && e.target !== selectedNodeId,
      ),
    );
    setSelectedNodeId(null);
    setEditingNode(null);
  };

  const handleUpdateNode = () => {
    if (!editingNode) return;
    setNodes((nds) =>
      nds.map((node) =>
        node.id === editingNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                text: editingNode.text,
                responses: editingNode.responses || [],
              },
            }
          : node,
      ),
    );
    toast({
      variant: "success",
      title: "Node Updated",
      description: `Updated node "${editingNode.id}"`,
    });
  };

  const handleAddResponse = () => {
    if (!editingNode) return;
    setEditingNode({
      ...editingNode,
      responses: [
        ...(editingNode.responses || []),
        { text: "New response...", nextNodeId: "end" },
      ],
    });
  };

  const handleUpdateResponse = (
    index: number,
    field: keyof DialogueResponse,
    value: string,
  ) => {
    if (!editingNode || !editingNode.responses) return;
    const newResponses = [...editingNode.responses];
    newResponses[index] = { ...newResponses[index], [field]: value };
    setEditingNode({ ...editingNode, responses: newResponses });
  };

  const handleDeleteResponse = (index: number) => {
    if (!editingNode || !editingNode.responses) return;
    const newResponses = editingNode.responses.filter((_, i) => i !== index);
    setEditingNode({ ...editingNode, responses: newResponses });
  };

  return (
    <div className="flex h-full">
      {/* Flow Canvas */}
      <div className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-background"
        >
          <Background color="oklch(var(--muted-foreground) / 0.2)" gap={20} />
          <Controls className="!bg-glass-bg !border-glass-border" />
          <MiniMap
            className="!bg-glass-bg !border-glass-border"
            nodeColor="oklch(var(--primary))"
          />
        </ReactFlow>

        {/* Toolbar */}
        <div className="absolute top-4 left-4 flex gap-2">
          <SpectacularButton size="sm" onClick={handleAddNode}>
            <Plus className="w-4 h-4 mr-1" />
            Add Node
          </SpectacularButton>
          {selectedNodeId && (
            <SpectacularButton
              size="sm"
              variant="destructive"
              onClick={handleDeleteNode}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </SpectacularButton>
          )}
          <SpectacularButton size="sm" variant="outline" onClick={handleSave}>
            <Save className="w-4 h-4 mr-1" />
            Save
          </SpectacularButton>
          {onGenerate && (
            <SpectacularButton size="sm" onClick={onGenerate}>
              <Wand2 className="w-4 h-4 mr-1" />
              Generate
            </SpectacularButton>
          )}
        </div>
      </div>

      {/* Node Editor Panel */}
      <GlassPanel className="w-80 h-full p-4 border-l border-glass-border overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {editingNode ? `Edit: ${editingNode.id}` : "Node Editor"}
        </h3>

        {editingNode ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Node ID</Label>
              <NeonInput
                value={editingNode.id}
                disabled
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>NPC Text</Label>
              <textarea
                value={editingNode.text}
                onChange={(e) =>
                  setEditingNode({ ...editingNode, text: e.target.value })
                }
                className="w-full h-24 p-2 bg-glass-bg border border-glass-border rounded text-sm resize-none"
                placeholder="What the NPC says..."
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Responses</Label>
                <SpectacularButton
                  size="sm"
                  variant="ghost"
                  onClick={handleAddResponse}
                >
                  <Plus className="w-3 h-3" />
                </SpectacularButton>
              </div>

              {editingNode.responses?.map((response, index) => (
                <div
                  key={index}
                  className="p-2 bg-glass-bg/50 rounded space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Response {index + 1}
                    </span>
                    <SpectacularButton
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteResponse(index)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </SpectacularButton>
                  </div>
                  <NeonInput
                    value={response.text}
                    onChange={(e) =>
                      handleUpdateResponse(index, "text", e.target.value)
                    }
                    placeholder="Player response..."
                    className="text-sm"
                  />
                  <NeonInput
                    value={response.nextNodeId}
                    onChange={(e) =>
                      handleUpdateResponse(index, "nextNodeId", e.target.value)
                    }
                    placeholder="Next node ID or 'end'"
                    className="text-sm font-mono"
                  />
                  <NeonInput
                    value={response.effect || ""}
                    onChange={(e) =>
                      handleUpdateResponse(index, "effect", e.target.value)
                    }
                    placeholder="Effect (optional)"
                    className="text-sm font-mono"
                  />
                </div>
              ))}
            </div>

            <SpectacularButton className="w-full" onClick={handleUpdateNode}>
              Update Node
            </SpectacularButton>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Click a node to edit it, or use the toolbar to add new nodes.
          </p>
        )}
      </GlassPanel>
    </div>
  );
}
