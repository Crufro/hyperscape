"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import type { RelationshipType, RelationshipMetadata } from "@/lib/relationships/relationship-types";
import { RELATIONSHIP_COLORS, RELATIONSHIP_LABELS } from "@/lib/relationships/relationship-types";

// =============================================================================
// TYPES
// =============================================================================

export interface RelationshipEdgeData {
  relationshipType: RelationshipType;
  label: string;
  metadata?: RelationshipMetadata;
}

// =============================================================================
// RELATIONSHIP EDGE COMPONENT
// =============================================================================

export const RelationshipEdge = memo(function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps & { data: RelationshipEdgeData }) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const color = RELATIONSHIP_COLORS[data.relationshipType] || "#6b7280";
  const label = RELATIONSHIP_LABELS[data.relationshipType]?.verb || data.label;

  // Format metadata for tooltip
  const metadataText = formatMetadata(data.metadata, data.relationshipType);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: selected ? 3 : 2,
          opacity: selected ? 1 : 0.7,
        }}
      />

      <EdgeLabelRenderer>
        <div
          className={`
            absolute pointer-events-auto cursor-pointer
            px-2 py-1 rounded-lg text-[10px] font-medium
            transition-all duration-200
            ${selected ? "scale-110" : "hover:scale-105"}
          `}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            backgroundColor: `${color}20`,
            color,
            border: `1px solid ${color}40`,
          }}
          title={metadataText}
        >
          {label}
          {data.metadata?.chance !== undefined && (
            <span className="ml-1 opacity-70">
              ({Math.round(data.metadata.chance * 100)}%)
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatMetadata(
  metadata: RelationshipMetadata | undefined,
  type: RelationshipType,
): string {
  if (!metadata) return "";

  const parts: string[] = [];

  if (metadata.chance !== undefined) {
    parts.push(`Chance: ${Math.round(metadata.chance * 100)}%`);
  }

  if (metadata.minQuantity !== undefined || metadata.maxQuantity !== undefined) {
    const min = metadata.minQuantity || 1;
    const max = metadata.maxQuantity || min;
    if (min === max) {
      parts.push(`Quantity: ${min}`);
    } else {
      parts.push(`Quantity: ${min}-${max}`);
    }
  }

  if (metadata.rarity) {
    parts.push(`Rarity: ${metadata.rarity}`);
  }

  if (metadata.price !== undefined) {
    parts.push(`Price: ${metadata.price} coins`);
  }

  if (metadata.stockQuantity !== undefined) {
    parts.push(`Stock: ${metadata.stockQuantity}`);
  }

  if (metadata.levelRequired !== undefined) {
    parts.push(`Level: ${metadata.levelRequired}`);
  }

  if (metadata.skillName) {
    parts.push(`Skill: ${metadata.skillName}`);
  }

  if (metadata.spawnRadius !== undefined) {
    parts.push(`Spawn Radius: ${metadata.spawnRadius}`);
  }

  if (metadata.maxCount !== undefined) {
    parts.push(`Max Count: ${metadata.maxCount}`);
  }

  return parts.join("\n");
}

// =============================================================================
// EDGE TYPES REGISTRY
// =============================================================================

export const relationshipEdgeTypes = {
  relationship: RelationshipEdge,
};
