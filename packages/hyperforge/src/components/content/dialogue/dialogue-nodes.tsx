"use client";

import { memo, useState } from "react";
import { Handle, Position, NodeToolbar, type NodeProps } from "@xyflow/react";
import {
  Play,
  Pause,
  Volume2,
  Edit,
  Trash2,
  Copy,
  Star,
  Mic,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import type { DialogueResponse } from "@/types/game/dialogue-types";

// Node data types - includes index signature for ReactFlow compatibility
export interface DialogueNodeData {
  label: string;
  text: string;
  responses: DialogueResponse[];
  isEntry: boolean;
  hasAudio: boolean;
  audioUrl?: string;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onSetEntry: () => void;
  onGenerateAudio: () => void;
  onPlayAudio: () => void;
  isPlayingAudio?: boolean;
  isGeneratingAudio?: boolean;
  [key: string]: unknown;
}

export interface EndNodeData {
  label: string;
  text: string;
  onEdit: () => void;
  onDelete: () => void;
  [key: string]: unknown;
}

// Enhanced Dialogue Node Component
export const DialogueNode = memo(function DialogueNode({
  data,
  selected,
}: NodeProps & { data: DialogueNodeData }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasEffects = data.responses?.some((r) => r.effect);

  return (
    <>
      {/* Node Toolbar - appears above selected nodes */}
      <NodeToolbar
        isVisible={selected}
        position={Position.Top}
        className="flex gap-1 p-1 bg-glass-bg/95 backdrop-blur-md rounded-lg border border-glass-border shadow-lg"
      >
        <SpectacularButton
          size="sm"
          variant="ghost"
          onClick={data.onEdit}
          title="Edit Node"
        >
          <Edit className="w-3.5 h-3.5" />
        </SpectacularButton>
        <SpectacularButton
          size="sm"
          variant="ghost"
          onClick={data.onDuplicate}
          title="Duplicate Node"
        >
          <Copy className="w-3.5 h-3.5" />
        </SpectacularButton>
        {!data.isEntry && (
          <SpectacularButton
            size="sm"
            variant="ghost"
            onClick={data.onSetEntry}
            title="Set as Entry"
          >
            <Star className="w-3.5 h-3.5" />
          </SpectacularButton>
        )}
        <SpectacularButton
          size="sm"
          variant="ghost"
          onClick={data.onGenerateAudio}
          disabled={data.isGeneratingAudio}
          title="Generate Audio"
        >
          <Mic
            className={`w-3.5 h-3.5 ${data.isGeneratingAudio ? "animate-pulse" : ""}`}
          />
        </SpectacularButton>
        {data.hasAudio && (
          <SpectacularButton
            size="sm"
            variant="ghost"
            onClick={data.onPlayAudio}
            title={data.isPlayingAudio ? "Pause Audio" : "Play Audio"}
          >
            {data.isPlayingAudio ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
          </SpectacularButton>
        )}
        <div className="w-px h-4 bg-glass-border mx-1" />
        <SpectacularButton
          size="sm"
          variant="ghost"
          onClick={data.onDelete}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          title="Delete Node"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </SpectacularButton>
      </NodeToolbar>

      {/* Main Node */}
      <div
        className={`
          relative p-3 rounded-xl min-w-[220px] max-w-[320px]
          transition-all duration-200
          ${
            selected
              ? "border-2 border-primary shadow-lg shadow-primary/30 scale-[1.02]"
              : "border-2 border-glass-border hover:border-primary/50"
          }
          ${data.isEntry ? "bg-gradient-to-br from-green-900/40 to-glass-bg" : "bg-glass-bg/90"}
          backdrop-blur-md
        `}
      >
        {/* Target Handle */}
        <Handle
          type="target"
          position={Position.Top}
          className="!w-4 !h-4 !bg-primary !border-2 !border-background transition-transform hover:scale-125"
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground bg-glass-bg/50 px-2 py-0.5 rounded">
              {data.label}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {data.hasAudio && (
              <span className="flex items-center gap-1 text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">
                <Volume2 className="w-3 h-3" />
              </span>
            )}
            {hasEffects && (
              <span className="flex items-center gap-1 text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                <Zap className="w-3 h-3" />
              </span>
            )}
            {data.isEntry && (
              <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-semibold">
                ENTRY
              </span>
            )}
          </div>
        </div>

        {/* NPC Text */}
        <p className="text-sm mb-3 text-foreground leading-relaxed">
          {data.text.length > 100 ? `${data.text.slice(0, 100)}...` : data.text}
        </p>

        {/* Responses Section */}
        {data.responses && data.responses.length > 0 && (
          <div className="border-t border-glass-border pt-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground transition-colors mb-1"
            >
              <span>
                {data.responses.length} response
                {data.responses.length > 1 ? "s" : ""}
              </span>
              {isExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {isExpanded && (
              <div className="space-y-1.5 mt-2">
                {data.responses.map((response, index) => (
                  <div
                    key={index}
                    className="relative text-xs text-muted-foreground bg-glass-bg/70 px-2.5 py-1.5 rounded-lg border border-glass-border/50 group"
                  >
                    <span className="text-foreground/80">
                      → {response.text}
                    </span>
                    {response.effect && (
                      <span className="ml-1.5 text-primary font-mono text-[10px]">
                        [{response.effect}]
                      </span>
                    )}
                    {/* Individual response handle */}
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={`response-${index}`}
                      className="!w-3 !h-3 !bg-primary/80 !border !border-background !right-[-6px] transition-all group-hover:!bg-primary group-hover:scale-125"
                      style={{ top: "50%" }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Default Source Handle (when no responses or collapsed) */}
        {(!data.responses || data.responses.length === 0 || !isExpanded) && (
          <Handle
            type="source"
            position={Position.Bottom}
            className="!w-4 !h-4 !bg-primary !border-2 !border-background transition-transform hover:scale-125"
          />
        )}
      </div>
    </>
  );
});

// End Node Component - terminal node for dialogue endings
export const EndNode = memo(function EndNode({
  data,
  selected,
}: NodeProps & { data: EndNodeData }) {
  return (
    <>
      <NodeToolbar
        isVisible={selected}
        position={Position.Top}
        className="flex gap-1 p-1 bg-glass-bg/95 backdrop-blur-md rounded-lg border border-glass-border shadow-lg"
      >
        <SpectacularButton
          size="sm"
          variant="ghost"
          onClick={data.onEdit}
          title="Edit Node"
        >
          <Edit className="w-3.5 h-3.5" />
        </SpectacularButton>
        <SpectacularButton
          size="sm"
          variant="ghost"
          onClick={data.onDelete}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          title="Delete Node"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </SpectacularButton>
      </NodeToolbar>

      <div
        className={`
          p-3 rounded-xl min-w-[140px]
          transition-all duration-200
          ${
            selected
              ? "border-2 border-red-500 shadow-lg shadow-red-500/30 scale-[1.02]"
              : "border-2 border-red-500/30 hover:border-red-500/50"
          }
          bg-gradient-to-br from-red-900/30 to-glass-bg
          backdrop-blur-md
        `}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="!w-4 !h-4 !bg-red-500 !border-2 !border-background"
        />

        <div className="flex items-center justify-center gap-2">
          <span className="text-xs font-mono text-red-400 bg-red-500/20 px-2 py-0.5 rounded">
            {data.label}
          </span>
        </div>

        <p className="text-sm text-center mt-2 text-muted-foreground">
          {data.text || "End of dialogue"}
        </p>
      </div>
    </>
  );
});

// Node types registry
export const dialogueNodeTypes = {
  dialogue: DialogueNode,
  end: EndNode,
};
