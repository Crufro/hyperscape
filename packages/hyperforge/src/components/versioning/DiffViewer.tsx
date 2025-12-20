"use client";

import { useState, useMemo } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Minus,
  Edit,
  ChevronDown,
  ChevronRight,
  Columns,
  List,
  Copy,
  Check,
} from "lucide-react";
import { formatDiffForUI, type FormattedDiffSection } from "@/lib/versioning/diff-utils";
import type { VersionDiff, ChangeType, FieldChange } from "@/lib/versioning/version-types";

interface DiffViewerProps {
  /** The diff to display */
  diff: VersionDiff;
  /** View mode: side-by-side or unified */
  defaultMode?: "side-by-side" | "unified";
  /** Whether sections can be collapsed */
  collapsible?: boolean;
  /** Callback when a field is clicked */
  onFieldClick?: (change: FieldChange) => void;
}

/**
 * Get color class based on change type
 */
function getChangeTypeColor(type: ChangeType): string {
  switch (type) {
    case "added":
      return "text-green-500 bg-green-500/10";
    case "deleted":
      return "text-red-500 bg-red-500/10";
    case "modified":
      return "text-yellow-500 bg-yellow-500/10";
  }
}

/**
 * Get icon for change type
 */
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

/**
 * Format the change type for display
 */
function formatChangeType(type: ChangeType): string {
  switch (type) {
    case "added":
      return "Added";
    case "deleted":
      return "Removed";
    case "modified":
      return "Changed";
  }
}

/**
 * Diff Viewer Component
 * Displays differences between two asset versions
 */
export function DiffViewer({
  diff,
  defaultMode = "unified",
  collapsible = true,
  onFieldClick,
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<"side-by-side" | "unified">(defaultMode);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Format diff for UI display
  const formattedSections = useMemo(() => formatDiffForUI(diff.changes), [diff.changes]);

  // Toggle section collapse
  const toggleSection = (path: string) => {
    if (!collapsible) return;
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Copy path to clipboard
  const copyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch {
      // Clipboard access denied
    }
  };

  // Render no changes state
  if (!diff.hasChanges) {
    return (
      <GlassPanel className="p-6 text-center">
        <div className="text-muted-foreground">
          <Check className="w-12 h-12 mx-auto mb-3 text-green-500" />
          <p className="font-medium">No Changes</p>
          <p className="text-sm mt-1">These versions are identical</p>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel className="overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-glass-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold">Changes</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
              +{diff.summary.added} added
            </Badge>
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
              ~{diff.summary.modified} modified
            </Badge>
            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">
              -{diff.summary.deleted} deleted
            </Badge>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-glass-bg/50 rounded-lg p-1">
          <SpectacularButton
            size="sm"
            variant={viewMode === "unified" ? "default" : "ghost"}
            onClick={() => setViewMode("unified")}
            className="h-7 px-2"
          >
            <List className="w-4 h-4" />
          </SpectacularButton>
          <SpectacularButton
            size="sm"
            variant={viewMode === "side-by-side" ? "default" : "ghost"}
            onClick={() => setViewMode("side-by-side")}
            className="h-7 px-2"
          >
            <Columns className="w-4 h-4" />
          </SpectacularButton>
        </div>
      </div>

      {/* Diff content */}
      <div className="max-h-[500px] overflow-y-auto">
        {viewMode === "unified" ? (
          <UnifiedDiffView
            sections={formattedSections}
            collapsedSections={collapsedSections}
            collapsible={collapsible}
            onToggleSection={toggleSection}
            onCopyPath={copyPath}
            copiedPath={copiedPath}
            onFieldClick={onFieldClick}
            changes={diff.changes}
          />
        ) : (
          <SideBySideDiffView
            sections={formattedSections}
            collapsedSections={collapsedSections}
            collapsible={collapsible}
            onToggleSection={toggleSection}
            onCopyPath={copyPath}
            copiedPath={copiedPath}
            onFieldClick={onFieldClick}
            changes={diff.changes}
          />
        )}
      </div>
    </GlassPanel>
  );
}

/**
 * Unified diff view (single column)
 */
function UnifiedDiffView({
  sections,
  collapsedSections,
  collapsible,
  onToggleSection,
  onCopyPath,
  copiedPath,
  onFieldClick,
  changes,
}: {
  sections: FormattedDiffSection[];
  collapsedSections: Set<string>;
  collapsible: boolean;
  onToggleSection: (path: string) => void;
  onCopyPath: (path: string) => void;
  copiedPath: string | null;
  onFieldClick?: (change: FieldChange) => void;
  changes: FieldChange[];
}) {
  return (
    <div className="divide-y divide-glass-border">
      {sections.map((section) => {
        const isCollapsed = collapsedSections.has(section.path);

        return (
          <div key={section.path}>
            {/* Section header */}
            <button
              onClick={() => onToggleSection(section.path)}
              disabled={!collapsible}
              className={`
                w-full px-4 py-2 flex items-center gap-2 text-sm font-medium
                ${collapsible ? "hover:bg-glass-bg/50 cursor-pointer" : ""}
              `}
            >
              {collapsible && (
                isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )
              )}
              <span className="text-primary">{section.path}</span>
              <Badge variant="secondary" className="ml-auto">
                {section.changes.length} change{section.changes.length !== 1 ? "s" : ""}
              </Badge>
            </button>

            {/* Section changes */}
            {!isCollapsed && (
              <div className="bg-glass-bg/30">
                {section.changes.map((change) => {
                  const Icon = getChangeTypeIcon(change.type);
                  const colorClass = getChangeTypeColor(change.type);
                  const fullChange = changes.find((c) => c.path === change.path);

                  return (
                    <div
                      key={change.path}
                      className={`
                        px-4 py-2 flex items-start gap-3 border-l-2 hover:bg-glass-bg/50
                        ${change.type === "added" ? "border-l-green-500" : ""}
                        ${change.type === "deleted" ? "border-l-red-500" : ""}
                        ${change.type === "modified" ? "border-l-yellow-500" : ""}
                        ${onFieldClick ? "cursor-pointer" : ""}
                      `}
                      onClick={() => fullChange && onFieldClick?.(fullChange)}
                    >
                      <div className={`p-1 rounded ${colorClass}`}>
                        <Icon className="w-3 h-3" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono">
                            {change.shortPath || change.path}
                          </code>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCopyPath(change.path);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {copiedPath === change.path ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3 text-muted-foreground" />
                            )}
                          </button>
                        </div>

                        <div className="mt-1 text-xs">
                          {change.type === "added" && (
                            <span className="text-green-500">
                              → {change.newValue}
                            </span>
                          )}
                          {change.type === "deleted" && (
                            <span className="text-red-500 line-through">
                              {change.oldValue}
                            </span>
                          )}
                          {change.type === "modified" && (
                            <div className="space-y-0.5">
                              <div className="text-red-500 line-through">
                                {change.oldValue}
                              </div>
                              <div className="text-green-500">
                                → {change.newValue}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-xs ${colorClass} border-current`}
                      >
                        {formatChangeType(change.type)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Side-by-side diff view (two columns)
 */
function SideBySideDiffView({
  sections,
  collapsedSections,
  collapsible,
  onToggleSection,
  onCopyPath,
  copiedPath,
  onFieldClick,
  changes,
}: {
  sections: FormattedDiffSection[];
  collapsedSections: Set<string>;
  collapsible: boolean;
  onToggleSection: (path: string) => void;
  onCopyPath: (path: string) => void;
  copiedPath: string | null;
  onFieldClick?: (change: FieldChange) => void;
  changes: FieldChange[];
}) {
  return (
    <div>
      {/* Column headers */}
      <div className="grid grid-cols-2 gap-px bg-glass-border sticky top-0">
        <div className="bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500">
          Before
        </div>
        <div className="bg-green-500/10 px-4 py-2 text-sm font-medium text-green-500">
          After
        </div>
      </div>

      {/* Sections */}
      <div className="divide-y divide-glass-border">
        {sections.map((section) => {
          const isCollapsed = collapsedSections.has(section.path);

          return (
            <div key={section.path}>
              {/* Section header */}
              <button
                onClick={() => onToggleSection(section.path)}
                disabled={!collapsible}
                className={`
                  w-full px-4 py-2 flex items-center gap-2 text-sm font-medium bg-glass-bg/50
                  ${collapsible ? "hover:bg-glass-bg cursor-pointer" : ""}
                `}
              >
                {collapsible && (
                  isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )
                )}
                <span className="text-primary">{section.path}</span>
              </button>

              {/* Section changes */}
              {!isCollapsed && (
                <div>
                  {section.changes.map((change) => {
                    const fullChange = changes.find((c) => c.path === change.path);

                    return (
                      <div
                        key={change.path}
                        className={`
                          grid grid-cols-2 gap-px bg-glass-border
                          ${onFieldClick ? "cursor-pointer" : ""}
                        `}
                        onClick={() => fullChange && onFieldClick?.(fullChange)}
                      >
                        {/* Old value column */}
                        <div
                          className={`
                            px-4 py-2 text-xs font-mono bg-background
                            ${change.type === "deleted" || change.type === "modified" ? "bg-red-500/5" : ""}
                          `}
                        >
                          <div className="text-muted-foreground text-xs mb-1">
                            {change.shortPath}
                          </div>
                          {(change.type === "deleted" || change.type === "modified") && (
                            <span className="text-red-500">{change.oldValue}</span>
                          )}
                          {change.type === "added" && (
                            <span className="text-muted-foreground italic">—</span>
                          )}
                        </div>

                        {/* New value column */}
                        <div
                          className={`
                            px-4 py-2 text-xs font-mono bg-background
                            ${change.type === "added" || change.type === "modified" ? "bg-green-500/5" : ""}
                          `}
                        >
                          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                            <span>{change.shortPath}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onCopyPath(change.path);
                              }}
                              className="opacity-50 hover:opacity-100"
                            >
                              {copiedPath === change.path ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          {(change.type === "added" || change.type === "modified") && (
                            <span className="text-green-500">{change.newValue}</span>
                          )}
                          {change.type === "deleted" && (
                            <span className="text-muted-foreground italic">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
