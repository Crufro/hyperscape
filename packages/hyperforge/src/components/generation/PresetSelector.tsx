"use client";

/**
 * Preset Selector Component
 * Dropdown for selecting and managing generation presets
 */

import { useState, useCallback } from "react";
import {
  ChevronDown,
  Save,
  Trash2,
  Copy,
  Star,
  Search,
  Plus,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePresetStore, applyPreset, type GenerationPreset } from "@/stores/preset-store";
import type { AssetCategory } from "@/types/categories";
import type { GenerationConfig } from "./GenerationFormRouter";
import { SpectacularButton } from "@/components/ui/spectacular-button";

// =============================================================================
// TYPES
// =============================================================================

interface PresetSelectorProps {
  category: AssetCategory;
  currentConfig?: Partial<GenerationConfig>;
  onPresetSelect: (config: GenerationConfig) => void;
  onSavePreset?: (config: GenerationConfig) => void;
  className?: string;
}

interface SavePresetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string, tags?: string[]) => void;
}

// =============================================================================
// SAVE PRESET DIALOG
// =============================================================================

function SavePresetDialog({ isOpen, onClose, onSave }: SavePresetDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(
      name.trim(),
      description.trim() || undefined,
      tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    );
    setName("");
    setDescription("");
    setTags("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-glass-bg border border-glass-border rounded-xl p-6 w-96 space-y-4 shadow-xl">
        <h3 className="text-lg font-semibold">Save Preset</h3>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground block mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Custom Preset"
              className="w-full px-3 py-2 bg-glass-bg/50 border border-glass-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this preset is for..."
              className="w-full px-3 py-2 bg-glass-bg/50 border border-glass-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              rows={2}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground block mb-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="melee, starter, sword"
              className="w-full px-3 py-2 bg-glass-bg/50 border border-glass-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <SpectacularButton variant="outline" size="sm" onClick={onClose}>
            Cancel
          </SpectacularButton>
          <SpectacularButton
            size="sm"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </SpectacularButton>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PresetSelector({
  category,
  currentConfig,
  onPresetSelect,
  className,
}: PresetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    presets,
    selectedPresetId,
    selectPreset,
    addPreset,
    deletePreset,
    duplicatePreset,
  } = usePresetStore();

  // Filter presets for current category
  const categoryPresets = presets.filter((p) => p.category === category);

  // Apply search filter
  const filteredPresets = searchQuery
    ? categoryPresets.filter((p) => {
        const query = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.tags?.some((t) => t.toLowerCase().includes(query))
        );
      })
    : categoryPresets;

  // Get selected preset
  const selectedPreset = presets.find((p) => p.id === selectedPresetId);

  const handlePresetClick = useCallback(
    (preset: GenerationPreset) => {
      selectPreset(preset.id);
      const config = applyPreset(preset);
      onPresetSelect(config);
      setIsOpen(false);
    },
    [selectPreset, onPresetSelect]
  );

  const handleSavePreset = useCallback(
    (name: string, description?: string, tags?: string[]) => {
      if (!currentConfig) return;

      const { category: _cat, ...configWithoutCategory } = currentConfig as GenerationConfig;

      addPreset({
        name,
        description,
        category,
        config: {
          ...configWithoutCategory,
          prompt: configWithoutCategory.prompt || "",
          pipeline: configWithoutCategory.pipeline || "text-to-3d",
          quality: configWithoutCategory.quality || "medium",
          metadata: configWithoutCategory.metadata || {},
        },
        tags,
      });
    },
    [currentConfig, category, addPreset]
  );

  const handleDuplicate = useCallback(
    (preset: GenerationPreset, e: React.MouseEvent) => {
      e.stopPropagation();
      duplicatePreset(preset.id, `${preset.name} (Copy)`);
    },
    [duplicatePreset]
  );

  const handleDelete = useCallback(
    (preset: GenerationPreset, e: React.MouseEvent) => {
      e.stopPropagation();
      if (preset.isBuiltIn) return;
      deletePreset(preset.id);
    },
    [deletePreset]
  );

  return (
    <div className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all w-full",
          "bg-glass-bg/50 border-glass-border hover:border-primary/30",
          isOpen && "border-primary/50 ring-2 ring-primary/20"
        )}
      >
        <Star className="w-4 h-4 text-yellow-500" />
        <span className="flex-1 text-left truncate">
          {selectedPreset ? selectedPreset.name : "Select Preset..."}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-glass-bg border border-glass-border rounded-xl shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-glass-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search presets..."
                className="w-full pl-8 pr-3 py-1.5 bg-glass-bg/50 border border-glass-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
            </div>
          </div>

          {/* Preset List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredPresets.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchQuery
                  ? "No presets match your search"
                  : "No presets for this category"}
              </div>
            ) : (
              <div className="p-1">
                {filteredPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset)}
                    className={cn(
                      "w-full flex items-start gap-2 px-3 py-2 rounded-lg text-left transition-all group",
                      "hover:bg-glass-bg/80",
                      selectedPresetId === preset.id &&
                        "bg-primary/10 border border-primary/30"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {selectedPresetId === preset.id && (
                          <Check className="w-3 h-3 text-primary shrink-0" />
                        )}
                        <span className="font-medium text-sm truncate">
                          {preset.name}
                        </span>
                        {preset.isBuiltIn && (
                          <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                            Built-in
                          </span>
                        )}
                      </div>
                      {preset.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {preset.description}
                        </p>
                      )}
                      {preset.tags && preset.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {preset.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-1.5 py-0.5 bg-glass-bg rounded text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={(e) => handleDuplicate(preset, e)}
                        className="p-1 hover:bg-glass-bg rounded"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {!preset.isBuiltIn && (
                        <button
                          onClick={(e) => handleDelete(preset, e)}
                          className="p-1 hover:bg-destructive/20 hover:text-destructive rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-2 border-t border-glass-border flex gap-2">
            <SpectacularButton
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setIsOpen(false);
                setShowSaveDialog(true);
              }}
              disabled={!currentConfig}
            >
              <Plus className="w-4 h-4 mr-1" />
              Save Current
            </SpectacularButton>
          </div>
        </div>
      )}

      {/* Click Outside Handler */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Save Dialog */}
      <SavePresetDialog
        isOpen={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSavePreset}
      />
    </div>
  );
}
