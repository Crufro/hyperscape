"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import {
  Upload,
  Clock,
  User,
  Package,
  Eye,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  AlertCircle,
  Plus,
  Minus,
  Edit,
} from "lucide-react";
import {
  getExportHistory,
  markExportRolledBack,
  rollback,
} from "@/lib/versioning/version-service";
import type {
  ExportRecord,
  ExportStatus,
  ChangeType,
} from "@/lib/versioning/version-types";
import { logger } from "@/lib/utils";

const log = logger.child("ExportHistory");

interface ExportHistoryProps {
  /** Maximum number of records to show */
  limit?: number;
  /** Callback when viewing changes for an export */
  onViewChanges?: (exportRecord: ExportRecord) => void;
  /** Callback when rollback is triggered */
  onRollback?: (exportRecord: ExportRecord) => void;
  /** Whether rollback is enabled */
  allowRollback?: boolean;
}

/**
 * Format a date for display
 */
function formatExportDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (diffDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Get status badge color
 */
function getStatusColor(status: ExportStatus): string {
  switch (status) {
    case "completed":
      return "bg-green-500/10 text-green-500 border-green-500/30";
    case "pending":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
    case "failed":
      return "bg-red-500/10 text-red-500 border-red-500/30";
    case "rolled_back":
      return "bg-gray-500/10 text-gray-500 border-gray-500/30";
  }
}

/**
 * Get status icon
 */
function getStatusIcon(status: ExportStatus) {
  switch (status) {
    case "completed":
      return Check;
    case "pending":
      return Clock;
    case "failed":
      return X;
    case "rolled_back":
      return RotateCcw;
  }
}

/**
 * Get change type icon
 */
function getChangeTypeIcon(type: ChangeType) {
  switch (type) {
    case "added":
      return Plus;
    case "modified":
      return Edit;
    case "deleted":
      return Minus;
  }
}

/**
 * Get change type color
 */
function getChangeTypeColor(type: ChangeType): string {
  switch (type) {
    case "added":
      return "text-green-500";
    case "modified":
      return "text-yellow-500";
    case "deleted":
      return "text-red-500";
  }
}

/**
 * Export History Panel Component
 * Shows all exports to game manifests with rollback capability
 */
export function ExportHistory({
  limit = 50,
  onViewChanges,
  onRollback,
  allowRollback = true,
}: ExportHistoryProps) {
  const [records, setRecords] = useState<ExportRecord[]>([]);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ExportRecord | null>(null);
  const [showAssetsModal, setShowAssetsModal] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  // Load export history
  const loadHistory = useCallback(() => {
    const history = getExportHistory(limit);
    setRecords(history.records);
  }, [limit]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Toggle record expansion
  const toggleExpanded = (recordId: string) => {
    setExpandedRecordId((prev) => (prev === recordId ? null : recordId));
  };

  // Show assets modal
  const handleViewAssets = (record: ExportRecord) => {
    setSelectedRecord(record);
    setShowAssetsModal(true);
  };

  // Handle rollback
  const handleRollback = async (record: ExportRecord) => {
    if (!allowRollback || record.status === "rolled_back") return;

    setIsRollingBack(true);

    try {
      // Rollback each asset to its previous version
      for (const asset of record.assets) {
        if (asset.previousVersionId) {
          rollback(asset.assetId, asset.previousVersionId);
        }
      }

      // Mark export as rolled back
      markExportRolledBack(record.id);
      loadHistory();

      log.info("Rolled back export", { exportId: record.id });
      onRollback?.(record);
    } catch (error) {
      log.error("Export rollback failed", { error, exportId: record.id });
    } finally {
      setIsRollingBack(false);
    }
  };

  // Group records by date
  const groupedRecords = records.reduce(
    (acc, record) => {
      const date = new Date(record.exportedAt).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(record);
      return acc;
    },
    {} as Record<string, ExportRecord[]>
  );

  if (records.length === 0) {
    return (
      <GlassPanel className="p-6">
        <EmptyState
          icon={Upload}
          title="No Exports Yet"
          description="When you export assets to game manifests, they'll appear here"
        />
      </GlassPanel>
    );
  }

  return (
    <>
      <GlassPanel className="overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-glass-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Export History</h3>
          </div>
          <Badge variant="secondary">
            {records.length} export{records.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Records list */}
        <div className="max-h-[500px] overflow-y-auto">
          {Object.entries(groupedRecords).map(([date, dateRecords]) => (
            <div key={date}>
              {/* Date header */}
              <div className="sticky top-0 px-4 py-2 bg-glass-bg/80 backdrop-blur-sm border-b border-glass-border">
                <span className="text-xs font-medium text-muted-foreground">
                  {date === new Date().toDateString() ? "Today" : date}
                </span>
              </div>

              {/* Records for this date */}
              <div className="divide-y divide-glass-border">
                {dateRecords.map((record) => {
                  const isExpanded = expandedRecordId === record.id;
                  const StatusIcon = getStatusIcon(record.status);

                  return (
                    <div key={record.id}>
                      {/* Record header */}
                      <button
                        onClick={() => toggleExpanded(record.id)}
                        className="w-full p-4 flex items-center gap-4 hover:bg-glass-bg/50 transition-colors"
                      >
                        {/* Status icon */}
                        <div
                          className={`
                            p-2 rounded-lg
                            ${getStatusColor(record.status)}
                          `}
                        >
                          <StatusIcon className="w-4 h-4" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {record.assetCount} asset{record.assetCount !== 1 ? "s" : ""}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-sm text-muted-foreground">
                              {record.manifestTypes.join(", ")}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatExportDate(record.exportedAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {record.exportedBy}
                            </span>
                          </div>
                        </div>

                        {/* Status badge */}
                        <Badge variant="outline" className={getStatusColor(record.status)}>
                          {record.status}
                        </Badge>

                        {/* Expand icon */}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 bg-glass-bg/30">
                          {/* Notes */}
                          {record.notes && (
                            <p className="text-sm text-muted-foreground mb-3 pl-12">
                              {record.notes}
                            </p>
                          )}

                          {/* Error message */}
                          {record.status === "failed" && record.errorMessage && (
                            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 text-red-500 text-sm mb-3 ml-12">
                              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              <span>{record.errorMessage}</span>
                            </div>
                          )}

                          {/* Asset summary */}
                          <div className="pl-12 mb-3">
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1 text-green-500">
                                <Plus className="w-3 h-3" />
                                {record.assets.filter((a) => a.changeType === "added").length} added
                              </span>
                              <span className="flex items-center gap-1 text-yellow-500">
                                <Edit className="w-3 h-3" />
                                {record.assets.filter((a) => a.changeType === "modified").length} modified
                              </span>
                              <span className="flex items-center gap-1 text-red-500">
                                <Minus className="w-3 h-3" />
                                {record.assets.filter((a) => a.changeType === "deleted").length} deleted
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pl-12">
                            <SpectacularButton
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewAssets(record)}
                            >
                              <Package className="w-3 h-3 mr-1" />
                              View Assets
                            </SpectacularButton>

                            {onViewChanges && (
                              <SpectacularButton
                                size="sm"
                                variant="outline"
                                onClick={() => onViewChanges(record)}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                View Changes
                              </SpectacularButton>
                            )}

                            {allowRollback && record.status === "completed" && (
                              <SpectacularButton
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRollback(record)}
                                disabled={isRollingBack}
                              >
                                <RotateCcw
                                  className={`w-3 h-3 mr-1 ${isRollingBack ? "animate-spin" : ""}`}
                                />
                                Rollback Export
                              </SpectacularButton>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>

      {/* Assets Modal */}
      <Modal
        isOpen={showAssetsModal}
        onClose={() => {
          setShowAssetsModal(false);
          setSelectedRecord(null);
        }}
        title="Exported Assets"
      >
        {selectedRecord && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedRecord.assetCount} assets exported to{" "}
              {selectedRecord.manifestTypes.join(", ")}
            </p>

            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {selectedRecord.assets.map((asset) => {
                const ChangeIcon = getChangeTypeIcon(asset.changeType);

                return (
                  <div
                    key={asset.assetId}
                    className="flex items-center gap-3 p-3 rounded-lg bg-glass-bg/50 border border-glass-border"
                  >
                    <ChangeIcon
                      className={`w-4 h-4 ${getChangeTypeColor(asset.changeType)}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{asset.assetName}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {asset.assetId}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        asset.changeType === "added"
                          ? "text-green-500 border-green-500/30"
                          : asset.changeType === "deleted"
                            ? "text-red-500 border-red-500/30"
                            : "text-yellow-500 border-yellow-500/30"
                      }`}
                    >
                      {asset.changeType}
                    </Badge>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4 border-t border-glass-border">
              <SpectacularButton
                variant="outline"
                onClick={() => {
                  setShowAssetsModal(false);
                  setSelectedRecord(null);
                }}
              >
                Close
              </SpectacularButton>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
