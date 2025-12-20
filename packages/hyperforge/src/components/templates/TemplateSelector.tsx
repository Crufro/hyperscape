"use client";

/**
 * Template Selector Component
 *
 * Grid of available templates with previews for creating asset sets.
 * Supports tier sets, mob packs, asset bundles, and one-click creation.
 */

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  TIER_SET_TEMPLATES,
  MOB_PACK_TEMPLATES,
  ASSET_BUNDLE_TEMPLATES,
  MATERIAL_TIERS,
  applyTierSetTemplate,
  applyMobPackTemplate,
  applyAssetBundleTemplate,
  type MaterialTierId,
  type TierSetTemplate,
  type MobPackTemplate,
  type AssetBundleTemplate,
  type TemplateResult,
} from "@/lib/templates/asset-templates";
import { logger } from "@/lib/utils";

const log = logger.child("TemplateSelector");

// =============================================================================
// TYPES
// =============================================================================

interface TemplateSelectorProps {
  onTemplateApply?: (result: TemplateResult) => void;
  onClose?: () => void;
  className?: string;
  /** If true, saves assets to manifests via API */
  saveToManifests?: boolean;
}

type TemplateType = "tier_set" | "mob_pack" | "asset_bundle";

interface SelectedTemplate {
  type: TemplateType;
  id: string;
}

interface CreationProgress {
  current: number;
  total: number;
  currentAsset: string;
  status: "idle" | "creating" | "saving" | "complete" | "error";
  error?: string;
  createdAssetIds: string[];
}

// =============================================================================
// COMPONENT
// =============================================================================

export function TemplateSelector({
  onTemplateApply,
  onClose,
  className,
  saveToManifests = false,
}: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<SelectedTemplate | null>(null);
  const [selectedMaterials, setSelectedMaterials] = useState<MaterialTierId[]>(["bronze", "steel", "mithril"]);
  const [isApplying, setIsApplying] = useState(false);
  const [previewResult, setPreviewResult] = useState<TemplateResult | null>(null);
  const [progress, setProgress] = useState<CreationProgress>({
    current: 0,
    total: 0,
    currentAsset: "",
    status: "idle",
    createdAssetIds: [],
  });
  const [activeTab, setActiveTab] = useState<"bundles" | "tier_sets" | "mob_packs">("bundles");

  const tierSetTemplates = Object.values(TIER_SET_TEMPLATES);
  const mobPackTemplates = Object.values(MOB_PACK_TEMPLATES);
  const assetBundleTemplates = Object.values(ASSET_BUNDLE_TEMPLATES);
  const materials = Object.entries(MATERIAL_TIERS);

  /**
   * Handle template selection
   */
  const handleSelectTemplate = useCallback((type: TemplateType, id: string) => {
    const newSelection = { type, id };
    setSelectedTemplate(newSelection);

    // Generate preview based on template type
    if (type === "tier_set") {
      const result = applyTierSetTemplate(id, selectedMaterials);
      setPreviewResult(result);
    } else if (type === "mob_pack") {
      const result = applyMobPackTemplate(id);
      setPreviewResult(result);
    } else if (type === "asset_bundle") {
      const result = applyAssetBundleTemplate(id);
      setPreviewResult(result);
    }

    log.debug("Template selected", { type, id });
  }, [selectedMaterials]);

  /**
   * Handle material toggle
   */
  const handleToggleMaterial = useCallback((materialId: MaterialTierId) => {
    setSelectedMaterials((prev) => {
      const newMaterials = prev.includes(materialId)
        ? prev.filter((m) => m !== materialId)
        : [...prev, materialId];

      // Update preview if a tier set is selected
      if (selectedTemplate?.type === "tier_set") {
        const result = applyTierSetTemplate(selectedTemplate.id, newMaterials);
        setPreviewResult(result);
      }

      return newMaterials;
    });
  }, [selectedTemplate]);

  /**
   * Apply the selected template via API
   */
  const handleApplyTemplate = useCallback(async () => {
    if (!selectedTemplate || !previewResult) return;

    setIsApplying(true);
    setProgress({
      current: 0,
      total: previewResult.summary.itemCount + previewResult.summary.mobCount + previewResult.summary.npcCount,
      currentAsset: "Preparing...",
      status: "creating",
      createdAssetIds: [],
    });

    try {
      log.info("Applying template", {
        type: selectedTemplate.type,
        id: selectedTemplate.id,
        itemCount: previewResult.items.length,
        mobCount: previewResult.mobs.length,
        npcCount: previewResult.npcs.length,
        saveToManifests,
      });

      // If saveToManifests is enabled, send to API
      if (saveToManifests) {
        setProgress((prev) => ({ ...prev, status: "saving", currentAsset: "Saving to manifests..." }));

        const response = await fetch("/api/templates/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: selectedTemplate.id,
            templateType: selectedTemplate.type,
            materials: selectedTemplate.type === "tier_set" ? selectedMaterials : undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create assets");
        }

        const result = await response.json();
        
        setProgress({
          current: result.createdAssetIds.length,
          total: result.createdAssetIds.length,
          currentAsset: "Complete!",
          status: "complete",
          createdAssetIds: result.createdAssetIds,
        });

        log.info("Template applied via API", {
          createdCount: result.createdAssetIds.length,
        });
      } else {
        // Just pass the preview result to the callback
        setProgress((prev) => ({ ...prev, status: "complete", currentAsset: "Complete!" }));
      }

      onTemplateApply?.(previewResult);

      // Auto-close after a brief delay on success
      setTimeout(() => {
        onClose?.();
      }, 1500);
    } catch (error) {
      log.error("Template application failed", { error });
      setProgress((prev) => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    } finally {
      setIsApplying(false);
    }
  }, [selectedTemplate, previewResult, selectedMaterials, saveToManifests, onTemplateApply, onClose]);

  /**
   * Get the total asset count from preview
   */
  const getTotalAssetCount = useCallback(() => {
    if (!previewResult) return 0;
    return previewResult.summary.itemCount + previewResult.summary.mobCount + previewResult.summary.npcCount;
  }, [previewResult]);

  return (
    <div className={cn("flex flex-col gap-6 p-6 bg-gray-900 rounded-lg max-w-4xl", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Asset Templates</h2>
          <p className="text-sm text-gray-400">
            One-click creation of related asset bundles
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        <button
          onClick={() => setActiveTab("bundles")}
          className={cn(
            "px-4 py-2 rounded-t-lg text-sm font-medium transition-all",
            activeTab === "bundles"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          )}
        >
          Quick Bundles
        </button>
        <button
          onClick={() => setActiveTab("tier_sets")}
          className={cn(
            "px-4 py-2 rounded-t-lg text-sm font-medium transition-all",
            activeTab === "tier_sets"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          )}
        >
          Item Sets
        </button>
        <button
          onClick={() => setActiveTab("mob_packs")}
          className={cn(
            "px-4 py-2 rounded-t-lg text-sm font-medium transition-all",
            activeTab === "mob_packs"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-800"
          )}
        >
          Mob Packs
        </button>
      </div>

      {/* Template Grid - Asset Bundles (Quick Bundles) */}
      {activeTab === "bundles" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {assetBundleTemplates.map((template) => (
            <BundleCard
              key={template.id}
              template={template}
              isSelected={selectedTemplate?.type === "asset_bundle" && selectedTemplate.id === template.id}
              onSelect={() => handleSelectTemplate("asset_bundle", template.id)}
            />
          ))}
        </div>
      )}

      {/* Template Grid - Tier Sets */}
      {activeTab === "tier_sets" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tierSetTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                type="tier_set"
                isSelected={selectedTemplate?.type === "tier_set" && selectedTemplate.id === template.id}
                onSelect={() => handleSelectTemplate("tier_set", template.id)}
              />
            ))}
          </div>

          {/* Material Selection (only for tier sets) */}
          {selectedTemplate?.type === "tier_set" && (
            <div className="space-y-3 bg-gray-800/50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">
                Select Material Tiers
              </h3>
              <div className="flex flex-wrap gap-2">
                {materials.map(([id, tier]) => (
                  <button
                    key={id}
                    onClick={() => handleToggleMaterial(id as MaterialTierId)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      selectedMaterials.includes(id as MaterialTierId)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    )}
                    style={{
                      borderLeft: `4px solid ${tier.color}`,
                    }}
                  >
                    {tier.name}
                    <span className="ml-2 text-xs opacity-70">Lv.{tier.level}+</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Template Grid - Mob Packs */}
      {activeTab === "mob_packs" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mobPackTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              type="mob_pack"
              isSelected={selectedTemplate?.type === "mob_pack" && selectedTemplate.id === template.id}
              onSelect={() => handleSelectTemplate("mob_pack", template.id)}
            />
          ))}
        </div>
      )}

      {/* Preview */}
      {previewResult && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">
            Preview ({getTotalAssetCount()} assets)
          </h3>
          <div className="bg-gray-800 rounded-lg p-4">
            {/* Summary Icons */}
            <div className="flex items-center gap-6 mb-4">
              {previewResult.summary.itemCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚔️</span>
                  <div>
                    <p className="text-white font-medium">
                      {previewResult.summary.itemCount} Items
                    </p>
                    {previewResult.summary.materials.length > 0 && (
                      <p className="text-xs text-gray-400">
                        {previewResult.summary.materials.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {previewResult.summary.mobCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👹</span>
                  <div>
                    <p className="text-white font-medium">
                      {previewResult.summary.mobCount} Mobs
                    </p>
                    <p className="text-xs text-gray-400">Combat entities</p>
                  </div>
                </div>
              )}
              {previewResult.summary.npcCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👤</span>
                  <div>
                    <p className="text-white font-medium">
                      {previewResult.summary.npcCount} NPCs
                    </p>
                    <p className="text-xs text-gray-400">Town characters</p>
                  </div>
                </div>
              )}
            </div>

            {/* Asset Lists */}
            <div className="max-h-48 overflow-y-auto space-y-1">
              {/* Item List */}
              {previewResult.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-2 py-1 bg-gray-900/50 rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">⚔️</span>
                    <span className="text-gray-300">{item.name}</span>
                  </div>
                  <span className="text-gray-500 text-xs font-mono">{item.id}</span>
                </div>
              ))}

              {/* Mob List */}
              {previewResult.mobs.map((mob) => (
                <div
                  key={mob.id}
                  className="flex items-center justify-between px-2 py-1 bg-gray-900/50 rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-red-400">👹</span>
                    <span className="text-gray-300">{mob.name}</span>
                  </div>
                  <span className="text-gray-500 text-xs">Lv.{mob.stats.level}</span>
                </div>
              ))}

              {/* NPC List */}
              {previewResult.npcs.map((npc) => (
                <div
                  key={npc.id}
                  className="flex items-center justify-between px-2 py-1 bg-gray-900/50 rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">👤</span>
                    <span className="text-gray-300">{npc.name}</span>
                  </div>
                  <span className="text-gray-500 text-xs font-mono">{npc.id}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      {progress.status !== "idle" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">{progress.currentAsset}</span>
            <span className="text-gray-500">
              {progress.current}/{progress.total}
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                progress.status === "error" ? "bg-red-500" :
                progress.status === "complete" ? "bg-green-500" : "bg-blue-500"
              )}
              style={{
                width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
          {progress.status === "error" && (
            <p className="text-red-400 text-sm">{progress.error}</p>
          )}
          {progress.status === "complete" && (
            <p className="text-green-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Successfully created {progress.createdAssetIds.length} assets!
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          {saveToManifests ? "Assets will be saved to game manifests" : "Preview only - assets not saved"}
        </div>
        <div className="flex gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              disabled={isApplying}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleApplyTemplate}
            disabled={!selectedTemplate || isApplying || progress.status === "complete"}
            className={cn(
              "px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2",
              selectedTemplate && !isApplying && progress.status !== "complete"
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            )}
          >
            {isApplying ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Creating...
              </>
            ) : progress.status === "complete" ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Done!
              </>
            ) : (
              `Create All${previewResult ? ` (${getTotalAssetCount()})` : ""}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// BUNDLE CARD COMPONENT (for Asset Bundles)
// =============================================================================

interface BundleCardProps {
  template: AssetBundleTemplate;
  isSelected: boolean;
  onSelect: () => void;
}

function BundleCard({ template, isSelected, onSelect }: BundleCardProps) {
  // Count assets by type
  const itemCount = template.assets.filter((a) => a.type === "item").length;
  const mobCount = template.assets.filter((a) => a.type === "mob").length;
  const npcCount = template.assets.filter((a) => a.type === "npc").length;

  // Get category color
  const getCategoryColor = (category: AssetBundleTemplate["category"]) => {
    switch (category) {
      case "weapons": return "border-l-yellow-500";
      case "armor": return "border-l-blue-500";
      case "npcs": return "border-l-green-500";
      case "mobs": return "border-l-red-500";
      case "resources": return "border-l-orange-500";
      case "mixed": return "border-l-purple-500";
      default: return "border-l-gray-500";
    }
  };

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left p-4 rounded-lg border-2 border-l-4 transition-all",
        getCategoryColor(template.category),
        isSelected
          ? "border-blue-500 bg-blue-500/10"
          : "border-gray-700 bg-gray-800 hover:border-gray-600"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{template.icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white">{template.name}</h4>
          <p className="text-sm text-gray-400 line-clamp-2">{template.description}</p>

          {/* Asset type badges */}
          <div className="mt-2 flex flex-wrap gap-1">
            {itemCount > 0 && (
              <span className="px-2 py-0.5 bg-yellow-900/50 text-yellow-400 rounded text-xs">
                {itemCount} items
              </span>
            )}
            {mobCount > 0 && (
              <span className="px-2 py-0.5 bg-red-900/50 text-red-400 rounded text-xs">
                {mobCount} mobs
              </span>
            )}
            {npcCount > 0 && (
              <span className="px-2 py-0.5 bg-green-900/50 text-green-400 rounded text-xs">
                {npcCount} NPCs
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// =============================================================================
// TEMPLATE CARD COMPONENT (for Tier Sets & Mob Packs)
// =============================================================================

interface TemplateCardProps {
  template: TierSetTemplate | MobPackTemplate;
  type: "tier_set" | "mob_pack";
  isSelected: boolean;
  onSelect: () => void;
}

function TemplateCard({ template, type, isSelected, onSelect }: TemplateCardProps) {
  const isTierSet = type === "tier_set";

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left p-4 rounded-lg border-2 transition-all",
        isSelected
          ? "border-blue-500 bg-blue-500/10"
          : "border-gray-700 bg-gray-800 hover:border-gray-600"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{template.icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white">{template.name}</h4>
          <p className="text-sm text-gray-400 truncate">{template.description}</p>

          {/* Show item count for tier sets */}
          {isTierSet && (
            <div className="mt-2 flex flex-wrap gap-1">
              {(template as TierSetTemplate).items.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-gray-900 rounded text-xs text-gray-400"
                >
                  {item.templateId}
                </span>
              ))}
            </div>
          )}

          {/* Show tier count for mob packs */}
          {!isTierSet && (
            <div className="mt-2 flex gap-1">
              {(template as MobPackTemplate).tiers.map((tier) => (
                <span
                  key={tier}
                  className="px-2 py-0.5 bg-gray-900 rounded text-xs text-gray-400"
                >
                  {tier}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export default TemplateSelector;
