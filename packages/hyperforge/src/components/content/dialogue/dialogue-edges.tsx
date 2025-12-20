"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  useReactFlow,
} from "@xyflow/react";
import { Zap, Trash2, Edit } from "lucide-react";
import { SpectacularButton } from "@/components/ui/spectacular-button";

// Edge data types - includes index signature for ReactFlow compatibility
export interface ResponseEdgeData {
  label: string;
  effect?: string;
  responseIndex: number;
  onEdit?: () => void;
  onDelete?: () => void;
  [key: string]: unknown;
}

// Animated Response Edge
export const ResponseEdge = memo(function ResponseEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps & { data?: ResponseEdgeData }) {
  const { setEdges } = useReactFlow();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const hasEffect = data?.effect && data.effect.length > 0;

  const handleDelete = () => {
    if (data?.onDelete) {
      data.onDelete();
    } else {
      setEdges((edges) => edges.filter((e) => e.id !== id));
    }
  };

  return (
    <>
      {/* Animated background path */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: hasEffect
            ? "oklch(var(--primary))"
            : "oklch(var(--muted-foreground) / 0.5)",
          strokeWidth: selected ? 3 : 2,
          transition: "stroke-width 0.2s, stroke 0.2s",
        }}
      />

      {/* Animated flow dots */}
      <circle r="4" fill="oklch(var(--primary))">
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>

      {/* Edge Label with toolbar */}
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          {/* Label */}
          <div
            className={`
              relative px-2.5 py-1 rounded-lg text-xs font-medium
              transition-all duration-200 cursor-pointer
              ${
                selected
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105"
                  : "bg-glass-bg/90 text-foreground border border-glass-border hover:bg-glass-bg hover:border-primary/50"
              }
              backdrop-blur-md
            `}
          >
            <span className="line-clamp-1 max-w-[120px]">
              {data?.label || "Response"}
            </span>
            {hasEffect && (
              <span className="flex items-center gap-0.5 text-[10px] text-primary mt-0.5">
                <Zap className="w-2.5 h-2.5" />
                {data?.effect}
              </span>
            )}
          </div>

          {/* Toolbar on selection */}
          {selected && (
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-1 p-1 bg-glass-bg/95 backdrop-blur-md rounded-lg border border-glass-border shadow-lg">
              {data?.onEdit && (
                <SpectacularButton
                  size="sm"
                  variant="ghost"
                  onClick={data.onEdit}
                  title="Edit Response"
                >
                  <Edit className="w-3 h-3" />
                </SpectacularButton>
              )}
              <SpectacularButton
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                title="Delete Connection"
              >
                <Trash2 className="w-3 h-3" />
              </SpectacularButton>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

// Effect Edge - special styling for edges with game effects
export const EffectEdge = memo(function EffectEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps & { data?: ResponseEdgeData }) {
  const { setEdges } = useReactFlow();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleDelete = () => {
    if (data?.onDelete) {
      data.onDelete();
    } else {
      setEdges((edges) => edges.filter((e) => e.id !== id));
    }
  };

  return (
    <>
      {/* Glowing effect path */}
      <defs>
        <linearGradient
          id={`effect-gradient-${id}`}
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="oklch(var(--primary))" />
          <stop offset="50%" stopColor="oklch(0.8 0.2 200)" />
          <stop offset="100%" stopColor="oklch(var(--primary))" />
        </linearGradient>
      </defs>

      {/* Glow effect */}
      <BaseEdge
        path={edgePath}
        style={{
          stroke: `url(#effect-gradient-${id})`,
          strokeWidth: selected ? 5 : 3,
          filter: "blur(4px)",
          opacity: 0.5,
        }}
      />

      {/* Main path */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: "oklch(var(--primary))",
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: "8 4",
          transition: "stroke-width 0.2s",
        }}
      />

      {/* Animated particles */}
      <circle r="3" fill="oklch(var(--primary))">
        <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} />
      </circle>
      <circle r="3" fill="oklch(0.8 0.2 200)">
        <animateMotion
          dur="1.5s"
          repeatCount="indefinite"
          path={edgePath}
          begin="0.5s"
        />
      </circle>
      <circle r="3" fill="oklch(var(--primary))">
        <animateMotion
          dur="1.5s"
          repeatCount="indefinite"
          path={edgePath}
          begin="1s"
        />
      </circle>

      {/* Effect Label */}
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-auto"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          <div
            className={`
              relative px-3 py-1.5 rounded-lg text-xs font-semibold
              transition-all duration-200 cursor-pointer
              ${
                selected
                  ? "bg-gradient-to-r from-primary to-cyan-500 text-white shadow-lg shadow-primary/40 scale-105"
                  : "bg-gradient-to-r from-primary/20 to-cyan-500/20 text-primary border border-primary/30 hover:border-primary"
              }
              backdrop-blur-md
            `}
          >
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>{data?.effect || "Effect"}</span>
            </div>
            {data?.label && (
              <span className="block text-[10px] opacity-70 mt-0.5 line-clamp-1 max-w-[100px]">
                {data.label}
              </span>
            )}
          </div>

          {/* Toolbar */}
          {selected && (
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-1 p-1 bg-glass-bg/95 backdrop-blur-md rounded-lg border border-glass-border shadow-lg">
              {data?.onEdit && (
                <SpectacularButton
                  size="sm"
                  variant="ghost"
                  onClick={data.onEdit}
                  title="Edit Effect"
                >
                  <Edit className="w-3 h-3" />
                </SpectacularButton>
              )}
              <SpectacularButton
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                title="Delete Connection"
              >
                <Trash2 className="w-3 h-3" />
              </SpectacularButton>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

// Edge types registry
export const dialogueEdgeTypes = {
  response: ResponseEdge,
  effect: EffectEdge,
};
