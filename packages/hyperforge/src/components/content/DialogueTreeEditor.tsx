"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  DragEvent,
} from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useKeyPress,
  useOnSelectionChange,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  MarkerType,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { NeonInput } from "@/components/ui/neon-input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import {
  Plus,
  Trash2,
  Save,
  Wand2,
  Mic,
  Play,
  Pause,
  Loader2,
  Undo2,
  Redo2,
  LayoutGrid,
  Maximize,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type {
  DialogueTree,
  DialogueNode,
  DialogueResponse,
  DialogueAudio,
} from "@/types/game/dialogue-types";
import { logger } from "@/lib/utils";

// Import custom components
import {
  dialogueNodeTypes,
  type DialogueNodeData,
  type EndNodeData,
} from "./dialogue/dialogue-nodes";
import {
  dialogueEdgeTypes,
  type ResponseEdgeData,
} from "./dialogue/dialogue-edges";
import {
  DialogueContextMenu,
  type ContextMenuPosition,
  type ContextMenuType,
} from "./dialogue/dialogue-context-menu";
import {
  DialoguePalette,
  type DraggableNodeType,
} from "./dialogue/dialogue-palette";
import {
  useAutoLayout,
  type LayoutDirection,
} from "./dialogue/use-auto-layout";
import { useDialogueHistory } from "./dialogue/use-dialogue-history";

const log = logger.child("DialogueTreeEditor");

interface DialogueTreeEditorProps {
  initialTree?: DialogueTree;
  npcName: string;
  npcId?: string;
  onSave: (tree: DialogueTree) => void;
  onGenerate?: () => void;
}

interface VoicePreset {
  id: string;
  voiceId: string;
  name: string;
  description: string;
}

// Inner component that uses useReactFlow
function DialogueTreeEditorInner({
  initialTree,
  npcName: _npcName,
  npcId,
  onSave,
  onGenerate,
}: DialogueTreeEditorProps) {
  const { toast } = useToast();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const {
    screenToFlowPosition,
    fitView,
    getNodes,
    getEdges,
    setNodes: _setNodes,
    setEdges: _setEdges,
  } = useReactFlow();

  // State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [_selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<DialogueNode | null>(null);
  const [entryNodeId, setEntryNodeId] = useState<string>(
    initialTree?.entryNodeId || "greeting",
  );
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>("TB");

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: ContextMenuPosition;
    type: ContextMenuType;
    nodeId?: string;
    edgeId?: string;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    type: "canvas",
  });

  // Audio state
  const [voicePresets, setVoicePresets] = useState<VoicePreset[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [nodeAudio, setNodeAudio] = useState<Map<string, DialogueAudio>>(
    new Map(),
  );
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingAllAudio, setIsGeneratingAllAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingNodeId, setPlayingNodeId] = useState<string | null>(null);
  const audioRef = useRef<globalThis.HTMLAudioElement | null>(null);

  // Clipboard for copy/paste
  const [clipboard, _setClipboard] = useState<Node | null>(null);

  // Hooks
  const { runLayout, getLayoutedElements } = useAutoLayout({
    direction: layoutDirection,
    nodeWidth: 280,
    nodeHeight: 180,
  });
  const { pushState, initializeHistory, undo, redo, canUndo, canRedo } =
    useDialogueHistory();

  // Keyboard shortcuts
  const deletePressed = useKeyPress(["Delete", "Backspace"]);
  const undoPressed = useKeyPress(["Meta+z", "Control+z"]);
  const redoPressed = useKeyPress(["Meta+Shift+z", "Control+Shift+z"]);
  const duplicatePressed = useKeyPress(["Meta+d", "Control+d"]);
  const escapePressed = useKeyPress("Escape");

  // Convert dialogue tree to React Flow nodes and edges
  const convertTreeToFlow = useCallback(
    (tree: DialogueTree): { nodes: Node[]; edges: Edge[] } => {
      if (!tree || !tree.nodes) {
        return { nodes: [], edges: [] };
      }

      const nodes: Node[] = tree.nodes.map((node, index) => {
        const isEnd = !node.responses || node.responses.length === 0;
        const isEntry = node.id === tree.entryNodeId;

        const baseData = {
          label: node.id,
          text: node.text,
          onEdit: () => handleEditNode(node.id),
          onDelete: () => handleDeleteNode(node.id),
        };

        if (isEnd && !isEntry) {
          return {
            id: node.id,
            type: "end",
            position: {
              x: 100 + (index % 3) * 350,
              y: 100 + Math.floor(index / 3) * 220,
            },
            data: baseData as EndNodeData,
          };
        }

        return {
          id: node.id,
          type: "dialogue",
          position: {
            x: 100 + (index % 3) * 350,
            y: 100 + Math.floor(index / 3) * 220,
          },
          data: {
            ...baseData,
            responses: node.responses || [],
            isEntry,
            hasAudio: !!node.audio || nodeAudio.has(node.id),
            audioUrl: node.audio?.url || nodeAudio.get(node.id)?.url,
            onDuplicate: () => handleDuplicateNode(node.id),
            onSetEntry: () => handleSetEntry(node.id),
            onGenerateAudio: () => handleGenerateNodeAudio(node),
            onPlayAudio: () => handlePlayNodeAudio(node.id),
            isPlayingAudio: playingNodeId === node.id && isPlayingAudio,
            isGeneratingAudio: isGeneratingAudio,
          } as DialogueNodeData,
        };
      });

      const edges: Edge[] = [];
      for (const node of tree.nodes) {
        if (node.responses) {
          for (let i = 0; i < node.responses.length; i++) {
            const response = node.responses[i];
            if (response.nextNodeId && response.nextNodeId !== "end") {
              const hasEffect = response.effect && response.effect.length > 0;
              edges.push({
                id: `${node.id}-${response.nextNodeId}-${i}`,
                source: node.id,
                sourceHandle: `response-${i}`,
                target: response.nextNodeId,
                type: hasEffect ? "effect" : "response",
                data: {
                  label: response.text,
                  effect: response.effect,
                  responseIndex: i,
                  onEdit: () => handleEditEdge(node.id, i),
                  onDelete: () => handleDeleteEdge(node.id, i),
                } as ResponseEdgeData,
                markerEnd: { type: MarkerType.ArrowClosed },
              });
            }
          }
        }
      }

      return { nodes, edges };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Handler functions are created inline in node data; adding them would cause infinite loops
    [nodeAudio, playingNodeId, isPlayingAudio, isGeneratingAudio],
  );

  // Initialize nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!initialTree) {
      return { initialNodes: [], initialEdges: [] };
    }

    const { nodes, edges } = convertTreeToFlow(initialTree);

    // Apply auto-layout on initial load
    const { nodes: layoutedNodes } = getLayoutedElements(
      nodes,
      edges,
      initialTree.entryNodeId,
      layoutDirection,
    );

    return { initialNodes: layoutedNodes, initialEdges: edges };
  }, [initialTree, convertTreeToFlow, getLayoutedElements, layoutDirection]);

  const [nodes, setNodesState, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdgesState, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when nodeAudio or audio playback state changes
  useEffect(() => {
    setNodesState((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          hasAudio: nodeAudio.has(node.id),
          audioUrl: nodeAudio.get(node.id)?.url,
          isPlayingAudio: playingNodeId === node.id && isPlayingAudio,
        },
      })),
    );
  }, [nodeAudio, playingNodeId, isPlayingAudio, setNodesState]);

  // Update node callbacks when handler functions change
  // This ensures callbacks don't become stale after state updates
  useEffect(() => {
    setNodesState((nds) =>
      nds.map((node) => {
        // For end nodes, only update the basic callbacks
        if (node.type === "end") {
          return {
            ...node,
            data: {
              ...node.data,
              onEdit: () => handleEditNode(node.id),
              onDelete: () => handleDeleteNode(node.id),
            },
          };
        }

        // For dialogue nodes, get the current node data to construct the DialogueNode
        const nodeData = node.data as DialogueNodeData;
        const dialogueNode: DialogueNode = {
          id: node.id,
          text: nodeData.text || "",
          responses: nodeData.responses || [],
          audio: nodeAudio.get(node.id),
        };

        // Update all callbacks for dialogue nodes
        return {
          ...node,
          data: {
            ...node.data,
            isEntry: node.id === entryNodeId,
            onEdit: () => handleEditNode(node.id),
            onDelete: () => handleDeleteNode(node.id),
            onDuplicate: () => handleDuplicateNode(node.id),
            onSetEntry: () => handleSetEntry(node.id),
            onGenerateAudio: () => handleGenerateNodeAudio(dialogueNode),
            onPlayAudio: () => handlePlayNodeAudio(node.id),
            isGeneratingAudio,
          },
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    entryNodeId,
    isGeneratingAudio,
    nodeAudio,
    setNodesState,
  ]);

  // Initialize history
  useEffect(() => {
    if (initialNodes.length > 0) {
      initializeHistory(initialNodes, initialEdges);
    }
  }, [initialNodes, initialEdges, initializeHistory]);

  // Track selection changes - memoized callback to prevent infinite loops
  const onSelectionChange = useCallback(
    ({
      nodes: selectedNodes,
      edges: selectedEdges,
    }: {
      nodes: Node[];
      edges: Edge[];
    }) => {
      if (selectedNodes.length > 0) {
        setSelectedNodeId(selectedNodes[0].id);
        setSelectedEdgeId(null);
      } else if (selectedEdges.length > 0) {
        setSelectedEdgeId(selectedEdges[0].id);
        setSelectedNodeId(null);
      } else {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
      }
    },
    [],
  );

  useOnSelectionChange({
    onChange: onSelectionChange,
  });

  // Load voice presets
  useEffect(() => {
    async function loadVoicePresets() {
      try {
        const res = await fetch("/api/audio/voices?type=presets");
        if (res.ok) {
          const data = await res.json();
          setVoicePresets(data.voices || []);
          if (data.voices?.length > 0) {
            setSelectedVoice(data.voices[0].id);
          }
        }
      } catch (err) {
        log.error("Failed to load voice presets:", err);
      }
    }
    loadVoicePresets();
  }, []);

  // Keyboard shortcut handlers
  useEffect(() => {
    if (deletePressed && selectedNodeId) {
      handleDeleteNode(selectedNodeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Handler is stable enough; adding it would cause unwanted re-runs
  }, [deletePressed, selectedNodeId]);

  useEffect(() => {
    if (undoPressed) {
      handleUndo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Handler is stable enough; adding it would cause unwanted re-runs
  }, [undoPressed]);

  useEffect(() => {
    if (redoPressed) {
      handleRedo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Handler is stable enough; adding it would cause unwanted re-runs
  }, [redoPressed]);

  useEffect(() => {
    if (duplicatePressed && selectedNodeId) {
      handleDuplicateNode(selectedNodeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Handler is stable enough; adding it would cause unwanted re-runs
  }, [duplicatePressed, selectedNodeId]);

  useEffect(() => {
    if (escapePressed) {
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setContextMenu((prev) => ({ ...prev, isOpen: false }));
    }
  }, [escapePressed]);

  // Node handlers
  const handleEditNode = useCallback(
    (nodeId: string) => {
      // Get the current node from React Flow to have the latest data
      const flowNode = getNodes().find((n) => n.id === nodeId);
      if (flowNode) {
        const nodeData = flowNode.data as DialogueNodeData | EndNodeData;
        const dialogueNode: DialogueNode = {
          id: flowNode.id,
          text: nodeData.text || "",
          responses:
            flowNode.type === "dialogue"
              ? (nodeData as DialogueNodeData).responses || []
              : undefined,
          audio: nodeAudio.get(flowNode.id),
        };
        setEditingNode(dialogueNode);
      }
    },
    [getNodes, nodeAudio],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (nodeId === entryNodeId) {
        toast({
          variant: "destructive",
          title: "Cannot Delete",
          description: "Entry node cannot be deleted",
        });
        return;
      }

      setNodesState((nds) => nds.filter((n) => n.id !== nodeId));
      setEdgesState((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
      );
      setSelectedNodeId(null);
      setEditingNode(null);

      // Push to history
      const updatedNodes = getNodes().filter((n) => n.id !== nodeId);
      const updatedEdges = getEdges().filter(
        (e) => e.source !== nodeId && e.target !== nodeId,
      );
      pushState(updatedNodes, updatedEdges);
    },
    [
      entryNodeId,
      setNodesState,
      setEdgesState,
      getNodes,
      getEdges,
      pushState,
      toast,
    ],
  );

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      const node = getNodes().find((n) => n.id === nodeId);
      if (!node) return;

      const newId = `${nodeId}_copy_${Date.now().toString(36).slice(-4)}`;
      const newNode: Node = {
        ...node,
        id: newId,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        data: {
          ...node.data,
          label: newId,
          isEntry: false,
          onEdit: () => handleEditNode(newId),
          onDelete: () => handleDeleteNode(newId),
          onDuplicate: () => handleDuplicateNode(newId),
          onSetEntry: () => handleSetEntry(newId),
        },
        selected: true,
      };

      setNodesState((nds) => [
        ...nds.map((n) => ({ ...n, selected: false })),
        newNode,
      ]);
      setSelectedNodeId(newId);

      // Push to history
      pushState([...getNodes(), newNode], getEdges());

      toast({
        variant: "success",
        title: "Node Duplicated",
        description: `Created copy: ${newId}`,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Handler functions in node.data are created inline; adding them would cause infinite loops
    [getNodes, getEdges, setNodesState, pushState, toast],
  );

  const handleSetEntry = useCallback(
    (nodeId: string) => {
      setEntryNodeId(nodeId);
      setNodesState((nds) =>
        nds.map((node) => ({
          ...node,
          data: {
            ...node.data,
            isEntry: node.id === nodeId,
          },
        })),
      );

      toast({
        variant: "success",
        title: "Entry Node Set",
        description: `"${nodeId}" is now the entry point`,
      });
    },
    [setNodesState, toast],
  );

  // Edge handlers
  const handleEditEdge = useCallback(
    (sourceNodeId: string, _responseIndex: number) => {
      // Get the current node from React Flow
      const flowNode = getNodes().find((n) => n.id === sourceNodeId);
      if (flowNode) {
        const nodeData = flowNode.data as DialogueNodeData | EndNodeData;
        const dialogueNode: DialogueNode = {
          id: flowNode.id,
          text: nodeData.text || "",
          responses:
            flowNode.type === "dialogue"
              ? (nodeData as DialogueNodeData).responses || []
              : undefined,
          audio: nodeAudio.get(flowNode.id),
        };
        setEditingNode(dialogueNode);
      }
    },
    [getNodes, nodeAudio],
  );

  const handleDeleteEdge = useCallback(
    (sourceNodeId: string, responseIndex: number) => {
      setEdgesState((eds) =>
        eds.filter(
          (e) =>
            !(
              e.source === sourceNodeId &&
              e.sourceHandle === `response-${responseIndex}`
            ),
        ),
      );

      // Push to history
      const updatedEdges = getEdges().filter(
        (e) =>
          !(
            e.source === sourceNodeId &&
            e.sourceHandle === `response-${responseIndex}`
          ),
      );
      pushState(getNodes(), updatedEdges);
    },
    [setEdgesState, getNodes, getEdges, pushState],
  );

  // Connection handler
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      const hasEffect = false; // Default to no effect

      setEdgesState((eds) =>
        addEdge(
          {
            ...connection,
            type: hasEffect ? "effect" : "response",
            data: {
              label: "New response",
              effect: undefined,
              responseIndex: 0,
            } as ResponseEdgeData,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds,
        ),
      );

      // Push to history
      setTimeout(() => {
        pushState(getNodes(), getEdges());
      }, 0);
    },
    [setEdgesState, getNodes, getEdges, pushState],
  );

  // Connection validation
  const isValidConnection = useCallback(
    (connection: Edge | Connection): boolean => {
      // No self-connections
      if (connection.source === connection.target) {
        return false;
      }

      // Check if source is an end node
      const sourceNode = getNodes().find((n) => n.id === connection.source);
      if (sourceNode?.type === "end") {
        return false;
      }

      return true;
    },
    [getNodes],
  );

  // Context menu handlers
  const onPaneContextMenu = useCallback((event: MouseEvent | React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      type: "canvas",
    });
  }, []);

  const onNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
    event.preventDefault();
    setSelectedNodeId(node.id);
    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      type: "node",
      nodeId: node.id,
    });
  }, []);

  const onEdgeContextMenu: EdgeMouseHandler = useCallback((event, edge) => {
    event.preventDefault();
    setSelectedEdgeId(edge.id);
    setContextMenu({
      isOpen: true,
      position: { x: event.clientX, y: event.clientY },
      type: "edge",
      edgeId: edge.id,
    });
  }, []);

  // Drag and drop handlers
  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData(
        "application/reactflow",
      ) as DraggableNodeType;
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newId = `node_${Date.now().toString(36).slice(-6)}`;
      const isEntry = getNodes().length === 0;

      const baseData = {
        label: newId,
        text: type === "end" ? "End of dialogue" : "New dialogue text...",
        onEdit: () => handleEditNode(newId),
        onDelete: () => handleDeleteNode(newId),
      };

      const newNode: Node =
        type === "end"
          ? {
              id: newId,
              type: "end",
              position,
              data: baseData as EndNodeData,
            }
          : {
              id: newId,
              type: "dialogue",
              position,
              data: {
                ...baseData,
                responses: [],
                isEntry,
                hasAudio: false,
                onDuplicate: () => handleDuplicateNode(newId),
                onSetEntry: () => handleSetEntry(newId),
                onGenerateAudio: () => {},
                onPlayAudio: () => {},
              } as DialogueNodeData,
            };

      setNodesState((nds) => [...nds, newNode]);
      setSelectedNodeId(newId);

      if (isEntry) {
        setEntryNodeId(newId);
      }

      // Create editing node for immediate editing
      setEditingNode({
        id: newId,
        text: type === "end" ? "End of dialogue" : "New dialogue text...",
        responses: type === "end" ? undefined : [],
      });

      // Push to history
      pushState([...getNodes(), newNode], getEdges());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Handler functions in node.data are created inline; adding them would cause infinite loops
    [screenToFlowPosition, getNodes, getEdges, setNodesState, pushState],
  );

  // Add node from context menu
  const addNodeAtPosition = useCallback(
    (type: DraggableNodeType) => {
      const position = screenToFlowPosition({
        x: contextMenu.position.x,
        y: contextMenu.position.y,
      });

      const newId = `node_${Date.now().toString(36).slice(-6)}`;
      const isEntry = getNodes().length === 0;

      const baseData = {
        label: newId,
        text: type === "end" ? "End of dialogue" : "New dialogue text...",
        onEdit: () => handleEditNode(newId),
        onDelete: () => handleDeleteNode(newId),
      };

      const newNode: Node =
        type === "end"
          ? {
              id: newId,
              type: "end",
              position,
              data: baseData as EndNodeData,
            }
          : {
              id: newId,
              type: "dialogue",
              position,
              data: {
                ...baseData,
                responses: [],
                isEntry,
                hasAudio: false,
                onDuplicate: () => handleDuplicateNode(newId),
                onSetEntry: () => handleSetEntry(newId),
                onGenerateAudio: () => {},
                onPlayAudio: () => {},
              } as DialogueNodeData,
            };

      setNodesState((nds) => [...nds, newNode]);
      setSelectedNodeId(newId);

      if (isEntry) {
        setEntryNodeId(newId);
      }

      setEditingNode({
        id: newId,
        text: type === "end" ? "End of dialogue" : "New dialogue text...",
        responses: type === "end" ? undefined : [],
      });

      pushState([...getNodes(), newNode], getEdges());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Handler functions in node.data are created inline; adding them would cause infinite loops
    [
      contextMenu.position,
      screenToFlowPosition,
      getNodes,
      getEdges,
      setNodesState,
      pushState,
    ],
  );

  // Undo/Redo handlers
  const handleUndo = useCallback(() => {
    const state = undo();
    if (state) {
      setNodesState(state.nodes);
      setEdgesState(state.edges);
      toast({
        title: "Undo",
        description: "Reverted to previous state",
      });
    }
  }, [undo, setNodesState, setEdgesState, toast]);

  const handleRedo = useCallback(() => {
    const state = redo();
    if (state) {
      setNodesState(state.nodes);
      setEdgesState(state.edges);
      toast({
        title: "Redo",
        description: "Restored next state",
      });
    }
  }, [redo, setNodesState, setEdgesState, toast]);

  // Auto-layout handler
  const handleAutoLayout = useCallback(() => {
    runLayout(entryNodeId, layoutDirection);
    pushState(getNodes(), getEdges());
    toast({
      title: "Layout Applied",
      description: "Nodes have been organized",
    });
  }, [
    runLayout,
    entryNodeId,
    layoutDirection,
    getNodes,
    getEdges,
    pushState,
    toast,
  ]);

  // Audio handlers
  const handleGenerateNodeAudio = useCallback(
    async (node: DialogueNode) => {
      if (!selectedVoice || !node.text) return;

      setIsGeneratingAudio(true);
      try {
        const res = await fetch("/api/audio/voice/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: node.text,
            voicePreset: selectedVoice,
            npcId,
            dialogueNodeId: node.id,
            withTimestamps: true,
            saveToAsset: true,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to generate audio");
        }

        const data = await res.json();
        const audio: DialogueAudio = {
          url: data.asset.url,
          voiceId: data.asset.voiceId,
          duration: data.asset.duration,
          generatedAt: data.asset.generatedAt,
          timestamps: data.asset.timestamps,
        };

        setNodeAudio((prev) => new Map(prev).set(node.id, audio));

        if (editingNode?.id === node.id) {
          setEditingNode({ ...editingNode, audio });
        }

        toast({
          variant: "success",
          title: "Audio Generated",
          description: `Generated voice for "${node.id}"`,
        });

        // Auto-play
        if (audioRef.current && data.audio) {
          audioRef.current.src = data.audio;
          audioRef.current.play().catch((err) => {
            log.warn("Auto-play blocked", { error: err.message });
          });
          setPlayingNodeId(node.id);
          setIsPlayingAudio(true);
        }
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Audio Generation Failed",
          description: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setIsGeneratingAudio(false);
      }
    },
    [selectedVoice, npcId, editingNode, toast],
  );

  const handlePlayNodeAudio = useCallback(
    (nodeId: string) => {
      const audio = nodeAudio.get(nodeId);
      if (!audio || !audioRef.current) return;

      if (playingNodeId === nodeId && isPlayingAudio) {
        audioRef.current.pause();
        setIsPlayingAudio(false);
        setPlayingNodeId(null);
      } else {
        audioRef.current.src = audio.url;
        audioRef.current.play().catch((err) => {
          log.error("Failed to play audio", { error: err.message });
        });
        setPlayingNodeId(nodeId);
        setIsPlayingAudio(true);
      }
    },
    [nodeAudio, playingNodeId, isPlayingAudio],
  );

  const handleGenerateAllAudio = useCallback(async () => {
    if (!selectedVoice || !initialTree?.nodes) return;

    setIsGeneratingAllAudio(true);
    let successCount = 0;
    let errorCount = 0;

    for (const node of initialTree.nodes) {
      try {
        const res = await fetch("/api/audio/voice/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: node.text,
            voicePreset: selectedVoice,
            npcId,
            dialogueNodeId: node.id,
            withTimestamps: true,
            saveToAsset: true,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const audio: DialogueAudio = {
            url: data.asset.url,
            voiceId: data.asset.voiceId,
            duration: data.asset.duration,
            generatedAt: data.asset.generatedAt,
            timestamps: data.asset.timestamps,
          };
          setNodeAudio((prev) => new Map(prev).set(node.id, audio));
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    toast({
      variant: successCount > 0 ? "success" : "destructive",
      title: "Audio Generation Complete",
      description: `Generated ${successCount} clips, ${errorCount} failed`,
    });

    setIsGeneratingAllAudio(false);
  }, [selectedVoice, npcId, initialTree, toast]);

  // Save handler
  const handleSave = useCallback(() => {
    const dialogueNodes: DialogueNode[] = getNodes().map((node) => ({
      id: node.id,
      text: (node.data as DialogueNodeData | EndNodeData).text,
      responses:
        node.type === "dialogue"
          ? (node.data as DialogueNodeData).responses
          : undefined,
      audio: nodeAudio.get(node.id),
    }));

    const tree: DialogueTree = {
      entryNodeId,
      nodes: dialogueNodes,
    };

    onSave(tree);
    toast({
      variant: "success",
      title: "Dialogue Saved",
      description: `Saved ${tree.nodes.length} nodes`,
    });
  }, [getNodes, entryNodeId, nodeAudio, onSave, toast]);

  // Node click handler
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setSelectedNodeId(node.id);
      // Use the node data from React Flow directly
      const nodeData = node.data as DialogueNodeData | EndNodeData;
      const dialogueNode: DialogueNode = {
        id: node.id,
        text: nodeData.text || "",
        responses:
          node.type === "dialogue"
            ? (nodeData as DialogueNodeData).responses || []
            : undefined,
        audio: nodeAudio.get(node.id),
      };
      setEditingNode(dialogueNode);
    },
    [nodeAudio],
  );

  // Update node in editor panel
  const handleUpdateNode = useCallback(() => {
    if (!editingNode) return;

    setNodesState((nds) =>
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

    pushState(getNodes(), getEdges());

    toast({
      variant: "success",
      title: "Node Updated",
      description: `Updated node "${editingNode.id}"`,
    });
  }, [editingNode, setNodesState, getNodes, getEdges, pushState, toast]);

  const handleAddResponse = useCallback(() => {
    if (!editingNode) return;
    setEditingNode({
      ...editingNode,
      responses: [
        ...(editingNode.responses || []),
        { text: "New response...", nextNodeId: "end" },
      ],
    });
  }, [editingNode]);

  const handleUpdateResponse = useCallback(
    (index: number, field: keyof DialogueResponse, value: string) => {
      if (!editingNode || !editingNode.responses) return;
      const newResponses = [...editingNode.responses];
      newResponses[index] = { ...newResponses[index], [field]: value };
      setEditingNode({ ...editingNode, responses: newResponses });
    },
    [editingNode],
  );

  const handleDeleteResponse = useCallback(
    (index: number) => {
      if (!editingNode || !editingNode.responses) return;
      const newResponses = editingNode.responses.filter((_, i) => i !== index);
      setEditingNode({ ...editingNode, responses: newResponses });
    },
    [editingNode],
  );

  return (
    <div className="flex h-full">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={() => {
          setIsPlayingAudio(false);
          setPlayingNodeId(null);
        }}
        onError={(e) => {
          const audio = e.currentTarget;
          log.error("Audio error", {
            error: audio.error?.message,
            code: audio.error?.code,
          });
          setIsPlayingAudio(false);
          setPlayingNodeId(null);
        }}
      />

      {/* Node Palette (collapsible) */}
      <div
        className={`
          relative transition-all duration-300 ease-in-out
          ${isPaletteOpen ? "w-52" : "w-0"}
        `}
      >
        {isPaletteOpen && (
          <div className="absolute inset-0 overflow-hidden border-r border-glass-border">
            <DialoguePalette className="h-full rounded-none border-0" />
          </div>
        )}
        <button
          onClick={() => setIsPaletteOpen(!isPaletteOpen)}
          className="absolute top-4 -right-4 z-10 w-8 h-8 flex items-center justify-center bg-glass-bg border border-glass-border rounded-full shadow-lg hover:bg-primary/10 transition-colors"
        >
          {isPaletteOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Flow Canvas */}
      <div
        ref={reactFlowWrapper}
        className="flex-1 h-full"
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          nodeTypes={dialogueNodeTypes}
          edgeTypes={dialogueEdgeTypes}
          isValidConnection={isValidConnection}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          className="bg-gradient-to-br from-background to-background/80"
          deleteKeyCode={null} // We handle delete ourselves
          multiSelectionKeyCode={["Meta", "Control"]}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="oklch(var(--muted-foreground) / 0.15)"
          />

          <Controls
            className="!bg-glass-bg/90 !border-glass-border !rounded-xl overflow-hidden"
            showZoom
            showFitView
            showInteractive={false}
          />

          <MiniMap
            className="!bg-glass-bg/90 !border-glass-border !rounded-xl overflow-hidden"
            nodeColor={(node) => {
              if (node.type === "end") return "oklch(0.7 0.2 25)";
              if ((node.data as DialogueNodeData)?.isEntry)
                return "oklch(0.7 0.2 145)";
              return "oklch(var(--primary))";
            }}
            maskColor="oklch(var(--background) / 0.8)"
            pannable
            zoomable
          />

          {/* Top Toolbar Panel */}
          <Panel position="top-left" className="flex gap-2">
            <SpectacularButton
              size="sm"
              onClick={() => addNodeAtPosition("dialogue")}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Node
            </SpectacularButton>
            <SpectacularButton size="sm" variant="outline" onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </SpectacularButton>
            {onGenerate && (
              <SpectacularButton size="sm" onClick={onGenerate}>
                <Wand2 className="w-4 h-4 mr-1" />
                Regenerate
              </SpectacularButton>
            )}
            <div className="w-px h-6 bg-glass-border mx-1" />
            <SpectacularButton
              size="sm"
              variant="ghost"
              onClick={handleUndo}
              disabled={!canUndo}
              title="Undo (Cmd+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </SpectacularButton>
            <SpectacularButton
              size="sm"
              variant="ghost"
              onClick={handleRedo}
              disabled={!canRedo}
              title="Redo (Cmd+Shift+Z)"
            >
              <Redo2 className="w-4 h-4" />
            </SpectacularButton>
            <div className="w-px h-6 bg-glass-border mx-1" />
            <SpectacularButton
              size="sm"
              variant="ghost"
              onClick={handleAutoLayout}
              title="Auto Layout"
            >
              <LayoutGrid className="w-4 h-4" />
            </SpectacularButton>
            <Select
              value={layoutDirection}
              onChange={(v) => setLayoutDirection(v as LayoutDirection)}
              options={[
                { value: "TB", label: "↓ Top-Bottom" },
                { value: "LR", label: "→ Left-Right" },
                { value: "BT", label: "↑ Bottom-Top" },
                { value: "RL", label: "← Right-Left" },
              ]}
              className="w-32"
            />
            <SpectacularButton
              size="sm"
              variant="ghost"
              onClick={() => fitView({ duration: 500, padding: 0.2 })}
              title="Fit View"
            >
              <Maximize className="w-4 h-4" />
            </SpectacularButton>
          </Panel>

          {/* Bottom Voice Controls Panel */}
          <Panel position="bottom-left" className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-glass-bg/90 backdrop-blur-md p-2 rounded-xl border border-glass-border">
              <Mic className="w-4 h-4 text-cyan-400" />
              <Select
                value={selectedVoice}
                onChange={(value) => setSelectedVoice(value)}
                options={voicePresets.map((p) => ({
                  value: p.id,
                  label: p.name,
                }))}
                placeholder="Voice..."
                className="w-32"
              />
              <SpectacularButton
                size="sm"
                onClick={handleGenerateAllAudio}
                disabled={!selectedVoice || isGeneratingAllAudio}
              >
                {isGeneratingAllAudio ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
                <span className="ml-1">Generate All</span>
              </SpectacularButton>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Context Menu */}
      <DialogueContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        type={contextMenu.type}
        onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
        // Canvas actions
        onAddDialogueNode={() => addNodeAtPosition("dialogue")}
        onAddEndNode={() => addNodeAtPosition("end")}
        onPaste={() => {
          if (clipboard) {
            const position = screenToFlowPosition(contextMenu.position);
            const newNode = {
              ...clipboard,
              id: `${clipboard.id}_paste_${Date.now().toString(36).slice(-4)}`,
              position,
            };
            setNodesState((nds) => [...nds, newNode]);
            pushState([...getNodes(), newNode], getEdges());
          }
        }}
        onFitView={() => fitView({ duration: 500, padding: 0.2 })}
        onAutoLayout={handleAutoLayout}
        // Node actions
        onEditNode={() =>
          contextMenu.nodeId && handleEditNode(contextMenu.nodeId)
        }
        onDeleteNode={() =>
          contextMenu.nodeId && handleDeleteNode(contextMenu.nodeId)
        }
        onDuplicateNode={() =>
          contextMenu.nodeId && handleDuplicateNode(contextMenu.nodeId)
        }
        onSetAsEntry={() =>
          contextMenu.nodeId && handleSetEntry(contextMenu.nodeId)
        }
        onAddResponse={handleAddResponse}
        onGenerateAudio={() => {
          if (contextMenu.nodeId) {
            const node = initialTree?.nodes.find(
              (n) => n.id === contextMenu.nodeId,
            );
            if (node) handleGenerateNodeAudio(node);
          }
        }}
        isEntryNode={contextMenu.nodeId === entryNodeId}
        // Edge actions
        onEditEdge={() => {
          const edge = getEdges().find((e) => e.id === contextMenu.edgeId);
          if (edge) {
            const data = edge.data as ResponseEdgeData;
            handleEditEdge(edge.source, data?.responseIndex || 0);
          }
        }}
        onDeleteEdge={() => {
          const edge = getEdges().find((e) => e.id === contextMenu.edgeId);
          if (edge) {
            const data = edge.data as ResponseEdgeData;
            handleDeleteEdge(edge.source, data?.responseIndex || 0);
          }
        }}
        onAddEffect={() => {
          // Open edge editor to add effect
          const edge = getEdges().find((e) => e.id === contextMenu.edgeId);
          if (edge) {
            const data = edge.data as ResponseEdgeData;
            handleEditEdge(edge.source, data?.responseIndex || 0);
          }
        }}
        hasEffect={
          contextMenu.edgeId
            ? !!(
                getEdges().find((e) => e.id === contextMenu.edgeId)
                  ?.data as ResponseEdgeData
              )?.effect
            : false
        }
      />

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
                className="w-full h-24 p-2 bg-glass-bg border border-glass-border rounded-lg text-sm resize-none focus:outline-none focus:border-primary"
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
                  className="p-2.5 bg-glass-bg/50 rounded-lg space-y-2 border border-glass-border/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">
                      Response {index + 1}
                    </span>
                    <SpectacularButton
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteResponse(index)}
                      className="text-red-400 hover:text-red-300"
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
                    placeholder="Effect (e.g., openShop, startQuest:goblin_slayer)"
                    className="text-sm font-mono"
                  />
                </div>
              ))}
            </div>

            <SpectacularButton className="w-full" onClick={handleUpdateNode}>
              Update Node
            </SpectacularButton>

            {/* Audio Section */}
            <div className="border-t border-glass-border pt-4 mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-cyan-400" />
                  Voice Audio
                </Label>
                {(editingNode.audio || nodeAudio.has(editingNode.id)) && (
                  <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">
                    Generated
                  </span>
                )}
              </div>

              {(editingNode.audio || nodeAudio.has(editingNode.id)) && (
                <div className="flex items-center gap-2">
                  <SpectacularButton
                    size="sm"
                    variant="outline"
                    onClick={() => handlePlayNodeAudio(editingNode.id)}
                  >
                    {playingNodeId === editingNode.id && isPlayingAudio ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </SpectacularButton>
                  <span className="text-xs text-muted-foreground">
                    {(
                      editingNode.audio?.duration ||
                      nodeAudio.get(editingNode.id)?.duration ||
                      0
                    ).toFixed(1)}
                    s
                  </span>
                </div>
              )}

              <SpectacularButton
                size="sm"
                className="w-full"
                onClick={() => handleGenerateNodeAudio(editingNode)}
                disabled={!selectedVoice || isGeneratingAudio}
              >
                {isGeneratingAudio ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-1" />
                    {editingNode.audio || nodeAudio.has(editingNode.id)
                      ? "Regenerate Voice"
                      : "Generate Voice"}
                  </>
                )}
              </SpectacularButton>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
            <p className="text-sm">
              Click a node to edit it, or drag from the palette to add new
              nodes.
            </p>
            <p className="text-xs mt-2">Right-click for more options.</p>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}

// Wrapper component with ReactFlowProvider
export function DialogueTreeEditor(props: DialogueTreeEditorProps) {
  return (
    <ReactFlowProvider>
      <DialogueTreeEditorInner {...props} />
    </ReactFlowProvider>
  );
}
