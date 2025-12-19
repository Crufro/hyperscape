"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Map,
  Save,
  Play,
  Undo2,
  Redo2,
  Grid3X3,
  ZoomIn,
  ZoomOut,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import { StudioPageLayout } from "@/components/layout/StudioPageLayout";
import { WorldCanvas } from "@/components/world/WorldCanvas";
import { EntityPalette } from "@/components/world/EntityPalette";
import { EntityInspector } from "@/components/world/EntityInspector";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { useToast } from "@/components/ui/toast";
import { logger } from "@/lib/utils";
import type { AssetData } from "@/types/asset";

const log = logger.child("WorldEditorPage");

export interface WorldEntity {
  id: string;
  name: string;
  type: "npc" | "prop" | "item" | "resource" | "mob";
  assetId?: string;
  modelPath?: string;
  thumbnailUrl?: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: { x: number; y: number; z: number };
  data?: Record<string, unknown>;
}

export default function WorldEditorPage() {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Entities in the world
  const [entities, setEntities] = useState<WorldEntity[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<WorldEntity | null>(
    null,
  );

  // Available assets for the palette
  const [assets, setAssets] = useState<AssetData[]>([]);

  // Editor state
  const [gridSize, setGridSize] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);

  // History for undo/redo
  const [history, setHistory] = useState<WorldEntity[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load world entities and assets
  useEffect(() => {
    if (!mounted) return;

    async function loadData() {
      setIsLoading(true);
      try {
        // Load world entities
        const entitiesRes = await fetch("/api/world/entities");
        if (entitiesRes.ok) {
          const data = await entitiesRes.json();
          const loadedEntities: WorldEntity[] = (data.entities || []).map(
            (e: Record<string, unknown>) => ({
              id: e.id as string,
              name: (e.name as string) || (e.id as string),
              type: (e.type as string) || "prop",
              assetId: (e.metadata as Record<string, unknown>)
                ?.assetId as string,
              modelPath: e.modelPath as string,
              position: (e.position as { x: number; y: number; z: number }) || {
                x: 0,
                y: 0,
                z: 0,
              },
              rotation: e.rotation as { x: number; y: number; z: number },
              scale: e.scale as { x: number; y: number; z: number },
              data: e.metadata as Record<string, unknown>,
            }),
          );
          setEntities(loadedEntities);
          setOriginalEntities(loadedEntities);
          setHistory([loadedEntities]);
          setHistoryIndex(0);
        }

        // Load available assets
        const [localRes, cdnRes] = await Promise.all([
          fetch("/api/assets/local").catch(() => null),
          fetch("/api/assets/cdn").catch(() => null),
        ]);

        const localAssets: AssetData[] = localRes?.ok
          ? await localRes.json()
          : [];
        const cdnAssets: AssetData[] = cdnRes?.ok ? await cdnRes.json() : [];
        setAssets([...localAssets, ...cdnAssets]);
      } catch (error) {
        log.error("Failed to load world data:", error);
        toast({
          variant: "destructive",
          title: "Failed to load world",
          description: "Could not load world entities",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [mounted, toast]);

  // Save history state
  const saveToHistory = useCallback(
    (newEntities: WorldEntity[]) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push([...newEntities]);
        return newHistory;
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex],
  );

  // Add entity from palette
  const handleAddEntity = useCallback(
    (asset: AssetData, position: { x: number; y: number }) => {
      const newEntity: WorldEntity = {
        id: `entity_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        name: asset.name,
        type:
          asset.category === "npc" || asset.category === "mob" ? "npc" : "prop",
        assetId: asset.id,
        modelPath: asset.modelUrl || asset.modelPath,
        thumbnailUrl: asset.thumbnailUrl,
        position: { x: position.x, y: 0, z: position.y }, // 2D canvas uses x/y, world uses x/z
        scale: { x: 1, y: 1, z: 1 },
      };

      const newEntities = [...entities, newEntity];
      setEntities(newEntities);
      saveToHistory(newEntities);
      setSelectedEntity(newEntity);
    },
    [entities, saveToHistory],
  );

  // Update entity
  const handleUpdateEntity = useCallback(
    (entityId: string, updates: Partial<WorldEntity>) => {
      const newEntities = entities.map((e) =>
        e.id === entityId ? { ...e, ...updates } : e,
      );
      setEntities(newEntities);
      saveToHistory(newEntities);

      if (selectedEntity?.id === entityId) {
        setSelectedEntity((prev) => (prev ? { ...prev, ...updates } : null));
      }
    },
    [entities, selectedEntity, saveToHistory],
  );

  // Delete entity
  const handleDeleteEntity = useCallback(
    (entityId: string) => {
      const newEntities = entities.filter((e) => e.id !== entityId);
      setEntities(newEntities);
      saveToHistory(newEntities);

      if (selectedEntity?.id === entityId) {
        setSelectedEntity(null);
      }
    },
    [entities, selectedEntity, saveToHistory],
  );

  // Undo/Redo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      setEntities(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      setEntities(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  // Track original entities for diff
  const [originalEntities, setOriginalEntities] = useState<WorldEntity[]>([]);

  // Save to server with proper diff
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const originalIds = new Set(originalEntities.map((e) => e.id));
      const currentIds = new Set(entities.map((e) => e.id));

      // Find deleted entities
      const deletedIds = [...originalIds].filter((id) => !currentIds.has(id));

      // Find new entities
      const newEntities = entities.filter((e) => !originalIds.has(e.id));

      // Find updated entities
      const updatedEntities = entities.filter((e) => {
        if (!originalIds.has(e.id)) return false;
        const original = originalEntities.find((o) => o.id === e.id);
        if (!original) return false;
        // Check if anything changed
        return JSON.stringify(e) !== JSON.stringify(original);
      });

      // Delete removed entities
      for (const id of deletedIds) {
        await fetch(`/api/world/entities/${id}`, { method: "DELETE" });
      }

      // Add new entities
      for (const entity of newEntities) {
        await fetch("/api/world/entities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: entity.id,
            name: entity.name,
            type: entity.type,
            blueprint: entity.modelPath,
            position: entity.position,
            rotation: entity.rotation,
            scale: entity.scale,
            data: {
              ...entity.data,
              assetId: entity.assetId,
              thumbnailUrl: entity.thumbnailUrl,
            },
          }),
        });
      }

      // Update modified entities
      for (const entity of updatedEntities) {
        await fetch(`/api/world/entities/${entity.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: entity.name,
            type: entity.type,
            blueprint: entity.modelPath,
            position: entity.position,
            rotation: entity.rotation,
            scale: entity.scale,
            data: {
              ...entity.data,
              assetId: entity.assetId,
              thumbnailUrl: entity.thumbnailUrl,
            },
          }),
        });
      }

      // Update original entities to current state
      setOriginalEntities([...entities]);

      // Reload server
      await fetch("/api/server/reload", { method: "POST" }).catch(() => {});

      const changes =
        deletedIds.length + newEntities.length + updatedEntities.length;
      toast({
        title: "World Saved",
        description: `${changes} changes saved (${newEntities.length} added, ${updatedEntities.length} updated, ${deletedIds.length} deleted)`,
      });
    } catch (error) {
      log.error("Failed to save world:", error);
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save world entities",
      });
    } finally {
      setIsSaving(false);
    }
  }, [entities, originalEntities, toast]);

  // Test in game
  const handleTestInGame = useCallback(() => {
    window.open("http://localhost:3333", "_blank");
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Ctrl/Cmd + Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl/Cmd + Shift + Z = Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }
      // Ctrl/Cmd + S = Save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      // Delete/Backspace = Delete selected
      if ((e.key === "Delete" || e.key === "Backspace") && selectedEntity) {
        e.preventDefault();
        handleDeleteEntity(selectedEntity.id);
      }
      // Escape = Deselect
      if (e.key === "Escape") {
        setSelectedEntity(null);
      }
      // G = Toggle grid
      if (e.key === "g" || e.key === "G") {
        setShowGrid((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, handleSave, handleDeleteEntity, selectedEntity]);

  // Use CSS-only spinner during SSR to avoid Lucide hydration mismatch
  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sidebar = (
    <EntityPalette
      assets={assets}
      onAssetDrag={() => {
        // Drag handling is done by canvas drop event
      }}
    />
  );

  const toolPanel = (
    <EntityInspector
      entity={selectedEntity}
      onUpdate={(updates) => {
        if (selectedEntity) {
          handleUpdateEntity(selectedEntity.id, updates);
        }
      }}
      onDelete={() => {
        if (selectedEntity) {
          handleDeleteEntity(selectedEntity.id);
        }
      }}
      onTestInGame={handleTestInGame}
    />
  );

  return (
    <StudioPageLayout
      title="World Editor"
      icon={Map}
      sidebar={sidebar}
      toolPanel={toolPanel}
      headerContent={
        <div className="flex items-center gap-2">
          {/* Back to Studio */}
          <Link
            href="/"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Studio
          </Link>

          <div className="w-px h-6 bg-glass-border mx-2" />

          {/* Undo/Redo */}
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-2 rounded hover:bg-glass-bg disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded hover:bg-glass-bg disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-glass-border mx-2" />

          {/* Grid toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded transition-colors ${showGrid ? "bg-cyan-500/20 text-cyan-400" : "hover:bg-glass-bg"}`}
            title="Toggle grid (G)"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>

          {/* Grid size selector */}
          <select
            value={gridSize}
            onChange={(e) => setGridSize(Number(e.target.value))}
            className="h-8 px-2 text-xs bg-glass-bg border border-glass-border rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            title="Grid snap size"
          >
            <option value={0.5}>0.5m</option>
            <option value={1}>1m</option>
            <option value={2}>2m</option>
            <option value={5}>5m</option>
          </select>

          {/* Zoom */}
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
            className="p-2 rounded hover:bg-glass-bg"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
            className="p-2 rounded hover:bg-glass-bg"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-glass-border mx-2" />

          {/* Entity count */}
          <span className="text-xs text-muted-foreground px-2">
            {entities.length} {entities.length === 1 ? "entity" : "entities"}
          </span>

          <div className="w-px h-6 bg-glass-border mx-2" />

          {/* Actions */}
          <SpectacularButton
            variant="outline"
            onClick={handleSave}
            disabled={isSaving}
            title="Save (Ctrl+S)"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save
          </SpectacularButton>

          <SpectacularButton variant="default" onClick={handleTestInGame}>
            <Play className="w-4 h-4 mr-2" />
            Test in Game
          </SpectacularButton>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      ) : (
        <WorldCanvas
          entities={entities}
          selectedEntity={selectedEntity}
          onSelectEntity={setSelectedEntity}
          onMoveEntity={(entityId, position) => {
            handleUpdateEntity(entityId, { position });
          }}
          onAddEntity={handleAddEntity}
          gridSize={gridSize}
          zoom={zoom}
          showGrid={showGrid}
        />
      )}
    </StudioPageLayout>
  );
}
