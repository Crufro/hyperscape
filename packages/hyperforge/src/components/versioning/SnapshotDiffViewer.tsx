"use client";

/**
 * Snapshot Diff Viewer Component
 *
 * Displays differences between two manifest snapshots with
 * side-by-side or unified view, filtering by manifest type,
 * and highlights for additions, deletions, and modifications.
 */

import { useState, useMemo } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Plus,
  Minus,
  Edit,
  ChevronDown,
  ChevronRight,
  Columns,
  List,
  Filter,
  Package,
  Users,
  TreePine,
  Store,
  Music,
} from "lucide-react";
import type { SnapshotDiff, AssetChange } from "@/lib/versioning/version-control";
import type { ChangeType, FieldChange } from "@/lib/versioning/version-types";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface SnapshotDiffViewerProps {
  /** The diff to display */
  diff: SnapshotDiff;
  /** Callback to close the diff viewer */
  onClose?: () => void;
  /** Custom class name */
  className?: string;
}

type ManifestType = "items" | "npcs" | "resources" | "stores" | "music" | "all";
type ViewMode = "side-by-side" | "unified";

// =============================================================================
// HELPERS
// =============================================================================

const MANIFEST_TYPE_CONFIG: Record<Exclude<ManifestType, "all">, { icon: typeof Package; label: string; color: string }> = {
  items: { icon: Package, label: "Items", color: "text-blue-500" },
  npcs: { icon: Users, label: "NPCs", color: "text-green-500" },
  resources: { icon: TreePine, label: "Resources", color: "text-amber-500" },
  stores: { icon: Store, label: "Stores", color: "text-purple-500" },
  music: { icon: Music, label: "Music", color: "text-pink-500" },
};

function getChangeTypeColor(type: ChangeType): string {
  switch (type) {
    case "added":
      return "text-green-500 bg-green-500/10 border-green-500/30";
    case "deleted":
      return "text-red-500 bg-red-500/10 border-red-500/30";
    case "modified":
      return "text-yellow-500 bg-yellow-500/10 border-yellow-500/30";
  }
}

function getChangeTypeIcon(type: ChangeType) {
  switch (type) {
    case "added":
      return Plus;
    case "deleted":
      return Minus;
    case "modified":
      return Edit;
  }
}

function getChangeTypeLabel(type: ChangeType): string {
  switch (type) {
    case "added":
      return "Added";
    case "deleted":
      return "Deleted";
    case "modified":
      return "Modified";
  }
}

/**
 * Group changes by manifest type
 */
function groupChangesByManifestType(
  changes: AssetChange[]
): Record<Exclude<ManifestType, "all">, AssetChange[]> {
  const grouped: Record<Exclude<ManifestType, "all">, AssetChange[]> = {
    items: [],
    npcs: [],
    resources: [],
    stores: [],
    music: [],
  };

  for (const change of changes) {
    grouped[change.manifestType].push(change);
  }

  return grouped;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function SnapshotDiffViewer({
  diff,
  onClose,
  className,
}: SnapshotDiffViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("unified");
  const [filterType, setFilterType] = useState<ManifestType>("all");
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());

  // Group and filter changes
  const groupedChanges = useMemo(
    () => groupChangesByManifestType(diff.changes),
    [diff.changes]
  );

  const filteredChanges = useMemo(() => {
    if (filterType === "all") {
      return diff.changes;
    }
    return groupedChanges[filterType];
  }, [diff.changes, groupedChanges, filterType]);

  // Get counts per manifest type
  const typeCounts = useMemo(() => {
    const counts: Record<Exclude<ManifestType, "all">, number> = {
      items: 0,
      npcs: 0,
      resources: 0,
      stores: 0,
      music: 0,
    };

    for (const change of diff.changes) {
      counts[change.manifestType]++;
    }

    return counts;
  }, [diff.changes]);

  // Toggle asset expansion
  const toggleAsset = (assetId: string) => {
    setExpandedAssets((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  // No changes
  if (diff.summary.total === 0) {
    return (
      <GlassPanel className={cn("p-6", className)}>
        <div className="text-center">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="font-semibold">No Changes</h3>
          <p className="text-sm text-muted-foreground mt-1">
            These snapshots are identical
          </p>
          {onClose && (
            <SpectacularButton
              variant="outline"
              size="sm"
              onClick={onClose}
              className="mt-4"
            >
              Close
            </SpectacularButton>
          )}
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel className={cn("overflow-hidden flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b border-glass-border flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold">Changes</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
              +{diff.summary.added} added
            </Badge>
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
              ~{diff.summary.modified} modified
            </Badge>
            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
              −{diff.summary.deleted} deleted
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-glass-bg/50 rounded-lg p-1">
            <SpectacularButton
              size="sm"
              variant={viewMode === "unified" ? "default" : "ghost"}
              onClick={() => setViewMode("unified")}
              className="h-7 px-2"
              title="Unified view"
            >
              <List className="w-4 h-4" />
            </SpectacularButton>
            <SpectacularButton
              size="sm"
              variant={viewMode === "side-by-side" ? "default" : "ghost"}
              onClick={() => setViewMode("side-by-side")}
              className="h-7 px-2"
              title="Side-by-side view"
            >
              <Columns className="w-4 h-4" />
            </SpectacularButton>
          </div>

          {/* Close button */}
          {onClose && (
            <SpectacularButton
              size="sm"
              variant="ghost"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </SpectacularButton>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="p-3 border-b border-glass-border flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <SpectacularButton
          size="sm"
          variant={filterType === "all" ? "default" : "ghost"}
          onClick={() => setFilterType("all")}
          className="h-7"
        >
          All ({diff.summary.total})
        </SpectacularButton>
        {(Object.entries(MANIFEST_TYPE_CONFIG) as Array<[Exclude<ManifestType, "all">, typeof MANIFEST_TYPE_CONFIG["items"]]>).map(
          ([type, config]) => {
            const count = typeCounts[type];
            if (count === 0) return null;

            const Icon = config.icon;
            return (
              <SpectacularButton
                key={type}
                size="sm"
                variant={filterType === type ? "default" : "ghost"}
                onClick={() => setFilterType(type)}
                className="h-7"
              >
                <Icon className={cn("w-3 h-3 mr-1", config.color)} />
                {config.label} ({count})
              </SpectacularButton>
            );
          }
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {viewMode === "unified" ? (
          <UnifiedView
            changes={filteredChanges}
            expandedAssets={expandedAssets}
            onToggleAsset={toggleAsset}
          />
        ) : (
          <SideBySideView
            changes={filteredChanges}
            expandedAssets={expandedAssets}
            onToggleAsset={toggleAsset}
          />
        )}
      </div>
    </GlassPanel>
  );
}

// =============================================================================
// UNIFIED VIEW
// =============================================================================

interface ViewProps {
  changes: AssetChange[];
  expandedAssets: Set<string>;
  onToggleAsset: (assetId: string) => void;
}

function UnifiedView({ changes, expandedAssets, onToggleAsset }: ViewProps) {
  return (
    <div className="divide-y divide-glass-border">
      {changes.map((change) => {
        const isExpanded = expandedAssets.has(change.assetId);
        const Icon = getChangeTypeIcon(change.changeType);
        const colorClass = getChangeTypeColor(change.changeType);
        const ManifestIcon = MANIFEST_TYPE_CONFIG[change.manifestType].icon;

        return (
          <div key={change.assetId} className="group">
            {/* Asset header */}
            <button
              onClick={() => onToggleAsset(change.assetId)}
              className={cn(
                "w-full px-4 py-3 flex items-center gap-3 text-left transition-colors",
                "hover:bg-glass-bg/30"
              )}
            >
              {/* Change type indicator */}
              <div className={cn("p-1.5 rounded", colorClass)}>
                <Icon className="w-4 h-4" />
              </div>

              {/* Manifest type icon */}
              <ManifestIcon
                className={cn(
                  "w-4 h-4",
                  MANIFEST_TYPE_CONFIG[change.manifestType].color
                )}
              />

              {/* Asset info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{change.assetName}</div>
                <div className="text-xs text-muted-foreground">
                  {change.assetId}
                </div>
              </div>

              {/* Badge and expand */}
              <Badge variant="outline" className={cn("text-xs", colorClass)}>
                {getChangeTypeLabel(change.changeType)}
              </Badge>

              {change.changeType === "modified" && change.fieldChanges.length > 0 && (
                <>
                  <Badge variant="secondary" className="text-xs">
                    {change.fieldChanges.length} field{change.fieldChanges.length !== 1 ? "s" : ""}
                  </Badge>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </>
              )}
            </button>

            {/* Field changes (for modified assets) */}
            {isExpanded && change.changeType === "modified" && change.fieldChanges.length > 0 && (
              <div className="px-4 pb-3 bg-glass-bg/20">
                <div className="ml-12 space-y-1">
                  {change.fieldChanges.map((field, idx) => (
                    <FieldChangeRow key={`${field.path}-${idx}`} change={field} />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// SIDE-BY-SIDE VIEW
// =============================================================================

function SideBySideView({ changes, expandedAssets, onToggleAsset }: ViewProps) {
  return (
    <div>
      {/* Column headers */}
      <div className="grid grid-cols-2 gap-px bg-glass-border sticky top-0 z-10">
        <div className="bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500">
          Before
        </div>
        <div className="bg-green-500/10 px-4 py-2 text-sm font-medium text-green-500">
          After
        </div>
      </div>

      {/* Changes */}
      <div className="divide-y divide-glass-border">
        {changes.map((change) => {
          const isExpanded = expandedAssets.has(change.assetId);
          const Icon = getChangeTypeIcon(change.changeType);
          const colorClass = getChangeTypeColor(change.changeType);

          return (
            <div key={change.assetId}>
              {/* Asset header */}
              <button
                onClick={() => onToggleAsset(change.assetId)}
                className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-glass-bg/30"
              >
                <div className={cn("p-1.5 rounded", colorClass)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{change.assetName}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({change.manifestType})
                  </span>
                </div>
                <Badge variant="outline" className={cn("text-xs", colorClass)}>
                  {getChangeTypeLabel(change.changeType)}
                </Badge>
                {change.changeType === "modified" && (
                  isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )
                )}
              </button>

              {/* Field changes in side-by-side */}
              {isExpanded && change.changeType === "modified" && change.fieldChanges.length > 0 && (
                <div className="divide-y divide-glass-border/50">
                  {change.fieldChanges.map((field, idx) => (
                    <div
                      key={`${field.path}-${idx}`}
                      className="grid grid-cols-2 gap-px bg-glass-border"
                    >
                      {/* Old value */}
                      <div
                        className={cn(
                          "px-4 py-2 text-sm font-mono bg-background",
                          (field.type === "deleted" || field.type === "modified") && "bg-red-500/5"
                        )}
                      >
                        <div className="text-xs text-muted-foreground mb-1">
                          {field.path}
                        </div>
                        {field.type === "added" ? (
                          <span className="text-muted-foreground italic">—</span>
                        ) : (
                          <span className="text-red-500 break-all">
                            {formatFieldValue(field.oldValue)}
                          </span>
                        )}
                      </div>

                      {/* New value */}
                      <div
                        className={cn(
                          "px-4 py-2 text-sm font-mono bg-background",
                          (field.type === "added" || field.type === "modified") && "bg-green-500/5"
                        )}
                      >
                        <div className="text-xs text-muted-foreground mb-1">
                          {field.path}
                        </div>
                        {field.type === "deleted" ? (
                          <span className="text-muted-foreground italic">—</span>
                        ) : (
                          <span className="text-green-500 break-all">
                            {formatFieldValue(field.newValue)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// FIELD CHANGE ROW
// =============================================================================

function FieldChangeRow({ change }: { change: FieldChange }) {
  const Icon = getChangeTypeIcon(change.type);
  const colorClass = getChangeTypeColor(change.type);

  return (
    <div
      className={cn(
        "px-3 py-2 rounded text-sm flex items-start gap-2 border-l-2",
        change.type === "added" && "border-l-green-500 bg-green-500/5",
        change.type === "deleted" && "border-l-red-500 bg-red-500/5",
        change.type === "modified" && "border-l-yellow-500 bg-yellow-500/5"
      )}
    >
      <div className={cn("p-0.5 rounded mt-0.5", colorClass)}>
        <Icon className="w-3 h-3" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-mono text-xs text-muted-foreground mb-1">
          {change.path}
        </div>

        {change.type === "added" && (
          <div className="text-green-500 font-mono text-sm break-all">
            → {formatFieldValue(change.newValue)}
          </div>
        )}

        {change.type === "deleted" && (
          <div className="text-red-500 font-mono text-sm line-through break-all">
            {formatFieldValue(change.oldValue)}
          </div>
        )}

        {change.type === "modified" && (
          <div className="space-y-0.5">
            <div className="text-red-500 font-mono text-sm line-through break-all">
              {formatFieldValue(change.oldValue)}
            </div>
            <div className="text-green-500 font-mono text-sm break-all">
              → {formatFieldValue(change.newValue)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Format a field value for display
 */
function formatFieldValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") {
    return value.length > 100 ? `"${value.substring(0, 100)}..."` : `"${value}"`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

export default SnapshotDiffViewer;
