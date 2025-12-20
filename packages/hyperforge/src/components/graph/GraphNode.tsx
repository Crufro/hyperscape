"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Sword,
  Shield,
  Hammer,
  Package,
  Users,
  Skull,
  TreeDeciduous,
  Building2,
  Coins,
  MapPin,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { AssetCategory } from "@/types/core";
import { ASSET_CATEGORY_COLORS } from "@/lib/relationships/relationship-types";

// =============================================================================
// NODE DATA TYPES
// =============================================================================

export interface AssetNodeData {
  id: string;
  name: string;
  category: AssetCategory;
  thumbnailUrl?: string;
  modelPath?: string;
  relationshipCount: number;
  completeness?: number; // 0-100 percentage
  isSelected?: boolean;
  onClick?: (id: string) => void;
  // Index signature for ReactFlow compatibility
  [key: string]: unknown;
}

// =============================================================================
// CATEGORY ICONS
// =============================================================================

const CategoryIcon = memo(function CategoryIcon({
  category,
  className = "w-4 h-4",
  style,
}: {
  category: AssetCategory;
  className?: string;
  style?: React.CSSProperties;
}) {
  const props = { className, style };
  switch (category) {
    case "weapon":
      return <Sword {...props} />;
    case "armor":
      return <Shield {...props} />;
    case "tool":
      return <Hammer {...props} />;
    case "item":
      return <Package {...props} />;
    case "npc":
      return <Users {...props} />;
    case "mob":
      return <Skull {...props} />;
    case "resource":
      return <TreeDeciduous {...props} />;
    case "building":
      return <Building2 {...props} />;
    case "currency":
      return <Coins {...props} />;
    case "biome":
      return <MapPin {...props} />;
    default:
      return <HelpCircle {...props} />;
  }
});

// =============================================================================
// COMPLETENESS INDICATOR
// =============================================================================

const CompletenessIndicator = memo(function CompletenessIndicator({
  completeness,
}: {
  completeness?: number;
}) {
  if (completeness === undefined) return null;

  if (completeness >= 100) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-green-400">
        <CheckCircle2 className="w-3 h-3" />
      </div>
    );
  }

  if (completeness < 50) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-yellow-400">
        <AlertCircle className="w-3 h-3" />
        <span>{completeness}%</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-[10px] text-cyan-400">
      <span>{completeness}%</span>
    </div>
  );
});

// =============================================================================
// ASSET NODE COMPONENT
// =============================================================================

export const AssetNode = memo(function AssetNode({
  data,
  selected,
}: NodeProps & { data: AssetNodeData }) {
  const color = ASSET_CATEGORY_COLORS[data.category] || "#6b7280";

  const handleClick = () => {
    if (data.onClick) {
      data.onClick(data.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative group cursor-pointer
        transition-all duration-200 ease-out
        ${selected ? "scale-110 z-10" : "hover:scale-105"}
      `}
    >
      {/* Target Handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2 !border-background transition-opacity"
        style={{ backgroundColor: color, opacity: selected ? 1 : 0.7 }}
      />

      {/* Main Node Body */}
      <div
        className={`
          relative px-3 py-2 rounded-lg min-w-[120px] max-w-[180px]
          backdrop-blur-md
          transition-all duration-200
          ${
            selected
              ? "shadow-lg shadow-current/30"
              : "hover:shadow-md hover:shadow-current/20"
          }
        `}
        style={{
          backgroundColor: `${color}20`,
          borderWidth: 2,
          borderStyle: "solid",
          borderColor: selected ? color : `${color}60`,
          boxShadow: selected ? `0 0 20px ${color}40` : undefined,
        }}
      >
        {/* Header with icon and category */}
        <div className="flex items-center justify-between gap-2 mb-1">
          <div
            className="flex items-center justify-center w-6 h-6 rounded-md"
            style={{ backgroundColor: `${color}30` }}
          >
            <CategoryIcon category={data.category} className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <CompletenessIndicator completeness={data.completeness} />
        </div>

        {/* Thumbnail (if available) */}
        {data.thumbnailUrl && (
          <div className="mb-2 rounded overflow-hidden bg-black/20">
            <img
              src={data.thumbnailUrl}
              alt={data.name}
              className="w-full h-12 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        {/* Name */}
        <div className="text-sm font-medium truncate text-foreground" title={data.name}>
          {data.name}
        </div>

        {/* Category label */}
        <div
          className="text-[10px] uppercase tracking-wider mt-0.5 opacity-70"
          style={{ color }}
        >
          {data.category}
        </div>

        {/* Relationship count badge */}
        {data.relationshipCount > 0 && (
          <div
            className="absolute -top-1 -right-1 text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center text-white"
            style={{ backgroundColor: color }}
          >
            {data.relationshipCount > 99 ? "99+" : data.relationshipCount}
          </div>
        )}
      </div>

      {/* Source Handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2 !border-background transition-opacity"
        style={{ backgroundColor: color, opacity: selected ? 1 : 0.7 }}
      />

      {/* Left handle for horizontal connections */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2 !h-2 !border !border-background opacity-50 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: color }}
      />

      {/* Right handle for horizontal connections */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2 !h-2 !border !border-background opacity-50 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: color }}
      />
    </div>
  );
});

// =============================================================================
// COMPACT ASSET NODE (for dense layouts)
// =============================================================================

export const CompactAssetNode = memo(function CompactAssetNode({
  data,
  selected,
}: NodeProps & { data: AssetNodeData }) {
  const color = ASSET_CATEGORY_COLORS[data.category] || "#6b7280";

  const handleClick = () => {
    if (data.onClick) {
      data.onClick(data.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative cursor-pointer
        transition-all duration-150
        ${selected ? "scale-125 z-10" : "hover:scale-110"}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !border !border-background"
        style={{ backgroundColor: color }}
      />

      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center backdrop-blur-sm"
        style={{
          backgroundColor: `${color}30`,
          borderWidth: 2,
          borderStyle: "solid",
          borderColor: selected ? color : `${color}60`,
          boxShadow: selected ? `0 0 12px ${color}50` : undefined,
        }}
        title={`${data.name} (${data.category})`}
      >
        <CategoryIcon category={data.category} className="w-5 h-5" style={{ color }} />
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !border !border-background"
        style={{ backgroundColor: color }}
      />
    </div>
  );
});

// =============================================================================
// AREA NODE (larger node for biomes/areas)
// =============================================================================

export const AreaNode = memo(function AreaNode({
  data,
  selected,
}: NodeProps & { data: AssetNodeData }) {
  const color = ASSET_CATEGORY_COLORS.biome;

  const handleClick = () => {
    if (data.onClick) {
      data.onClick(data.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative cursor-pointer
        transition-all duration-200
        ${selected ? "scale-105 z-10" : "hover:scale-102"}
      `}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-4 !h-4 !border-2 !border-background"
        style={{ backgroundColor: color }}
      />

      <div
        className="px-4 py-3 rounded-xl min-w-[160px] backdrop-blur-md"
        style={{
          backgroundColor: `${color}15`,
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: selected ? color : `${color}50`,
          boxShadow: selected ? `0 0 24px ${color}30` : undefined,
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-4 h-4" style={{ color }} />
          <span className="text-xs uppercase tracking-wider opacity-60">Area</span>
        </div>
        <div className="text-sm font-semibold text-foreground">{data.name}</div>
        {data.relationshipCount > 0 && (
          <div className="text-[10px] mt-1 opacity-60">
            {data.relationshipCount} spawn{data.relationshipCount !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-4 !h-4 !border-2 !border-background"
        style={{ backgroundColor: color }}
      />

      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !border !border-background"
        style={{ backgroundColor: color }}
      />

      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !border !border-background"
        style={{ backgroundColor: color }}
      />
    </div>
  );
});

// =============================================================================
// NODE TYPES REGISTRY
// =============================================================================

export const graphNodeTypes = {
  asset: AssetNode,
  compact: CompactAssetNode,
  area: AreaNode,
};
