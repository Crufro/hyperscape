"use client";

/**
 * Sync Status Component
 *
 * Shows synchronization status between HyperForge and game manifests.
 * Displays badges for sync state, timestamps, and diff viewer for changes.
 */

import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Check,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  Diff,
} from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { AssetCategory } from "@/types/core";

// =============================================================================
// TYPES
// =============================================================================

type SyncState = "in_sync" | "changes_pending" | "not_exported" | "unknown";

interface AssetChange {
  assetId: string;
  assetName: string;
  category: AssetCategory;
  changeType: "added" | "modified" | "deleted" | "unchanged";
  manifestType: "items" | "npcs" | "resources" | "stores" | "music";
  changedFields?: string[];
}

interface ManifestSyncStatus {
  manifestType: "items" | "npcs" | "resources" | "stores" | "music";
  state: SyncState;
  lastSynced: string | null;
  gameAssetCount: number;
  forgeAssetCount: number;
  pendingChanges: AssetChange[];
}

interface OverallSyncStatus {
  manifests: ManifestSyncStatus[];
  totalGameAssets: number;
  totalForgeAssets: number;
  totalPendingChanges: number;
  lastChecked: string;
}

interface SyncStatusProps {
  className?: string;
  onSyncComplete?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STATE_BADGES: Record<SyncState, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  in_sync: { label: "In Sync", variant: "success" },
  changes_pending: { label: "Changes Pending", variant: "warning" },
  not_exported: { label: "Not Exported", variant: "destructive" },
  unknown: { label: "Unknown", variant: "secondary" },
};

const MANIFEST_LABELS: Record<string, string> = {
  items: "Items",
  npcs: "NPCs",
  resources: "Resources",
  stores: "Stores",
  music: "Music",
};

// =============================================================================
// COMPONENT
// =============================================================================

export function SyncStatus({ className, onSyncComplete }: SyncStatusProps) {
  // State
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<OverallSyncStatus | null>(null);
  const [expandedManifests, setExpandedManifests] = useState<Set<string>>(new Set());

  // Fetch sync status
  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/sync");
      if (!response.ok) {
        throw new Error(`Failed to fetch sync status: ${response.statusText}`);
      }
      const data = await response.json();
      setStatus(data.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sync status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Perform sync
  const handleSync = async (direction: "from_game" | "to_game") => {
    setSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      await fetchStatus();
      onSyncComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // Toggle manifest expansion
  const toggleManifest = (manifestType: string) => {
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

  // Format timestamp
  const formatTime = (timestamp: string | null): string => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Render loading state
  if (loading) {
    return (
      <GlassPanel className={cn("p-6", className)}>
        <div className="flex items-center justify-center gap-3">
          <Spinner size="sm" />
          <span className="text-muted">Loading sync status...</span>
        </div>
      </GlassPanel>
    );
  }

  // Render error state
  if (error && !status) {
    return (
      <GlassPanel className={cn("p-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
          <SpectacularButton size="sm" variant="ghost" onClick={fetchStatus}>
            <RefreshCw className="w-4 h-4" />
          </SpectacularButton>
        </div>
      </GlassPanel>
    );
  }

  if (!status) {
    return null;
  }

  // Calculate overall state
  const hasChanges = status.totalPendingChanges > 0;
  const overallState: SyncState = hasChanges ? "changes_pending" : "in_sync";

  return (
    <GlassPanel className={cn("", className)}>
      {/* Header */}
      <div className="p-4 border-b border-glass-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Diff className="w-5 h-5 text-accent" />
            <h3 className="font-semibold">Sync Status</h3>
          </div>
          <Badge variant={STATE_BADGES[overallState].variant}>
            {STATE_BADGES[overallState].label}
          </Badge>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-4 text-sm text-muted">
          <span>{status.totalGameAssets} game assets</span>
          <span>•</span>
          <span>{status.totalForgeAssets} in HyperForge</span>
          {status.totalPendingChanges > 0 && (
            <>
              <span>•</span>
              <span className="text-yellow-500">
                {status.totalPendingChanges} pending changes
              </span>
            </>
          )}
        </div>

        {/* Last checked */}
        <div className="flex items-center gap-1 mt-2 text-xs text-muted">
          <Clock className="w-3 h-3" />
          Last checked: {formatTime(status.lastChecked)}
        </div>
      </div>

      {/* Manifest statuses */}
      <div className="divide-y divide-glass-border">
        {status.manifests.map((manifest) => (
          <ManifestStatusRow
            key={manifest.manifestType}
            manifest={manifest}
            expanded={expandedManifests.has(manifest.manifestType)}
            onToggle={() => toggleManifest(manifest.manifestType)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-glass-border bg-glass-bg/50">
        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="flex items-center gap-2">
          <SpectacularButton
            size="sm"
            variant="ghost"
            onClick={fetchStatus}
            disabled={syncing}
          >
            <RefreshCw className={cn("w-4 h-4 mr-1.5", syncing && "animate-spin")} />
            Refresh
          </SpectacularButton>
          <SpectacularButton
            size="sm"
            variant="secondary"
            onClick={() => handleSync("from_game")}
            disabled={syncing || !hasChanges}
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <ArrowDownLeft className="w-4 h-4 mr-1.5" />
            )}
            Pull from Game
          </SpectacularButton>
          <SpectacularButton
            size="sm"
            variant="secondary"
            onClick={() => handleSync("to_game")}
            disabled={syncing}
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <ArrowUpRight className="w-4 h-4 mr-1.5" />
            )}
            Push to Game
          </SpectacularButton>
        </div>
      </div>
    </GlassPanel>
  );
}

// =============================================================================
// MANIFEST STATUS ROW
// =============================================================================

interface ManifestStatusRowProps {
  manifest: ManifestSyncStatus;
  expanded: boolean;
  onToggle: () => void;
}

function ManifestStatusRow({ manifest, expanded, onToggle }: ManifestStatusRowProps) {
  const hasChanges = manifest.pendingChanges.length > 0;
  const stateInfo = STATE_BADGES[manifest.state];

  return (
    <div>
      {/* Row header */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
          hasChanges ? "hover:bg-yellow-500/5" : "hover:bg-glass-bg/50",
        )}
        onClick={onToggle}
      >
        {/* Expand icon */}
        {hasChanges ? (
          expanded ? (
            <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted flex-shrink-0" />
          )
        ) : (
          <Check className="w-4 h-4 text-neon-green flex-shrink-0" />
        )}

        {/* Manifest name */}
        <span className="font-medium flex-1">
          {MANIFEST_LABELS[manifest.manifestType]}
        </span>

        {/* Counts */}
        <span className="text-sm text-muted">
          {manifest.forgeAssetCount}/{manifest.gameAssetCount}
        </span>

        {/* State badge */}
        <Badge variant={stateInfo.variant} className="text-[10px]">
          {stateInfo.label}
        </Badge>
      </div>

      {/* Expanded changes list */}
      {expanded && hasChanges && (
        <div className="px-4 pb-3 space-y-1">
          {manifest.pendingChanges.slice(0, 10).map((change) => (
            <ChangeRow key={change.assetId} change={change} />
          ))}
          {manifest.pendingChanges.length > 10 && (
            <div className="text-xs text-muted pl-6">
              +{manifest.pendingChanges.length - 10} more changes
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// CHANGE ROW
// =============================================================================

interface ChangeRowProps {
  change: AssetChange;
}

function ChangeRow({ change }: ChangeRowProps) {
  const typeColors = {
    added: "text-neon-green",
    modified: "text-yellow-500",
    deleted: "text-red-500",
    unchanged: "text-muted",
  };

  const typeIcons = {
    added: "+",
    modified: "~",
    deleted: "-",
    unchanged: "=",
  };

  return (
    <div className="flex items-center gap-2 text-sm pl-6">
      <span className={cn("font-mono text-xs", typeColors[change.changeType])}>
        {typeIcons[change.changeType]}
      </span>
      <span className="truncate">{change.assetName}</span>
      <span className="text-xs text-muted">({change.category})</span>
      {change.changedFields && change.changedFields.length > 0 && (
        <span className="text-xs text-yellow-500">
          [{change.changedFields.join(", ")}]
        </span>
      )}
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default SyncStatus;
