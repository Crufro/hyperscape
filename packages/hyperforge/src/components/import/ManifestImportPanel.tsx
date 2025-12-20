"use client";

/**
 * Manifest Import Panel
 *
 * Comprehensive UI for syncing between game manifests and HyperForge.
 * Shows diff view, pending changes, and sync buttons.
 */

import { useState, useEffect, useCallback } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Minus,
  FileJson,
  Package,
  Sword,
  User,
  TreePine,
  Store,
  Music,
} from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { AssetCategory } from "@/types/core";

// =============================================================================
// TYPES
// =============================================================================

type ManifestType = "items" | "npcs" | "resources" | "stores" | "music";

interface AssetComparison {
  id: string;
  name: string;
  category: AssetCategory;
  manifestType: ManifestType;
  existsInForge: boolean;
  existsInGame: boolean;
  isModified: boolean;
}

interface ManifestDiff {
  manifestType: ManifestType;
  newAssets: AssetComparison[];
  modifiedAssets: AssetComparison[];
  deletedAssets: AssetComparison[];
  unchangedAssets: AssetComparison[];
  summary: {
    new: number;
    modified: number;
    deleted: number;
    unchanged: number;
  };
}

interface FullDiff {
  manifests: ManifestDiff[];
  totals: {
    new: number;
    modified: number;
    deleted: number;
    unchanged: number;
  };
  timestamp: string;
}

interface SyncResult {
  success: boolean;
  totals: {
    added: number;
    updated: number;
    skipped: number;
    failed: number;
  };
}

interface ManifestImportPanelProps {
  onSyncComplete?: () => void;
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MANIFEST_ICONS: Record<ManifestType, React.ComponentType<{ className?: string }>> = {
  items: Sword,
  npcs: User,
  resources: TreePine,
  stores: Store,
  music: Music,
};

const MANIFEST_LABELS: Record<ManifestType, string> = {
  items: "Items",
  npcs: "NPCs",
  resources: "Resources",
  stores: "Stores",
  music: "Music",
};

// =============================================================================
// COMPONENT
// =============================================================================

export function ManifestImportPanel({
  onSyncComplete,
  className,
}: ManifestImportPanelProps) {
  // State
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diff, setDiff] = useState<FullDiff | null>(null);
  const [expandedManifests, setExpandedManifests] = useState<Set<ManifestType>>(
    new Set(),
  );
  const [activeTab, setActiveTab] = useState<ManifestType>("items");
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  // Fetch diff data
  const fetchDiff = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/import/manifests");
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest diff: ${response.statusText}`);
      }
      const data = await response.json();
      setDiff(data.diff);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load manifest data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiff();
  }, [fetchDiff]);

  // Sync from game
  const handleSyncFromGame = async () => {
    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const response = await fetch("/api/import/manifests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "from_game" }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const data = await response.json();
      setSyncResult(data);
      await fetchDiff();
      onSyncComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // Sync to game
  const handleSyncToGame = async () => {
    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const response = await fetch("/api/import/manifests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction: "to_game" }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const data = await response.json();
      setSyncResult(data);
      await fetchDiff();
      onSyncComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // Toggle manifest expansion
  const toggleManifest = (manifestType: ManifestType) => {
    setExpandedManifests((prev) => {
      const next = new Set(prev);
      if (next.has(manifestType)) {
        next.delete(manifestType);
      } else {
        next.add(manifestType);
      }
      return next;
    });
  };

  // Get current manifest diff
  const getCurrentManifestDiff = (): ManifestDiff | undefined => {
    if (!diff) return undefined;
    return diff.manifests.find((m) => m.manifestType === activeTab);
  };

  // Render loading state
  if (loading) {
    return (
      <GlassPanel className={cn("p-6", className)}>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <Spinner size="lg" />
          <p className="text-muted">Loading manifest data...</p>
        </div>
      </GlassPanel>
    );
  }

  // Render error state
  if (error && !diff) {
    return (
      <GlassPanel className={cn("p-6", className)}>
        <EmptyState
          icon={AlertTriangle}
          title="Failed to Load"
          description={error}
          action={
            <SpectacularButton onClick={fetchDiff} variant="secondary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </SpectacularButton>
          }
        />
      </GlassPanel>
    );
  }

  // Render empty state
  if (!diff) {
    return (
      <GlassPanel className={cn("p-6", className)}>
        <EmptyState
          icon={FileJson}
          title="No Manifest Data"
          description="Could not find any game manifest files"
        />
      </GlassPanel>
    );
  }

  const hasChanges = diff.totals.new > 0 || diff.totals.modified > 0 || diff.totals.deleted > 0;
  const currentManifest = getCurrentManifestDiff();

  return (
    <GlassPanel className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b border-glass-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileJson className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Manifest Sync</h2>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges ? (
              <Badge variant="warning">Changes Pending</Badge>
            ) : (
              <Badge variant="success">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                In Sync
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted">
          Sync game manifest data with HyperForge asset registry.
        </p>

        {/* Summary Stats */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          <SummaryBadge
            icon={Plus}
            count={diff.totals.new}
            label="New"
            color="text-neon-green"
          />
          <SummaryBadge
            icon={Pencil}
            count={diff.totals.modified}
            label="Modified"
            color="text-yellow-500"
          />
          <SummaryBadge
            icon={Trash2}
            count={diff.totals.deleted}
            label="Deleted"
            color="text-red-500"
          />
          <SummaryBadge
            icon={Minus}
            count={diff.totals.unchanged}
            label="Unchanged"
            color="text-muted"
          />
        </div>
      </div>

      {/* Tabs for manifest types */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ManifestType)}>
        <div className="p-2 border-b border-glass-border">
          <TabsList className="w-full">
            {(Object.keys(MANIFEST_LABELS) as ManifestType[]).map((key) => {
              const Icon = MANIFEST_ICONS[key];
              const manifestDiff = diff.manifests.find((m) => m.manifestType === key);
              const changesCount = manifestDiff
                ? manifestDiff.summary.new + manifestDiff.summary.modified + manifestDiff.summary.deleted
                : 0;

              return (
                <TabsTrigger key={key} value={key} className="flex-1 relative">
                  <Icon className="w-4 h-4 mr-1.5" />
                  <span className="hidden sm:inline">{MANIFEST_LABELS[key]}</span>
                  {changesCount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-yellow-500/20 text-yellow-500">
                      {changesCount}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Content for each manifest */}
        {(Object.keys(MANIFEST_LABELS) as ManifestType[]).map((key) => (
          <TabsContent key={key} value={key} className="flex-1 overflow-hidden">
            {currentManifest ? (
              <DiffView diff={currentManifest} />
            ) : (
              <div className="p-4 text-muted text-center">
                No data for {MANIFEST_LABELS[key]}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Actions / Sync Buttons */}
      <div className="p-4 border-t border-glass-border bg-glass-bg/50">
        {/* Sync Result */}
        {syncResult && (
          <div
            className={cn(
              "mb-3 px-3 py-2 rounded-lg text-sm",
              syncResult.success
                ? "bg-neon-green/10 border border-neon-green/20 text-neon-green"
                : "bg-destructive/10 border border-destructive/20 text-destructive",
            )}
          >
            {syncResult.success ? (
              <>
                Sync complete: {syncResult.totals.added} added, {syncResult.totals.updated} updated,{" "}
                {syncResult.totals.skipped} skipped
              </>
            ) : (
              <>Sync failed: {syncResult.totals.failed} errors</>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <SpectacularButton
            size="sm"
            variant="ghost"
            onClick={fetchDiff}
            disabled={syncing}
          >
            <RefreshCw className={cn("w-4 h-4 mr-1.5", syncing && "animate-spin")} />
            Refresh
          </SpectacularButton>

          <div className="flex items-center gap-2">
            <SpectacularButton
              size="sm"
              variant="secondary"
              onClick={handleSyncFromGame}
              disabled={syncing || !hasChanges}
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <ArrowDownLeft className="w-4 h-4 mr-1.5" />
              )}
              Sync from Game
            </SpectacularButton>

            <SpectacularButton
              size="sm"
              variant="secondary"
              onClick={handleSyncToGame}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <ArrowUpRight className="w-4 h-4 mr-1.5" />
              )}
              Sync to Game
            </SpectacularButton>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SummaryBadgeProps {
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  label: string;
  color: string;
}

function SummaryBadge({ icon: Icon, count, label, color }: SummaryBadgeProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn("w-3.5 h-3.5", color)} />
      <span className={cn("font-medium", color)}>{count}</span>
      <span className="text-muted">{label}</span>
    </div>
  );
}

interface DiffViewProps {
  diff: ManifestDiff;
}

function DiffView({ diff }: DiffViewProps) {
  const sections = [
    {
      title: "New Assets",
      icon: Plus,
      color: "text-neon-green",
      bgColor: "bg-neon-green/10",
      borderColor: "border-neon-green/20",
      assets: diff.newAssets,
      initiallyCollapsed: false,
    },
    {
      title: "Modified Assets",
      icon: Pencil,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
      assets: diff.modifiedAssets,
      initiallyCollapsed: false,
    },
    {
      title: "Deleted from Game",
      icon: Trash2,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      assets: diff.deletedAssets,
      initiallyCollapsed: false,
    },
    {
      title: "Unchanged",
      icon: Minus,
      color: "text-muted",
      bgColor: "bg-glass-bg/50",
      borderColor: "border-glass-border",
      assets: diff.unchangedAssets,
      initiallyCollapsed: true,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {sections.map((section) => (
        <DiffSection
          key={section.title}
          title={section.title}
          icon={section.icon}
          color={section.color}
          bgColor={section.bgColor}
          borderColor={section.borderColor}
          assets={section.assets}
          initiallyCollapsed={section.initiallyCollapsed}
        />
      ))}

      {/* Empty state */}
      {diff.newAssets.length === 0 &&
        diff.modifiedAssets.length === 0 &&
        diff.deletedAssets.length === 0 &&
        diff.unchangedAssets.length === 0 && (
          <EmptyState
            icon={Package}
            title="No Assets"
            description="This manifest has no assets"
          />
        )}
    </div>
  );
}

interface DiffSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  assets: AssetComparison[];
  initiallyCollapsed: boolean;
}

function DiffSection({
  title,
  icon: Icon,
  color,
  bgColor,
  borderColor,
  assets,
  initiallyCollapsed,
}: DiffSectionProps) {
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);

  if (assets.length === 0) {
    return null;
  }

  return (
    <div className={cn("rounded-lg border", borderColor)}>
      {/* Header */}
      <button
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-t-lg",
          bgColor,
        )}
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted" />
        )}
        <Icon className={cn("w-4 h-4", color)} />
        <span className="font-medium">{title}</span>
        <Badge variant="secondary" className="ml-auto">
          {assets.length}
        </Badge>
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="divide-y divide-glass-border">
          {assets.slice(0, 20).map((asset) => (
            <div
              key={asset.id}
              className="flex items-center gap-3 px-3 py-2 text-sm"
            >
              <span className="font-medium truncate flex-1">{asset.name}</span>
              <Badge variant="outline" className="text-[10px]">
                {asset.category}
              </Badge>
              <span className="text-muted text-xs">{asset.id}</span>
            </div>
          ))}
          {assets.length > 20 && (
            <div className="px-3 py-2 text-xs text-muted text-center">
              +{assets.length - 20} more assets
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default ManifestImportPanel;
