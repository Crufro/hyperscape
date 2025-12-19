"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Box,
  Trash2,
  Play,
  RotateCcw,
  Move,
  RotateCw,
  Maximize,
  Copy,
} from "lucide-react";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { Label } from "@/components/ui/label";
import { NeonInput } from "@/components/ui/neon-input";
import { cn } from "@/lib/utils";
import type { WorldEntity } from "@/app/world/page";

interface EntityInspectorProps {
  entity: WorldEntity | null;
  onUpdate: (updates: Partial<WorldEntity>) => void;
  onDelete: () => void;
  onTestInGame: () => void;
}

export function EntityInspector({
  entity,
  onUpdate,
  onDelete,
  onTestInGame,
}: EntityInspectorProps) {
  // Local state for input fields
  const [localPosition, setLocalPosition] = useState({
    x: "0",
    y: "0",
    z: "0",
  });
  const [localRotation, setLocalRotation] = useState({
    x: "0",
    y: "0",
    z: "0",
  });
  const [localScale, setLocalScale] = useState({ x: "1", y: "1", z: "1" });

  // Sync local state with entity
  useEffect(() => {
    if (entity) {
      setLocalPosition({
        x: entity.position.x.toFixed(2),
        y: entity.position.y.toFixed(2),
        z: entity.position.z.toFixed(2),
      });
      setLocalRotation({
        x: (entity.rotation?.x || 0).toFixed(0),
        y: (entity.rotation?.y || 0).toFixed(0),
        z: (entity.rotation?.z || 0).toFixed(0),
      });
      setLocalScale({
        x: (entity.scale?.x || 1).toFixed(2),
        y: (entity.scale?.y || 1).toFixed(2),
        z: (entity.scale?.z || 1).toFixed(2),
      });
    }
  }, [entity]);

  const handlePositionChange = (axis: "x" | "y" | "z", value: string) => {
    setLocalPosition((prev) => ({ ...prev, [axis]: value }));
  };

  const handlePositionBlur = (axis: "x" | "y" | "z") => {
    const num = parseFloat(localPosition[axis]);
    if (!isNaN(num)) {
      onUpdate({
        position: {
          ...entity!.position,
          [axis]: num,
        },
      });
    }
  };

  const handleRotationChange = (axis: "x" | "y" | "z", value: string) => {
    setLocalRotation((prev) => ({ ...prev, [axis]: value }));
  };

  const handleRotationBlur = (axis: "x" | "y" | "z") => {
    const num = parseFloat(localRotation[axis]);
    if (!isNaN(num)) {
      onUpdate({
        rotation: {
          x: axis === "x" ? num : entity?.rotation?.x || 0,
          y: axis === "y" ? num : entity?.rotation?.y || 0,
          z: axis === "z" ? num : entity?.rotation?.z || 0,
        },
      });
    }
  };

  const handleScaleChange = (axis: "x" | "y" | "z", value: string) => {
    setLocalScale((prev) => ({ ...prev, [axis]: value }));
  };

  const handleScaleBlur = (axis: "x" | "y" | "z") => {
    const num = parseFloat(localScale[axis]);
    if (!isNaN(num) && num > 0) {
      onUpdate({
        scale: {
          x: axis === "x" ? num : entity?.scale?.x || 1,
          y: axis === "y" ? num : entity?.scale?.y || 1,
          z: axis === "z" ? num : entity?.scale?.z || 1,
        },
      });
    }
  };

  const handleResetTransform = () => {
    onUpdate({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
    });
  };

  if (!entity) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-glass-border">
          <h3 className="text-sm font-semibold">Inspector</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground">
            <Box className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Select an entity to inspect</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-glass-border">
        <h3 className="text-sm font-semibold">Inspector</h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Entity Info */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
            {entity.thumbnailUrl ? (
              <Image
                src={entity.thumbnailUrl}
                alt={entity.name}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Box className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={entity.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="w-full bg-transparent text-sm font-medium border-b border-transparent hover:border-glass-border focus:border-cyan-500 focus:outline-none transition-colors"
            />
            <p className="text-xs text-muted-foreground mt-1 capitalize">
              {entity.type}
            </p>
          </div>
        </div>

        {/* Position */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-muted-foreground" />
            <Label className="text-xs">Position</Label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["x", "y", "z"] as const).map((axis) => (
              <div key={axis}>
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase",
                      axis === "x"
                        ? "text-red-400"
                        : axis === "y"
                          ? "text-green-400"
                          : "text-blue-400",
                    )}
                  >
                    {axis}
                  </span>
                  <NeonInput
                    type="number"
                    value={localPosition[axis]}
                    onChange={(e) => handlePositionChange(axis, e.target.value)}
                    onBlur={() => handlePositionBlur(axis)}
                    className="h-7 text-xs"
                    step="0.1"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rotation */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <RotateCw className="w-4 h-4 text-muted-foreground" />
            <Label className="text-xs">Rotation (degrees)</Label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["x", "y", "z"] as const).map((axis) => (
              <div key={axis}>
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase",
                      axis === "x"
                        ? "text-red-400"
                        : axis === "y"
                          ? "text-green-400"
                          : "text-blue-400",
                    )}
                  >
                    {axis}
                  </span>
                  <NeonInput
                    type="number"
                    value={localRotation[axis]}
                    onChange={(e) => handleRotationChange(axis, e.target.value)}
                    onBlur={() => handleRotationBlur(axis)}
                    className="h-7 text-xs"
                    step="15"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scale */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Maximize className="w-4 h-4 text-muted-foreground" />
            <Label className="text-xs">Scale</Label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["x", "y", "z"] as const).map((axis) => (
              <div key={axis}>
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase",
                      axis === "x"
                        ? "text-red-400"
                        : axis === "y"
                          ? "text-green-400"
                          : "text-blue-400",
                    )}
                  >
                    {axis}
                  </span>
                  <NeonInput
                    type="number"
                    value={localScale[axis]}
                    onChange={(e) => handleScaleChange(axis, e.target.value)}
                    onBlur={() => handleScaleBlur(axis)}
                    className="h-7 text-xs"
                    step="0.1"
                    min="0.1"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Entity ID */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Entity ID</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-glass-bg px-2 py-1 rounded truncate">
              {entity.id}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(entity.id)}
              className="p-1 rounded hover:bg-glass-bg transition-colors"
              title="Copy ID"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Asset ID */}
        {entity.assetId && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Asset ID</Label>
            <code className="block text-xs bg-glass-bg px-2 py-1 rounded truncate">
              {entity.assetId}
            </code>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-glass-border space-y-2">
        <button
          onClick={handleResetTransform}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm border border-glass-border rounded-lg hover:bg-glass-bg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Transform
        </button>

        <SpectacularButton
          variant="default"
          className="w-full"
          onClick={onTestInGame}
        >
          <Play className="w-4 h-4 mr-2" />
          Test in Game
        </SpectacularButton>

        <SpectacularButton
          variant="destructive"
          className="w-full"
          onClick={onDelete}
          title="Delete (Del/Backspace)"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Entity
        </SpectacularButton>

        {/* Keyboard hint */}
        <p className="text-[10px] text-muted-foreground text-center pt-1">
          Press Escape to deselect
        </p>
      </div>
    </div>
  );
}
