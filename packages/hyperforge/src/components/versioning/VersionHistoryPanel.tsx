"use client";

/**
 * Version History Panel for Full Manifest Snapshots
 *
 * Displays a timeline view of all manifest snapshots with
 * diff viewing and rollback capabilities.
 */

import { useState, useEffect, useCallback } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  History,
  Clock,
  GitBranch,
  RotateCcw,
  Eye,
  ChevronDown,
  ChevronUp,
  Plus,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { SnapshotDiffViewer } from "./SnapshotDiffViewer";
import type {
  SnapshotSummary,
  Snapshot,
  SnapshotDiff,
} from "@/lib/versioning/version-control";
import { logger, cn } from "@/lib/utils";

const log = logger.child("VersionHistoryPanel");

// =============================================================================
// TYPES
// =============================================================================

interface VersionHistoryPanelProps {
  /** Maximum height for the panel */
  maxHeight?: string;
  /** Callback when a snapshot is restored */
  onSnapshotRestored?: (manifests: Snapshot["manifests"]) => void;
  /** Whether to allow creating new snapshots */
  showCreateButton?: boolean;
  /** Callback when create snapshot is clicked */
  onCreateSnapshot?: () => void;
  /** Custom class name */
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format a relative time string
 */
function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * Format absolute time
 */
function formatAbsoluteTime(isoDate: string): string {
  return new Date(isoDate).toLocaleString();
}

// =============================================================================
// COMPONENT
// =============================================================================

export function VersionHistoryPanel({
  maxHeight = "600px",
  onSnapshotRestored,
  showCreateButton = true,
  onCreateSnapshot,
  className,
}: VersionHistoryPanelProps) {
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSnapshotId, setExpandedSnapshotId] = useState<string | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<[string, string] | null>(null);
  const [activeDiff, setActiveDiff] = useState<SnapshotDiff | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Load snapshots from API
  const loadSnapshots = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/versions");
      if (!response.ok) {
        throw new Error(`Failed to load snapshots: ${response.statusText}`);
      }
      const data = await response.json();
      setSnapshots(data.snapshots || []);
    } catch (err) {
      log.error("Failed to load snapshots", { error: err });
      setError(err instanceof Error ? err.message : "Failed to load snapshots");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  // Compare two snapshots
  const handleCompare = async (fromId: string, toId: string) => {
    try {
      const response = await fetch(`/api/versions?compare=${fromId}&to=${toId}`);
      if (!response.ok) {
        throw new Error("Failed to compare snapshots");
      }
      const data = await response.json();
      setActiveDiff(data.diff);
      setSelectedForCompare([fromId, toId]);
    } catch (err) {
      log.error("Failed to compare snapshots", { error: err });
    }
  };

  // Restore a snapshot
  const handleRestore = async (snapshotId: string) => {
    setIsRestoring(true);
    setRestoringId(snapshotId);

    try {
      const response = await fetch("/api/versions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotId }),
      });

      if (!response.ok) {
        throw new Error("Failed to restore snapshot");
      }

      const data = await response.json();
      log.info("Snapshot restored", { snapshotId });

      // Reload snapshots to show the new restore snapshot
      await loadSnapshots();

      if (data.manifests && onSnapshotRestored) {
        onSnapshotRestored(data.manifests);
      }
    } catch (err) {
      log.error("Failed to restore snapshot", { error: err });
    } finally {
      setIsRestoring(false);
      setRestoringId(null);
    }
  };

  // Delete a snapshot
  const handleDelete = async (snapshotId: string) => {
    try {
      const response = await fetch(`/api/versions/${snapshotId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete snapshot");
      }

      log.info("Snapshot deleted", { snapshotId });
      await loadSnapshots();
      setShowDeleteConfirm(null);
    } catch (err) {
      log.error("Failed to delete snapshot", { error: err });
    }
  };

  // Toggle snapshot expansion
  const toggleExpanded = (snapshotId: string) => {
    setExpandedSnapshotId((prev) => (prev === snapshotId ? null : snapshotId));
  };

  // Close diff viewer
  const closeDiff = () => {
    setActiveDiff(null);
    setSelectedForCompare(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <GlassPanel className={cn("p-6", className)}>
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading version history...</span>
        </div>
      </GlassPanel>
    );
  }

  // Error state
  if (error) {
    return (
      <GlassPanel className={cn("p-6", className)}>
        <div className="text-center text-red-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p className="font-medium">Failed to load version history</p>
          <p className="text-sm mt-1">{error}</p>
          <SpectacularButton
            variant="outline"
            size="sm"
            onClick={loadSnapshots}
            className="mt-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </SpectacularButton>
        </div>
      </GlassPanel>
    );
  }

  // Empty state
  if (snapshots.length === 0) {
    return (
      <GlassPanel className={cn("p-4", className)}>
        <EmptyState
          icon={History}
          title="No Snapshots Yet"
          description="Create a snapshot to start tracking your manifest changes over time."
        />
        {showCreateButton && onCreateSnapshot && (
          <div className="mt-4 text-center">
            <SpectacularButton onClick={onCreateSnapshot}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Snapshot
            </SpectacularButton>
          </div>
        )}
      </GlassPanel>
    );
  }

  // If showing diff viewer
  if (activeDiff && selectedForCompare) {
    return (
      <SnapshotDiffViewer
        diff={activeDiff}
        onClose={closeDiff}
        {...(className ? { className } : {})}
      />
    );
  }

  return (
    <GlassPanel className={cn("overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 border-b border-glass-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Version History</h3>
          <Badge variant="secondary">
            {snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <SpectacularButton
            variant="ghost"
            size="sm"
            onClick={loadSnapshots}
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </SpectacularButton>

          {showCreateButton && onCreateSnapshot && (
            <SpectacularButton size="sm" onClick={onCreateSnapshot}>
              <Plus className="w-4 h-4 mr-2" />
              New Snapshot
            </SpectacularButton>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div
        className="overflow-y-auto p-4 space-y-2"
        style={{ maxHeight }}
      >
        {snapshots.map((snapshot, index) => {
          const isFirst = index === 0;
          const isExpanded = expandedSnapshotId === snapshot.id;
          const isRestoringThis = restoringId === snapshot.id;
          const showingDeleteConfirm = showDeleteConfirm === snapshot.id;

          return (
            <div
              key={snapshot.id}
              className={cn(
                "relative border rounded-lg transition-all duration-200",
                isFirst
                  ? "border-primary bg-primary/5"
                  : "border-glass-border hover:border-primary/50",
                isExpanded && "bg-glass-bg/50"
              )}
            >
              {/* Timeline connector */}
              {index < snapshots.length - 1 && (
                <div className="absolute left-6 top-full h-2 w-0.5 bg-glass-border z-0" />
              )}

              {/* Snapshot header */}
              <button
                onClick={() => toggleExpanded(snapshot.id)}
                className="w-full p-3 flex items-center gap-3 text-left"
              >
                {/* Timeline dot */}
                <div
                  className={cn(
                    "w-3 h-3 rounded-full flex-shrink-0",
                    isFirst ? "bg-primary" : "bg-muted-foreground"
                  )}
                />

                {/* Snapshot info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate max-w-[200px]">
                      {snapshot.description}
                    </span>
                    {isFirst && (
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    )}
                    {snapshot.metadata.changesFromPrevious > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {snapshot.metadata.changesFromPrevious} change{snapshot.metadata.changesFromPrevious !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(snapshot.timestamp)}
                    </span>
                    <span>{snapshot.metadata.totalAssets} assets</span>
                  </div>
                </div>

                {/* Expand indicator */}
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3">
                  {/* Metadata */}
                  <div className="pl-6 text-sm text-muted-foreground">
                    <div>Created: {formatAbsoluteTime(snapshot.timestamp)}</div>
                    <div>ID: <code className="text-xs">{snapshot.id}</code></div>
                    <div>Hash: <code className="text-xs">{snapshot.metadata.hash}</code></div>
                  </div>

                  {/* Delete confirmation */}
                  {showingDeleteConfirm ? (
                    <div className="pl-6 p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                      <p className="text-sm text-red-400 mb-2">
                        Are you sure you want to delete this snapshot?
                      </p>
                      <div className="flex gap-2">
                        <SpectacularButton
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(snapshot.id)}
                        >
                          Yes, Delete
                        </SpectacularButton>
                        <SpectacularButton
                          size="sm"
                          variant="outline"
                          onClick={() => setShowDeleteConfirm(null)}
                        >
                          Cancel
                        </SpectacularButton>
                      </div>
                    </div>
                  ) : (
                    /* Actions */
                    <div className="flex gap-2 pl-6 flex-wrap">
                      {/* Compare with current */}
                      {!isFirst && snapshots.length > 1 && snapshots[0] && (
                        <SpectacularButton
                          size="sm"
                          variant="outline"
                          onClick={() => handleCompare(snapshot.id, snapshots[0]!.id)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Compare with Current
                        </SpectacularButton>
                      )}

                      {/* Compare with previous */}
                      {index < snapshots.length - 1 && snapshots[index + 1] && (
                        <SpectacularButton
                          size="sm"
                          variant="outline"
                          onClick={() => handleCompare(snapshots[index + 1]!.id, snapshot.id)}
                        >
                          <History className="w-3 h-3 mr-1" />
                          View Changes
                        </SpectacularButton>
                      )}

                      {/* Restore */}
                      {!isFirst && (
                        <SpectacularButton
                          size="sm"
                          variant="default"
                          onClick={() => handleRestore(snapshot.id)}
                          disabled={isRestoring}
                        >
                          <RotateCcw
                            className={cn(
                              "w-3 h-3 mr-1",
                              isRestoringThis && "animate-spin"
                            )}
                          />
                          {isRestoringThis ? "Restoring..." : "Restore"}
                        </SpectacularButton>
                      )}

                      {/* Delete */}
                      <SpectacularButton
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowDeleteConfirm(snapshot.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </SpectacularButton>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer info */}
      <div className="p-3 border-t border-glass-border text-xs text-muted-foreground">
        <span>Keeping last 100 snapshots</span>
        <span className="mx-2">•</span>
        <span>Stored in .hyperforge/versions/</span>
      </div>
    </GlassPanel>
  );
}

export default VersionHistoryPanel;
