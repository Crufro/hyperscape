"use client";

/**
 * Import From Game Panel
 *
 * UI for importing assets from game manifests into HyperForge.
 * Shows assets found in game manifests with checkboxes for selection.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Download,
  Package,
  Sword,
  User,
  TreePine,
  Store,
  Music,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { AssetCategory } from "@/types/core";

// =============================================================================
// TYPES
// =============================================================================

interface GameAsset {
  id: string;
  name: string;
  category: AssetCategory;
  description?: string;
  manifestType: "items" | "npcs" | "resources" | "stores" | "music";
  hasModel: boolean;
  modelPath?: string;
  thumbnailPath?: string;
}

interface ManifestData {
  items: GameAsset[];
  npcs: GameAsset[];
  resources: GameAsset[];
  stores: GameAsset[];
  music: GameAsset[];
}

interface ImportFromGamePanelProps {
  onImportComplete?: (importedIds: string[]) => void;
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MANIFEST_ICONS = {
  items: Sword,
  npcs: User,
  resources: TreePine,
  stores: Store,
  music: Music,
};

const MANIFEST_LABELS = {
  items: "Items",
  npcs: "NPCs",
  resources: "Resources",
  stores: "Stores",
  music: "Music",
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ImportFromGamePanel({
  onImportComplete,
  className,
}: ImportFromGamePanelProps) {
  // State
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manifests, setManifests] = useState<ManifestData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<keyof ManifestData>("items");

  // Fetch manifests on mount
  const fetchManifests = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/import");
      if (!response.ok) {
        throw new Error(`Failed to fetch manifests: ${response.statusText}`);
      }
      const data = await response.json();
      setManifests(data.manifests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load manifests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManifests();
  }, [fetchManifests]);

  // Toggle asset selection
  const toggleAsset = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all in current manifest
  const selectAll = (manifestType: keyof ManifestData) => {
    if (!manifests) return;
    const assets = manifests[manifestType];
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const asset of assets) {
        next.add(asset.id);
      }
      return next;
    });
  };

  // Deselect all in current manifest
  const deselectAll = (manifestType: keyof ManifestData) => {
    if (!manifests) return;
    const assets = manifests[manifestType];
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const asset of assets) {
        next.delete(asset.id);
      }
      return next;
    });
  };

  // Import selected assets
  const handleImport = async () => {
    if (selectedIds.size === 0) return;

    setImporting(true);
    setError(null);

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetIds: Array.from(selectedIds),
        }),
      });

      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }

      const result = await response.json();
      onImportComplete?.(result.imported);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  // Get current manifest assets (used for rendering)
  const _getCurrentAssets = (): GameAsset[] => {
    if (!manifests) return [];
    return manifests[activeTab] || [];
  };

  // Count selected in current manifest
  const countSelectedInManifest = (manifestType: keyof ManifestData): number => {
    if (!manifests) return 0;
    const assets = manifests[manifestType];
    return assets.filter((a) => selectedIds.has(a.id)).length;
  };

  // Render loading state
  if (loading) {
    return (
      <GlassPanel className={cn("p-6", className)}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Spinner size="lg" />
          <p className="text-muted">Loading game manifests...</p>
        </div>
      </GlassPanel>
    );
  }

  // Render error state
  if (error && !manifests) {
    return (
      <GlassPanel className={cn("p-6", className)}>
        <EmptyState
          icon={AlertCircle}
          title="Failed to Load"
          description={error}
          action={
            <SpectacularButton onClick={fetchManifests} variant="secondary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </SpectacularButton>
          }
        />
      </GlassPanel>
    );
  }

  // Render empty state
  if (!manifests) {
    return (
      <GlassPanel className={cn("p-6", className)}>
        <EmptyState
          icon={Package}
          title="No Manifests Found"
          description="Could not find any game manifest files"
        />
      </GlassPanel>
    );
  }

  const totalCount =
    manifests.items.length +
    manifests.npcs.length +
    manifests.resources.length +
    manifests.stores.length +
    manifests.music.length;

  return (
    <GlassPanel className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b border-glass-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Import from Game</h2>
          </div>
          <Badge variant="secondary">{totalCount} assets</Badge>
        </div>
        <p className="text-sm text-muted">
          Import assets from game manifests into HyperForge for editing and enhancement.
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as keyof ManifestData)}>
        <div className="p-2 border-b border-glass-border">
          <TabsList className="w-full">
            {(Object.keys(MANIFEST_LABELS) as Array<keyof ManifestData>).map((key) => {
              const Icon = MANIFEST_ICONS[key];
              const count = manifests[key].length;
              const selectedCount = countSelectedInManifest(key);
              return (
                <TabsTrigger key={key} value={key} className="flex-1">
                  <Icon className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">{MANIFEST_LABELS[key]}</span>
                  <span className="ml-1.5 text-xs text-muted">
                    {selectedCount > 0 ? `${selectedCount}/` : ""}
                    {count}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Content */}
        {(Object.keys(MANIFEST_LABELS) as Array<keyof ManifestData>).map((key) => (
          <TabsContent key={key} value={key} className="flex-1 overflow-hidden">
            <div className="flex flex-col h-full">
              {/* Selection toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-glass-border bg-glass-bg/50">
                <div className="flex items-center gap-2">
                  <SpectacularButton
                    size="sm"
                    variant="ghost"
                    onClick={() => selectAll(key)}
                  >
                    Select All
                  </SpectacularButton>
                  <SpectacularButton
                    size="sm"
                    variant="ghost"
                    onClick={() => deselectAll(key)}
                  >
                    Deselect All
                  </SpectacularButton>
                </div>
                <span className="text-sm text-muted">
                  {countSelectedInManifest(key)} selected
                </span>
              </div>

              {/* Asset list */}
              <div className="flex-1 overflow-y-auto p-2">
                {manifests[key].length === 0 ? (
                  <EmptyState
                    icon={MANIFEST_ICONS[key]}
                    title={`No ${MANIFEST_LABELS[key]}`}
                    description={`No ${key} found in manifest`}
                  />
                ) : (
                  <div className="space-y-1">
                    {manifests[key].map((asset) => (
                      <AssetRow
                        key={asset.id}
                        asset={asset}
                        selected={selectedIds.has(asset.id)}
                        onToggle={() => toggleAsset(asset.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Footer / Import Button */}
      <div className="p-4 border-t border-glass-border bg-glass-bg/50">
        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">
            {selectedIds.size} assets selected
          </span>
          <SpectacularButton
            onClick={handleImport}
            disabled={selectedIds.size === 0 || importing}
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Import Selected
              </>
            )}
          </SpectacularButton>
        </div>
      </div>
    </GlassPanel>
  );
}

// =============================================================================
// ASSET ROW COMPONENT
// =============================================================================

interface AssetRowProps {
  asset: GameAsset;
  selected: boolean;
  onToggle: () => void;
}

function AssetRow({ asset, selected, onToggle }: AssetRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
        selected
          ? "bg-accent/10 border border-accent/30"
          : "bg-glass-bg/50 border border-transparent hover:bg-glass-bg hover:border-glass-border",
      )}
      onClick={onToggle}
    >
      <Checkbox checked={selected} onCheckedChange={onToggle} />

      {/* Thumbnail placeholder */}
      <div className="w-10 h-10 rounded bg-glass-bg border border-glass-border flex items-center justify-center flex-shrink-0">
        {asset.hasModel ? (
          <Package className="w-5 h-5 text-neon-green" />
        ) : (
          <Package className="w-5 h-5 text-muted" />
        )}
      </div>

      {/* Asset info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{asset.name}</span>
          {asset.hasModel ? (
            <Badge variant="success" className="text-[10px]">
              Has Model
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">
              No Model
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted truncate">
          {asset.description || asset.id}
        </p>
      </div>

      {/* Category badge */}
      <Badge variant="secondary" className="text-[10px] flex-shrink-0">
        {asset.category}
      </Badge>
    </div>
  );
}
