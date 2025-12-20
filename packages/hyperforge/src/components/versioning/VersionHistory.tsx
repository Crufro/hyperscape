"use client";

import { useState, useEffect } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  History,
  Clock,
  User,
  RotateCcw,
  Eye,
  ChevronDown,
  ChevronUp,
  GitBranch,
} from "lucide-react";
import { useVersionStore } from "@/stores/version-store";
import type { AssetVersion, VersionDiff } from "@/lib/versioning/version-types";
import { logger } from "@/lib/utils";

const log = logger.child("VersionHistory");

interface VersionHistoryProps {
  /** Asset ID to show history for */
  assetId: string;
  /** Callback when a version is selected for preview */
  onPreviewVersion?: (version: AssetVersion) => void;
  /** Callback when rollback is triggered */
  onRollback?: (version: AssetVersion, restoredData: Record<string, unknown>) => void;
  /** Callback when diff is requested */
  onShowDiff?: (diff: VersionDiff) => void;
  /** Maximum height for the panel */
  maxHeight?: string;
  /** Whether rollback is enabled */
  allowRollback?: boolean;
}

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
 * Version History Timeline Component
 * Shows all versions for an asset with preview, diff, and rollback actions
 */
export function VersionHistory({
  assetId,
  onPreviewVersion,
  onRollback,
  onShowDiff,
  maxHeight = "400px",
  allowRollback = true,
}: VersionHistoryProps) {
  // Use Zustand store for version management
  const {
    versions,
    currentVersion,
    isLoading,
    setCurrentAsset,
    rollbackToVersion,
    compareVersions,
  } = useVersionStore();

  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<string | null>(null);

  // Set the current asset in the store when assetId changes
  useEffect(() => {
    if (assetId) {
      setCurrentAsset(assetId);
    }
  }, [assetId, setCurrentAsset]);

  const currentVersionId = currentVersion?.id ?? null;

  // Handle rollback
  const handleRollback = async (version: AssetVersion) => {
    if (!allowRollback) return;

    setIsRollingBack(true);
    setRollbackTarget(version.id);

    try {
      const restoredData = rollbackToVersion(version.id);
      if (restoredData) {
        log.info("Rolled back to version", { assetId, versionId: version.id });
        onRollback?.(version, restoredData as Record<string, unknown>);
      }
    } catch (error) {
      log.error("Rollback failed", { error, assetId, versionId: version.id });
    } finally {
      setIsRollingBack(false);
      setRollbackTarget(null);
    }
  };

  // Handle diff view
  const handleShowDiff = (version: AssetVersion) => {
    if (!currentVersionId) return;

    const diff = compareVersions(version.id, currentVersionId);
    if (diff && onShowDiff) {
      onShowDiff(diff);
    }
  };

  // Toggle version expansion
  const toggleExpanded = (versionId: string) => {
    setExpandedVersionId((prev) => (prev === versionId ? null : versionId));
  };

  if (isLoading) {
    return (
      <GlassPanel className="p-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </GlassPanel>
    );
  }

  if (versions.length === 0) {
    return (
      <GlassPanel className="p-4">
        <EmptyState
          icon={History}
          title="No Version History"
          description="This asset hasn't been versioned yet. Changes will be tracked when you save."
        />
      </GlassPanel>
    );
  }

  return (
    <GlassPanel className="p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Version History</h3>
        <Badge variant="secondary" className="ml-auto">
          {versions.length} version{versions.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Timeline */}
      <div
        className="overflow-y-auto space-y-2"
        style={{ maxHeight }}
      >
        {versions.map((version, index) => {
          const isCurrent = version.id === currentVersionId;
          const isExpanded = expandedVersionId === version.id;
          const isRollingBackThis = rollbackTarget === version.id;

          return (
            <div
              key={version.id}
              className={`
                relative border rounded-lg transition-all duration-200
                ${isCurrent ? "border-primary bg-primary/5" : "border-glass-border hover:border-primary/50"}
                ${isExpanded ? "bg-glass-bg/50" : ""}
              `}
            >
              {/* Timeline connector */}
              {index < versions.length - 1 && (
                <div className="absolute left-6 top-full h-2 w-0.5 bg-glass-border" />
              )}

              {/* Version header */}
              <button
                onClick={() => toggleExpanded(version.id)}
                className="w-full p-3 flex items-center gap-3 text-left"
              >
                {/* Timeline dot */}
                <div
                  className={`
                    w-3 h-3 rounded-full flex-shrink-0
                    ${isCurrent ? "bg-primary" : "bg-muted-foreground"}
                  `}
                />

                {/* Version info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{version.label}</span>
                    {isCurrent && (
                      <Badge variant="default" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(version.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {version.createdBy}
                    </span>
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
                  {/* Description */}
                  {version.description && (
                    <p className="text-sm text-muted-foreground pl-6">
                      {version.description}
                    </p>
                  )}

                  {/* Data preview */}
                  <div className="pl-6">
                    <div className="text-xs text-muted-foreground mb-1">
                      Snapshot Data
                    </div>
                    <div className="bg-glass-bg/50 rounded p-2 text-xs font-mono overflow-x-auto">
                      <div>Name: {version.data.name}</div>
                      <div>Category: {version.data.category}</div>
                      {version.data.rarity && <div>Rarity: {version.data.rarity}</div>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pl-6">
                    {onPreviewVersion && (
                      <SpectacularButton
                        size="sm"
                        variant="outline"
                        onClick={() => onPreviewVersion(version)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Preview
                      </SpectacularButton>
                    )}

                    {!isCurrent && onShowDiff && (
                      <SpectacularButton
                        size="sm"
                        variant="outline"
                        onClick={() => handleShowDiff(version)}
                      >
                        <History className="w-3 h-3 mr-1" />
                        Compare
                      </SpectacularButton>
                    )}

                    {!isCurrent && allowRollback && (
                      <SpectacularButton
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRollback(version)}
                        disabled={isRollingBack}
                      >
                        <RotateCcw
                          className={`w-3 h-3 mr-1 ${isRollingBackThis ? "animate-spin" : ""}`}
                        />
                        {isRollingBackThis ? "Rolling back..." : "Rollback"}
                      </SpectacularButton>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer info */}
      <div className="mt-3 pt-3 border-t border-glass-border text-xs text-muted-foreground">
        <span>Showing {versions.length} versions</span>
        <span className="mx-2">•</span>
        <span>Keeping last 20 versions per asset</span>
      </div>
    </GlassPanel>
  );
}
