"use client";

import { useRef, useState, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { WorldEntity } from "./WorldView";
import type { AssetData } from "@/types/asset";

interface WorldCanvasProps {
  entities: WorldEntity[];
  selectedEntity: WorldEntity | null;
  onSelectEntity: (entity: WorldEntity | null) => void;
  onMoveEntity: (
    entityId: string,
    position: { x: number; y: number; z: number },
  ) => void;
  onAddEntity: (asset: AssetData, position: { x: number; y: number }) => void;
  gridSize: number;
  zoom: number;
  showGrid: boolean;
}

// Map world coordinates to canvas
const WORLD_SIZE = 100; // -50 to 50 in world units (larger to fit more entities)
const CANVAS_SIZE = 600; // Base canvas size in pixels

export function WorldCanvas({
  entities,
  selectedEntity,
  onSelectEntity,
  onMoveEntity,
  onAddEntity,
  gridSize,
  zoom,
  showGrid,
}: WorldCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragEntity, setDragEntity] = useState<WorldEntity | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Convert world position to canvas position
  const worldToCanvas = useCallback(
    (worldX: number, worldZ: number) => {
      const scale = (CANVAS_SIZE * zoom) / WORLD_SIZE;
      const centerOffset = (CANVAS_SIZE * zoom) / 2;
      return {
        x: worldX * scale + centerOffset + panOffset.x,
        y: worldZ * scale + centerOffset + panOffset.y,
      };
    },
    [zoom, panOffset],
  );

  // Convert canvas position to world position
  const canvasToWorld = useCallback(
    (canvasX: number, canvasY: number) => {
      const scale = (CANVAS_SIZE * zoom) / WORLD_SIZE;
      const centerOffset = (CANVAS_SIZE * zoom) / 2;
      return {
        x: (canvasX - centerOffset - panOffset.x) / scale,
        z: (canvasY - centerOffset - panOffset.y) / scale,
      };
    },
    [zoom, panOffset],
  );

  // Snap to grid
  const snapToGrid = useCallback(
    (value: number) => {
      return Math.round(value / gridSize) * gridSize;
    },
    [gridSize],
  );

  // Handle mouse down on entity
  const handleEntityMouseDown = useCallback(
    (e: React.MouseEvent, entity: WorldEntity) => {
      e.stopPropagation();
      onSelectEntity(entity);

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const canvasPos = worldToCanvas(entity.position.x, entity.position.z);
      setDragOffset({
        x: e.clientX - rect.left - canvasPos.x,
        y: e.clientY - rect.top - canvasPos.y,
      });
      setDragEntity(entity);
      setIsDragging(true);
    },
    [onSelectEntity, worldToCanvas],
  );

  // Handle mouse move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (isDragging && dragEntity) {
        const canvasX = e.clientX - rect.left - dragOffset.x;
        const canvasY = e.clientY - rect.top - dragOffset.y;
        const worldPos = canvasToWorld(canvasX, canvasY);

        onMoveEntity(dragEntity.id, {
          x: snapToGrid(worldPos.x),
          y: dragEntity.position.y,
          z: snapToGrid(worldPos.z),
        });
      } else if (isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        setPanOffset((prev) => ({
          x: prev.x + dx,
          y: prev.y + dy,
        }));
        setPanStart({ x: e.clientX, y: e.clientY });
      }
    },
    [
      isDragging,
      dragEntity,
      dragOffset,
      canvasToWorld,
      onMoveEntity,
      snapToGrid,
      isPanning,
      panStart,
    ],
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragEntity(null);
    setIsPanning(false);
  }, []);

  // Handle canvas click (deselect)
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === containerRef.current) {
        onSelectEntity(null);
      }
    },
    [onSelectEntity],
  );

  // Handle middle mouse for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      // Middle mouse
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

  // Handle drop from palette
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const assetData = e.dataTransfer.getData("application/json");
      if (!assetData) return;

      try {
        const asset: AssetData = JSON.parse(assetData);
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        const worldPos = canvasToWorld(canvasX, canvasY);

        onAddEntity(asset, {
          x: snapToGrid(worldPos.x),
          y: snapToGrid(worldPos.z),
        });
      } catch {
        // Invalid JSON
      }
    },
    [canvasToWorld, onAddEntity, snapToGrid],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  // Render grid
  const renderGrid = () => {
    if (!showGrid) return null;

    const lines = [];
    const gridCount = Math.ceil(WORLD_SIZE / gridSize);

    for (let i = -gridCount; i <= gridCount; i++) {
      const pos = worldToCanvas(i * gridSize, 0);
      const isCenter = i === 0;

      // Vertical lines
      lines.push(
        <line
          key={`v-${i}`}
          x1={pos.x}
          y1={panOffset.y}
          x2={pos.x}
          y2={CANVAS_SIZE * zoom + panOffset.y}
          stroke={
            isCenter ? "rgba(0, 200, 255, 0.3)" : "rgba(255, 255, 255, 0.05)"
          }
          strokeWidth={isCenter ? 2 : 1}
        />,
      );

      // Horizontal lines
      const posH = worldToCanvas(0, i * gridSize);
      lines.push(
        <line
          key={`h-${i}`}
          x1={panOffset.x}
          y1={posH.y}
          x2={CANVAS_SIZE * zoom + panOffset.x}
          y2={posH.y}
          stroke={
            isCenter ? "rgba(0, 200, 255, 0.3)" : "rgba(255, 255, 255, 0.05)"
          }
          strokeWidth={isCenter ? 2 : 1}
        />,
      );
    }

    return <g>{lines}</g>;
  };

  // Entity type colors
  const getEntityColor = (type: string) => {
    switch (type) {
      case "npc":
        return "bg-green-500";
      case "mob":
        return "bg-red-500";
      case "item":
        return "bg-amber-500";
      case "resource":
        return "bg-emerald-500";
      case "bank":
        return "bg-yellow-500";
      case "player":
        return "bg-cyan-500";
      case "prop":
        return "bg-blue-500";
      case "building":
        return "bg-purple-500";
      default:
        return "bg-gray-500";
    }
  };

  // Debug: log entity count
  console.log("[WorldCanvas] Rendering with", entities.length, "entities");

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative bg-zinc-950 overflow-hidden cursor-crosshair"
      style={{ minHeight: "400px" }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      onMouseDown={handleMouseDown}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* SVG Grid */}
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: "100%", height: "100%" }}
      >
        {renderGrid()}
      </svg>

      {/* Entities */}
      {entities.map((entity) => {
        const pos = worldToCanvas(entity.position.x, entity.position.z);
        const isSelected = selectedEntity?.id === entity.id;
        const size = 40 * zoom; // Larger size for better visibility

        return (
          <div
            key={entity.id}
            className={cn(
              "absolute flex flex-col items-center cursor-move transition-shadow",
              isSelected && "z-10",
            )}
            style={{
              left: pos.x - size / 2,
              top: pos.y - size / 2,
              width: size,
              height: size,
            }}
            onMouseDown={(e) => handleEntityMouseDown(e, entity)}
          >
            {/* Entity marker */}
            <div
              className={cn(
                "rounded-lg border-3 shadow-lg overflow-hidden",
                isSelected
                  ? "border-cyan-400 shadow-cyan-500/50 ring-4 ring-cyan-400/50"
                  : "border-white/50 hover:border-cyan-400",
              )}
              style={{ 
                width: size, 
                height: size,
                borderWidth: "3px",
              }}
            >
              {entity.thumbnailUrl ? (
                <Image
                  src={entity.thumbnailUrl}
                  alt={entity.name}
                  width={size}
                  height={size}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <div
                  className={cn("w-full h-full", getEntityColor(entity.type))}
                />
              )}
            </div>

            {/* Label */}
            {zoom >= 0.8 && (
              <div className="mt-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white whitespace-nowrap">
                {entity.name}
              </div>
            )}
          </div>
        );
      })}

      {/* Center indicator */}
      <div
        className="absolute w-6 h-6 rounded-full bg-cyan-500 border-4 border-white shadow-lg pointer-events-none animate-pulse"
        style={{
          left: worldToCanvas(0, 0).x - 12,
          top: worldToCanvas(0, 0).y - 12,
        }}
        title="World origin (0, 0)"
      />

      {/* Empty state hint */}
      {entities.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium mb-1">No entities yet</p>
            <p className="text-sm">
              Drag assets from the palette to place them
            </p>
          </div>
        </div>
      )}

      {/* Coordinates display */}
      <div className="absolute bottom-4 left-4 px-3 py-2 rounded-lg bg-black/90 text-xs text-white font-mono border border-cyan-500/50">
        <div className="text-cyan-400 font-bold mb-1">World Canvas Debug</div>
        <div>
          <span className="text-muted-foreground">Entities: </span>
          <span className="text-green-400 font-bold">{entities.length}</span>
        </div>
        {entities.length > 0 && (
          <div className="text-[9px] mt-1 max-h-20 overflow-y-auto">
            {entities.slice(0, 5).map((e) => (
              <div key={e.id} className="text-gray-400">
                {e.name}: ({e.position.x.toFixed(0)}, {e.position.z.toFixed(0)})
              </div>
            ))}
            {entities.length > 5 && (
              <div className="text-gray-500">...and {entities.length - 5} more</div>
            )}
          </div>
        )}
        {selectedEntity && (
          <div className="mt-1 pt-1 border-t border-gray-700">
            <span className="text-cyan-400">{selectedEntity.name}</span>
            <span className="text-muted-foreground ml-2">
              ({selectedEntity.position.x.toFixed(1)},{" "}
              {selectedEntity.position.z.toFixed(1)})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
