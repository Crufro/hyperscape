"use client";

import { useState, useCallback } from "react";
import {
  MapPin,
  Trash2,
  Plus,
  Shield,
  Ban,
  Clock,
  Users,
  Move,
  ChevronDown,
  ChevronRight,
  Edit2,
  X,
  Check,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/utils";
import type {
  TileCoord,
  Tile,
  TileSpawn,
  TileContents,
  MobSpawnConfig,
  NpcSpawnConfig,
  ResourceSpawnConfig,
  WorldAreaDefinition,
  PlaceableItem,
} from "@/lib/world/tile-types";
import {
  getTileAtPosition,
  removeTileSpawn,
  updateSpawn,
  setTileProperties,
  clearTile,
} from "@/lib/world/tile-service";

const log = logger.child("TileInspector");

// ============================================================================
// TYPES
// ============================================================================

interface PlaceableEntity {
  id: string;
  name: string;
  type: "mob" | "npc" | "resource";
}

interface TileInspectorProps {
  area: WorldAreaDefinition | null;
  onAreaChange: (area: WorldAreaDefinition) => void;
  selectedTile: TileCoord | null;
  selectedSpawn: TileSpawn | null;
  onSelectSpawn: (spawn: TileSpawn | null) => void;
  /** Available entities that can be placed */
  availableEntities?: PlaceableEntity[];
  /** Callback when an entity is placed on a tile */
  onPlaceEntity?: (entity: PlaceableEntity, coord: TileCoord) => void;
}

// ============================================================================
// SPAWN TYPE COLORS
// ============================================================================

const SPAWN_TYPE_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  mob: { color: "text-red-400", bg: "bg-red-500/20", icon: "⚔️" },
  npc: { color: "text-green-400", bg: "bg-green-500/20", icon: "👤" },
  resource: { color: "text-emerald-400", bg: "bg-emerald-500/20", icon: "🌲" },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function TileInspector({
  area,
  onAreaChange,
  selectedTile,
  selectedSpawn,
  onSelectSpawn,
  availableEntities = [],
  onPlaceEntity,
}: TileInspectorProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["spawns", "properties", "quickAdd"])
  );
  const [editingSpawnId, setEditingSpawnId] = useState<string | null>(null);
  const [quickAddFilter, setQuickAddFilter] = useState<"all" | "mob" | "npc" | "resource">("all");
  const [quickAddSearch, setQuickAddSearch] = useState("");

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Get current tile contents
  const tileContents = selectedTile && area
    ? getTileAtPosition(area, selectedTile.x, selectedTile.z)?.contents
    : null;

  // Handle spawn deletion
  const handleDeleteSpawn = useCallback(
    (spawnId: string) => {
      if (!area || !selectedTile) return;
      const newArea = removeTileSpawn(area, selectedTile, spawnId);
      onAreaChange(newArea);
      if (selectedSpawn?.id === spawnId) {
        onSelectSpawn(null);
      }
    },
    [area, selectedTile, selectedSpawn, onAreaChange, onSelectSpawn]
  );

  // Handle spawn property update
  const handleUpdateSpawn = useCallback(
    (spawnId: string, updates: Partial<TileSpawn>) => {
      if (!area || !selectedTile) return;
      const newArea = updateSpawn(area, selectedTile, spawnId, updates);
      onAreaChange(newArea);
    },
    [area, selectedTile, onAreaChange]
  );

  // Handle tile property update
  const handleUpdateTileProperty = useCallback(
    (property: "walkable" | "safeZone", value: boolean) => {
      if (!area || !selectedTile) return;
      const newArea = setTileProperties(area, selectedTile, { [property]: value });
      onAreaChange(newArea);
    },
    [area, selectedTile, onAreaChange]
  );

  // Handle clear tile
  const handleClearTile = useCallback(() => {
    if (!area || !selectedTile) return;
    if (!confirm("Are you sure you want to clear all spawns from this tile?")) return;
    const newArea = clearTile(area, selectedTile);
    onAreaChange(newArea);
    onSelectSpawn(null);
  }, [area, selectedTile, onAreaChange, onSelectSpawn]);

  // Render empty state
  if (!selectedTile || !area) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Select a tile to inspect</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-h-[500px] overflow-hidden">
      {/* Tile coordinate header */}
      <div className="px-3 py-2 border-b border-zinc-700 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span>
            Tile ({selectedTile.x}, {selectedTile.z})
          </span>
        </div>
        <button
          onClick={handleClearTile}
          className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
          title="Clear all spawns"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto themed-scrollbar">
        {/* Tile Properties Section */}
        <div className="border-b border-zinc-700">
          <button
            onClick={() => toggleSection("properties")}
            className="w-full px-3 py-2 flex items-center gap-2 hover:bg-zinc-800 transition-colors"
          >
            {expandedSections.has("properties") ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <span className="text-xs font-medium">Tile Properties</span>
          </button>
          
          {expandedSections.has("properties") && tileContents && (
            <div className="px-3 pb-2 space-y-1">
              {/* Walkable toggle */}
              <label className="flex items-center justify-between py-1 px-2 rounded hover:bg-zinc-800 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Ban className={cn("w-4 h-4", tileContents.walkable ? "text-muted-foreground" : "text-red-400")} />
                  <span className="text-xs">Walkable</span>
                </div>
                <input
                  type="checkbox"
                  checked={tileContents.walkable}
                  onChange={(e) => handleUpdateTileProperty("walkable", e.target.checked)}
                  className="w-4 h-4 rounded border-glass-border bg-glass-bg"
                />
              </label>

              {/* Safe zone toggle */}
              <label className="flex items-center justify-between py-1 px-2 rounded hover:bg-zinc-800 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Shield className={cn("w-4 h-4", tileContents.safeZone ? "text-green-400" : "text-muted-foreground")} />
                  <span className="text-xs">Safe Zone</span>
                </div>
                <input
                  type="checkbox"
                  checked={tileContents.safeZone ?? false}
                  onChange={(e) => handleUpdateTileProperty("safeZone", e.target.checked)}
                  className="w-4 h-4 rounded border-glass-border bg-glass-bg"
                />
              </label>

              {/* Terrain type */}
              {tileContents.terrain && (
                <div className="flex items-center justify-between py-1.5 px-2">
                  <span className="text-xs text-muted-foreground">Terrain</span>
                  <span className="text-xs">{tileContents.terrain}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Spawns Section */}
        <div className="border-b border-zinc-700">
          <button
            onClick={() => toggleSection("spawns")}
            className="w-full px-3 py-2 flex items-center justify-between hover:bg-zinc-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              {expandedSections.has("spawns") ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="text-xs font-medium">Spawns</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {tileContents?.spawns.length || 0}
            </span>
          </button>
          
          {expandedSections.has("spawns") && (
            <div className="px-2 pb-3 space-y-1">
              {tileContents?.spawns.length === 0 ? (
                <div className="px-2 py-2 text-center text-xs text-muted-foreground">
                  No spawns yet. Add below ↓
                </div>
              ) : (
                tileContents?.spawns.map((spawn) => (
                  <SpawnItem
                    key={spawn.id}
                    spawn={spawn}
                    isSelected={selectedSpawn?.id === spawn.id}
                    isEditing={editingSpawnId === spawn.id}
                    onSelect={() => onSelectSpawn(spawn)}
                    onDelete={() => handleDeleteSpawn(spawn.id)}
                    onStartEdit={() => setEditingSpawnId(spawn.id)}
                    onEndEdit={() => setEditingSpawnId(null)}
                    onUpdate={(updates) => handleUpdateSpawn(spawn.id, updates)}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Quick Add Section - Show available entities to place */}
        {availableEntities.length > 0 && onPlaceEntity && (
          <div className="border-b border-zinc-700">
            <button
              onClick={() => toggleSection("quickAdd")}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedSections.has("quickAdd") ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <Plus className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs font-medium">Quick Add</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {availableEntities.length}
              </span>
            </button>
            
            {expandedSections.has("quickAdd") && (
              <div className="px-2 pb-3 space-y-2">
                {/* Search */}
                <input
                  type="text"
                  placeholder="Search..."
                  value={quickAddSearch}
                  onChange={(e) => setQuickAddSearch(e.target.value)}
                  className="w-full px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded focus:outline-none focus:border-cyan-500"
                />
                
                {/* Type filter */}
                <div className="flex gap-1">
                  {(["all", "mob", "npc", "resource"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setQuickAddFilter(type)}
                      className={cn(
                        "flex-1 px-2 py-1 text-[10px] rounded transition-colors capitalize",
                        quickAddFilter === type
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                          : "bg-zinc-800 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                
                {/* Entity list */}
                <div className="max-h-40 overflow-y-auto space-y-1 themed-scrollbar">
                  {availableEntities
                    .filter((e) => quickAddFilter === "all" || e.type === quickAddFilter)
                    .filter((e) => 
                      !quickAddSearch || 
                      e.name.toLowerCase().includes(quickAddSearch.toLowerCase()) ||
                      e.id.toLowerCase().includes(quickAddSearch.toLowerCase())
                    )
                    .map((entity) => {
                      const config = SPAWN_TYPE_CONFIG[entity.type];
                      return (
                        <button
                          key={entity.id}
                          onClick={() => selectedTile && onPlaceEntity(entity, selectedTile)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded bg-zinc-800/50 hover:bg-zinc-700 transition-colors text-left"
                        >
                          <div className={cn("w-5 h-5 rounded flex items-center justify-center text-xs", config.bg)}>
                            {config.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs truncate">{entity.name}</p>
                            <p className={cn("text-[10px] capitalize", config.color)}>{entity.type}</p>
                          </div>
                          <Plus className="w-3.5 h-3.5 text-green-400 opacity-60" />
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selected Spawn Details */}
        {selectedSpawn && (
          <div className="p-3">
            <h4 className="text-xs font-medium mb-2 text-cyan-400">Spawn Details</h4>
            <SpawnDetails
              spawn={selectedSpawn}
              onUpdate={(updates) => handleUpdateSpawn(selectedSpawn.id, updates)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SPAWN ITEM COMPONENT
// ============================================================================

interface SpawnItemProps {
  spawn: TileSpawn;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onUpdate: (updates: Partial<TileSpawn>) => void;
}

function SpawnItem({
  spawn,
  isSelected,
  isEditing,
  onSelect,
  onDelete,
  onStartEdit,
  onEndEdit,
  onUpdate,
}: SpawnItemProps) {
  const config = SPAWN_TYPE_CONFIG[spawn.type];
  const [editName, setEditName] = useState(spawn.name);

  const handleSaveName = () => {
    if (editName.trim() && editName !== spawn.name) {
      onUpdate({ name: editName.trim() });
    }
    onEndEdit();
  };

  return (
    <div
      className={cn(
        "rounded-lg border transition-colors",
        isSelected
          ? "border-cyan-500 bg-cyan-500/10"
          : "border-glass-border bg-glass-bg/50 hover:border-glass-border-hover"
      )}
    >
      <div
        className="flex items-center gap-2 px-2 py-1.5 cursor-pointer"
        onClick={onSelect}
      >
        {/* Type indicator */}
        <div className={cn("w-6 h-6 rounded flex items-center justify-center text-sm", config.bg)}>
          {config.icon}
        </div>

        {/* Name */}
        {isEditing ? (
          <div className="flex-1 flex items-center gap-1">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") onEndEdit();
              }}
              className="flex-1 px-1 py-0.5 text-xs bg-zinc-700 border border-zinc-600 rounded focus:outline-none focus:border-cyan-500"
              autoFocus
            />
            <button onClick={handleSaveName} className="p-0.5 hover:text-green-400">
              <Check className="w-3 h-3" />
            </button>
            <button onClick={onEndEdit} className="p-0.5 hover:text-red-400">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{spawn.name}</p>
              <p className={cn("text-[10px] capitalize", config.color)}>{spawn.type}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEdit();
                }}
                className="p-1 rounded hover:bg-white/10 transition-colors"
                title="Edit name"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SPAWN DETAILS COMPONENT
// ============================================================================

interface SpawnDetailsProps {
  spawn: TileSpawn;
  onUpdate: (updates: Partial<TileSpawn>) => void;
}

function SpawnDetails({ spawn, onUpdate }: SpawnDetailsProps) {
  const renderMobDetails = (mob: MobSpawnConfig) => (
    <div className="space-y-3">
      {/* Spawn Radius */}
      <div>
        <label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <Target className="w-3 h-3" />
          Roam Radius
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="20"
            value={mob.spawnRadius}
            onChange={(e) => onUpdate({ spawnRadius: parseInt(e.target.value) } as Partial<MobSpawnConfig>)}
            className="flex-1 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <span className="text-xs w-8 text-center">{mob.spawnRadius}</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          How far the mob can roam from spawn (tiles)
        </p>
      </div>

      {/* Max Count */}
      <div>
        <label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <Users className="w-3 h-3" />
          Max Count
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="20"
            value={mob.maxCount}
            onChange={(e) => onUpdate({ maxCount: parseInt(e.target.value) || 1 } as Partial<MobSpawnConfig>)}
            className="w-20 px-2 py-1 text-xs bg-zinc-700 border border-zinc-600 rounded focus:outline-none focus:border-cyan-500"
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Maximum mobs to spawn at once
        </p>
      </div>

      {/* Respawn Time */}
      <div>
        <label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          <Clock className="w-3 h-3" />
          Respawn Time (ticks)
        </label>
        <input
          type="number"
          min="0"
          value={mob.respawnTicks ?? 100}
          onChange={(e) => onUpdate({ respawnTicks: parseInt(e.target.value) || 100 } as Partial<MobSpawnConfig>)}
          className="w-20 px-2 py-1 text-xs bg-zinc-700 border border-zinc-600 rounded focus:outline-none focus:border-cyan-500"
        />
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Time before mob respawns after death
        </p>
      </div>
    </div>
  );

  const renderNpcDetails = (npc: NpcSpawnConfig) => (
    <div className="space-y-3">
      {/* NPC Type */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">NPC Type</label>
        <select
          value={npc.npcType}
          onChange={(e) => onUpdate({ npcType: e.target.value } as Partial<NpcSpawnConfig>)}
          className="w-full px-2 py-1.5 text-xs bg-zinc-700 border border-zinc-600 rounded focus:outline-none focus:border-cyan-500"
        >
          <option value="neutral">Neutral</option>
          <option value="shop">Shopkeeper</option>
          <option value="bank">Banker</option>
          <option value="quest">Quest Giver</option>
          <option value="guard">Guard</option>
        </select>
      </div>

      {/* Store ID (if shopkeeper) */}
      {npc.npcType === "shop" && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Store ID</label>
          <input
            type="text"
            value={npc.storeId ?? ""}
            onChange={(e) => onUpdate({ storeId: e.target.value || undefined } as Partial<NpcSpawnConfig>)}
            placeholder="e.g., general_store"
            className="w-full px-2 py-1.5 text-xs bg-zinc-700 border border-zinc-600 rounded focus:outline-none focus:border-cyan-500"
          />
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        NPCs are stationary and don&apos;t roam.
      </p>
    </div>
  );

  const renderResourceDetails = (resource: ResourceSpawnConfig) => (
    <div className="space-y-3">
      {/* Resource Type */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Resource Type</label>
        <select
          value={resource.resourceType}
          onChange={(e) => onUpdate({ resourceType: e.target.value } as Partial<ResourceSpawnConfig>)}
          className="w-full px-2 py-1.5 text-xs bg-zinc-700 border border-zinc-600 rounded focus:outline-none focus:border-cyan-500"
        >
          <option value="tree">Tree</option>
          <option value="rock">Rock</option>
          <option value="fishing_spot">Fishing Spot</option>
          <option value="herb">Herb</option>
          <option value="ore">Ore</option>
        </select>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Resources respawn after being depleted.
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Common info */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Entity ID</span>
          <p className="font-mono text-[10px] truncate">{spawn.entityId}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Position</span>
          <p className="font-mono text-[10px]">
            ({spawn.position.x.toFixed(1)}, {spawn.position.z.toFixed(1)})
          </p>
        </div>
      </div>

      {/* Type-specific details */}
      {spawn.type === "mob" && renderMobDetails(spawn as MobSpawnConfig)}
      {spawn.type === "npc" && renderNpcDetails(spawn as NpcSpawnConfig)}
      {spawn.type === "resource" && renderResourceDetails(spawn as ResourceSpawnConfig)}
    </div>
  );
}
