"use client";

/**
 * Bulk Operations Panel Component
 *
 * UI for creating material variants, tier sets, and mob packs in bulk.
 * Shows progress and preview before generating.
 */

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  createMaterialVariants,
  createTierSet,
  createMobPack,
  createAllMobsForTier,
  getAvailableMaterials,
  getAvailableMobTiers,
  estimateItemCount,
  estimateMobCount,
  type BulkOperationResult,
  type BulkProgressCallback,
  type BaseAsset,
} from "@/lib/bulk/bulk-operations";
import {
  MATERIAL_TIERS,
  MOB_TIERS,
  MOB_TEMPLATES,
  WEAPON_TEMPLATES,
  ARMOR_TEMPLATES,
  TOOL_TEMPLATES,
  type MaterialTierId,
  type MobTierId,
  type GeneratedItem,
  type GeneratedMob,
} from "@/lib/templates/asset-templates";
import { logger } from "@/lib/utils";

const log = logger.child("BulkOperationsPanel");

// =============================================================================
// TYPES
// =============================================================================

interface BulkOperationsPanelProps {
  selectedAsset?: BaseAsset;
  onOperationComplete?: (result: BulkOperationResult) => void;
  onItemsGenerated?: (items: GeneratedItem[]) => void;
  onMobsGenerated?: (mobs: GeneratedMob[]) => void;
  className?: string;
}

type OperationType = "material_variants" | "tier_set" | "mob_pack" | "all_mobs";

interface ProgressState {
  current: number;
  total: number;
  currentItem: string;
  phase: "preparing" | "generating" | "complete";
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BulkOperationsPanel({
  selectedAsset,
  onOperationComplete,
  onItemsGenerated,
  onMobsGenerated,
  className,
}: BulkOperationsPanelProps) {
  const [operationType, setOperationType] = useState<OperationType>("tier_set");
  const [selectedMaterials, setSelectedMaterials] = useState<MaterialTierId[]>(["bronze", "steel", "mithril"]);
  const [selectedCategories, setSelectedCategories] = useState<("weapon" | "armor" | "tool")[]>(["weapon", "armor"]);
  const [selectedMobTemplate, setSelectedMobTemplate] = useState<string>("goblin");
  const [selectedMobTiers, setSelectedMobTiers] = useState<MobTierId[]>(["weak", "medium", "boss"]);
  const [selectedSingleMobTier, setSelectedSingleMobTier] = useState<MobTierId>("weak");
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [lastResult, setLastResult] = useState<BulkOperationResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("sword");

  const materials = getAvailableMaterials();
  const mobTiers = getAvailableMobTiers();
  const mobTemplates = Object.entries(MOB_TEMPLATES);

  /**
   * Toggle material selection
   */
  const handleToggleMaterial = useCallback((materialId: MaterialTierId) => {
    setSelectedMaterials((prev) =>
      prev.includes(materialId)
        ? prev.filter((m) => m !== materialId)
        : [...prev, materialId]
    );
  }, []);

  /**
   * Toggle category selection
   */
  const handleToggleCategory = useCallback((category: "weapon" | "armor" | "tool") => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  }, []);

  /**
   * Toggle mob tier selection
   */
  const handleToggleMobTier = useCallback((tierId: MobTierId) => {
    setSelectedMobTiers((prev) =>
      prev.includes(tierId)
        ? prev.filter((t) => t !== tierId)
        : [...prev, tierId]
    );
  }, []);

  /**
   * Progress callback
   */
  const handleProgress: BulkProgressCallback = useCallback((progressData) => {
    setProgress(progressData);
  }, []);

  /**
   * Run the bulk operation
   */
  const handleRunOperation = useCallback(async () => {
    setIsRunning(true);
    setProgress(null);
    setLastResult(null);

    try {
      let result: BulkOperationResult;

      switch (operationType) {
        case "material_variants":
          if (!selectedAsset) {
            log.warn("No asset selected for material variants");
            return;
          }
          result = await createMaterialVariants(selectedAsset, selectedMaterials, handleProgress);
          break;

        case "tier_set":
          result = await createTierSet(selectedCategories, selectedMaterials, handleProgress);
          break;

        case "mob_pack":
          result = await createMobPack(selectedMobTemplate, selectedMobTiers, handleProgress);
          break;

        case "all_mobs":
          result = await createAllMobsForTier(selectedSingleMobTier, handleProgress);
          break;

        default:
          log.warn("Unknown operation type", { operationType });
          return;
      }

      setLastResult(result);
      onOperationComplete?.(result);

      if (result.items.length > 0) {
        onItemsGenerated?.(result.items);
      }
      if (result.mobs.length > 0) {
        onMobsGenerated?.(result.mobs);
      }

      log.info("Bulk operation completed", {
        operationType,
        itemCount: result.items.length,
        mobCount: result.mobs.length,
        errorCount: result.errors.length,
      });
    } catch (error) {
      log.error("Bulk operation failed", { error });
    } finally {
      setIsRunning(false);
    }
  }, [
    operationType,
    selectedAsset,
    selectedMaterials,
    selectedCategories,
    selectedMobTemplate,
    selectedMobTiers,
    selectedSingleMobTier,
    handleProgress,
    onOperationComplete,
    onItemsGenerated,
    onMobsGenerated,
  ]);

  /**
   * Get estimated count for current selection
   */
  const getEstimatedCount = useCallback(() => {
    switch (operationType) {
      case "material_variants":
        return selectedMaterials.length;
      case "tier_set":
        return estimateItemCount(selectedCategories, selectedMaterials);
      case "mob_pack":
        return selectedMobTiers.length;
      case "all_mobs":
        return estimateMobCount([selectedSingleMobTier]);
      default:
        return 0;
    }
  }, [operationType, selectedMaterials, selectedCategories, selectedMobTiers, selectedSingleMobTier]);

  return (
    <div className={cn("flex flex-col gap-6 p-6 bg-gray-900 rounded-lg", className)}>
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">Bulk Operations</h2>
        <p className="text-sm text-gray-400">
          Create multiple assets at once with automatic stat scaling
        </p>
      </div>

      {/* Operation Type Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">
          Operation Type
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <OperationTypeButton
            id="material_variants"
            label="Material Variants"
            description="Create bronze/steel/mithril variants of an item"
            icon="🔄"
            isSelected={operationType === "material_variants"}
            onClick={() => setOperationType("material_variants")}
            disabled={!selectedAsset}
          />
          <OperationTypeButton
            id="tier_set"
            label="Tier Set"
            description="Create all weapons/armor for selected materials"
            icon="⚔️"
            isSelected={operationType === "tier_set"}
            onClick={() => setOperationType("tier_set")}
          />
          <OperationTypeButton
            id="mob_pack"
            label="Mob Pack"
            description="Create weak/medium/boss variants of a mob"
            icon="👹"
            isSelected={operationType === "mob_pack"}
            onClick={() => setOperationType("mob_pack")}
          />
          <OperationTypeButton
            id="all_mobs"
            label="All Mobs (Tier)"
            description="Create all mob types at a specific tier"
            icon="🎭"
            isSelected={operationType === "all_mobs"}
            onClick={() => setOperationType("all_mobs")}
          />
        </div>
      </div>

      {/* Operation-specific Options */}
      <div className="space-y-4">
        {/* Material Selection (for material_variants and tier_set) */}
        {(operationType === "material_variants" || operationType === "tier_set") && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">
              Materials
            </h3>
            <div className="flex flex-wrap gap-2">
              {materials.map((materialId) => {
                const tier = MATERIAL_TIERS[materialId];
                return (
                  <button
                    key={materialId}
                    onClick={() => handleToggleMaterial(materialId)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      selectedMaterials.includes(materialId)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    )}
                    style={{ borderLeft: `4px solid ${tier.color}` }}
                  >
                    {tier.name}
                    <span className="ml-2 text-xs opacity-70">Lv.{tier.level}+</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Selection (for tier_set) */}
        {operationType === "tier_set" && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">
              Categories
            </h3>
            <div className="flex flex-wrap gap-2">
              <CategoryButton
                id="weapon"
                label="Weapons"
                icon="⚔️"
                isSelected={selectedCategories.includes("weapon")}
                onClick={() => handleToggleCategory("weapon")}
              />
              <CategoryButton
                id="armor"
                label="Armor"
                icon="🛡️"
                isSelected={selectedCategories.includes("armor")}
                onClick={() => handleToggleCategory("armor")}
              />
              <CategoryButton
                id="tool"
                label="Tools"
                icon="🔧"
                isSelected={selectedCategories.includes("tool")}
                onClick={() => handleToggleCategory("tool")}
              />
            </div>
          </div>
        )}

        {/* Mob Template Selection (for mob_pack) */}
        {operationType === "mob_pack" && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">
              Mob Type
            </h3>
            <select
              value={selectedMobTemplate}
              onChange={(e) => setSelectedMobTemplate(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {mobTemplates.map(([id, template]) => (
                <option key={id} value={id}>
                  {template.baseName} - {template.description}
                </option>
              ))}
            </select>

            <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider mt-4">
              Tiers to Create
            </h3>
            <div className="flex flex-wrap gap-2">
              {mobTiers.map((tierId) => {
                const tier = MOB_TIERS[tierId];
                return (
                  <button
                    key={tierId}
                    onClick={() => handleToggleMobTier(tierId)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      selectedMobTiers.includes(tierId)
                        ? "bg-purple-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    )}
                  >
                    {tier.name}
                    <span className="ml-2 text-xs opacity-70">×{tier.statMultiplier}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Mob Tier Selection (for all_mobs) */}
        {operationType === "all_mobs" && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">
              Select Tier
            </h3>
            <div className="flex flex-wrap gap-2">
              {mobTiers.map((tierId) => {
                const tier = MOB_TIERS[tierId];
                return (
                  <button
                    key={tierId}
                    onClick={() => setSelectedSingleMobTier(tierId)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                      selectedSingleMobTier === tierId
                        ? "bg-purple-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    )}
                  >
                    {tier.name}
                    <span className="ml-2 text-xs opacity-70">×{tier.statMultiplier}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-gray-500">
              Will create {estimateMobCount([selectedSingleMobTier])} mobs ({mobTemplates.length} types)
            </p>
          </div>
        )}

        {/* Template Selector for Tier Set */}
        {operationType === "tier_set" && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">
              Preview Template
            </h3>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <optgroup label="Weapons">
                {Object.entries(WEAPON_TEMPLATES).map(([id, template]) => (
                  <option key={id} value={id}>
                    {template.baseName}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Armor">
                {Object.entries(ARMOR_TEMPLATES).map(([id, template]) => (
                  <option key={id} value={id}>
                    {template.baseName}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Tools">
                {Object.entries(TOOL_TEMPLATES).map(([id, template]) => (
                  <option key={id} value={id}>
                    {template.baseName}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        )}
      </div>

      {/* Preview Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <span>{showPreview ? "▼" : "▶"}</span>
          <span>Preview Variants</span>
        </button>
      </div>

      {/* Variant Preview Grid */}
      {showPreview && (operationType === "tier_set" || operationType === "material_variants") && (
        <VariantPreviewGrid
          materials={selectedMaterials}
          templateId={selectedTemplate}
          baseAsset={selectedAsset}
        />
      )}

      {/* Stat Scaling Preview Table */}
      {showPreview && (operationType === "tier_set" || operationType === "material_variants") && (
        <StatScalingPreview
          materials={selectedMaterials}
          templateId={selectedTemplate}
          baseAsset={selectedAsset}
        />
      )}

      {/* Progress Indicator */}
      {progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">{progress.currentItem}</span>
            <span className="text-gray-500">
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                progress.phase === "complete" ? "bg-green-500" : "bg-blue-500"
              )}
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Result Summary */}
      {lastResult && !isRunning && (
        <div className={cn(
          "p-4 rounded-lg",
          lastResult.success ? "bg-green-900/30 border border-green-800" : "bg-red-900/30 border border-red-800"
        )}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{lastResult.success ? "✅" : "⚠️"}</span>
            <div>
              <p className="font-medium text-white">
                {lastResult.success ? "Operation Complete" : "Completed with Errors"}
              </p>
              <p className="text-sm text-gray-400">
                Created {lastResult.summary.itemsCreated} items, {lastResult.summary.mobsCreated} mobs
                in {(lastResult.summary.duration / 1000).toFixed(1)}s
              </p>
            </div>
          </div>

          {lastResult.errors.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-sm font-medium text-red-400">Errors:</p>
              {lastResult.errors.map((error, idx) => (
                <p key={idx} className="text-xs text-red-300">{error}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Run Button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          Estimated: <span className="text-white font-medium">{getEstimatedCount()}</span> assets
        </div>
        <button
          onClick={handleRunOperation}
          disabled={isRunning || getEstimatedCount() === 0}
          className={cn(
            "px-6 py-2 rounded-lg font-medium transition-all",
            !isRunning && getEstimatedCount() > 0
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-gray-800 text-gray-500 cursor-not-allowed"
          )}
        >
          {isRunning ? (
            <span className="flex items-center gap-2">
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
              Generating...
            </span>
          ) : (
            `Generate ${getEstimatedCount()} Assets`
          )}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface OperationTypeButtonProps {
  id: string;
  label: string;
  description: string;
  icon: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function OperationTypeButton({
  label,
  description,
  icon,
  isSelected,
  onClick,
  disabled,
}: OperationTypeButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "p-4 rounded-lg border-2 text-left transition-all",
        disabled
          ? "border-gray-800 bg-gray-900 opacity-50 cursor-not-allowed"
          : isSelected
          ? "border-blue-500 bg-blue-500/10"
          : "border-gray-700 bg-gray-800 hover:border-gray-600"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h4 className="font-medium text-white">{label}</h4>
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        </div>
      </div>
    </button>
  );
}

interface CategoryButtonProps {
  id: string;
  label: string;
  icon: string;
  isSelected: boolean;
  onClick: () => void;
}

function CategoryButton({ label, icon, isSelected, onClick }: CategoryButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
        isSelected
          ? "bg-blue-600 text-white"
          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
      )}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}

// =============================================================================
// VARIANT PREVIEW GRID
// =============================================================================

interface VariantPreviewGridProps {
  materials: MaterialTierId[];
  templateId: string;
  baseAsset?: BaseAsset;
}

function VariantPreviewGrid({ materials, templateId, baseAsset }: VariantPreviewGridProps) {
  const template = WEAPON_TEMPLATES[templateId] || ARMOR_TEMPLATES[templateId] || TOOL_TEMPLATES[templateId];

  if (!template && !baseAsset) {
    return null;
  }

  const baseName = template?.baseName || baseAsset?.name || "Item";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">
        Variants to Create ({materials.length})
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {materials.map((materialId) => {
          const tier = MATERIAL_TIERS[materialId];
          const itemId = `${materialId}_${templateId || baseAsset?.id || "item"}`;
          const itemName = `${tier.name} ${baseName}`;

          return (
            <div
              key={materialId}
              className="p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
              style={{ borderLeftWidth: "4px", borderLeftColor: tier.color }}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tier.color }}
                />
                <span className="text-sm font-medium text-white truncate">
                  {itemName}
                </span>
              </div>
              <div className="text-xs text-gray-500 space-y-0.5">
                <div>ID: <code className="text-gray-400">{itemId}</code></div>
                <div>Level: {tier.level}+</div>
                <div className="flex items-center gap-1">
                  <span>Rarity:</span>
                  <span className={cn(
                    "capitalize",
                    tier.rarity === "common" && "text-gray-400",
                    tier.rarity === "uncommon" && "text-green-400",
                    tier.rarity === "rare" && "text-blue-400",
                    tier.rarity === "epic" && "text-purple-400",
                    tier.rarity === "legendary" && "text-orange-400"
                  )}>
                    {tier.rarity}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// STAT SCALING PREVIEW
// =============================================================================

interface StatScalingPreviewProps {
  materials: MaterialTierId[];
  templateId: string;
  baseAsset?: BaseAsset;
}

function StatScalingPreview({ materials, templateId, baseAsset }: StatScalingPreviewProps) {
  const template = WEAPON_TEMPLATES[templateId] || ARMOR_TEMPLATES[templateId] || TOOL_TEMPLATES[templateId];

  if (!template && !baseAsset) {
    return null;
  }

  const baseStats = template?.baseStats || {
    attack: baseAsset?.bonuses?.attack ?? 0,
    defense: baseAsset?.bonuses?.defense ?? 0,
    strength: baseAsset?.bonuses?.strength ?? 0,
  };

  // Sort materials by level
  const sortedMaterials = [...materials].sort(
    (a, b) => MATERIAL_TIERS[a].level - MATERIAL_TIERS[b].level
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">
        Stat Scaling Preview
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-2 px-3 text-gray-400 font-medium">Material</th>
              <th className="text-center py-2 px-3 text-gray-400 font-medium">Level</th>
              <th className="text-center py-2 px-3 text-gray-400 font-medium">
                <span className="text-red-400">⚔️</span> Atk
              </th>
              <th className="text-center py-2 px-3 text-gray-400 font-medium">
                <span className="text-orange-400">💪</span> Str
              </th>
              <th className="text-center py-2 px-3 text-gray-400 font-medium">
                <span className="text-blue-400">🛡️</span> Def
              </th>
              <th className="text-center py-2 px-3 text-gray-400 font-medium">
                <span className="text-yellow-400">💰</span> Value
              </th>
              <th className="text-center py-2 px-3 text-gray-400 font-medium">Multiplier</th>
            </tr>
          </thead>
          <tbody>
            {sortedMaterials.map((materialId, index) => {
              const tier = MATERIAL_TIERS[materialId];
              const attack = Math.round((baseStats.attack || 0) * tier.statMultiplier);
              const strength = Math.round((baseStats.strength || 0) * tier.statMultiplier);
              const defense = Math.round((baseStats.defense || 0) * tier.statMultiplier);
              const value = Math.round(100 * tier.valueMultiplier);

              // Calculate change from previous tier
              const prevTier = index > 0 ? MATERIAL_TIERS[sortedMaterials[index - 1]] : null;
              const prevAttack = prevTier ? Math.round((baseStats.attack || 0) * prevTier.statMultiplier) : 0;

              return (
                <tr
                  key={materialId}
                  className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tier.color }}
                      />
                      <span className="font-medium text-white">{tier.name}</span>
                    </div>
                  </td>
                  <td className="text-center py-2 px-3 text-gray-300">{tier.level}</td>
                  <td className="text-center py-2 px-3">
                    <span className="text-red-400">{attack}</span>
                    {index > 0 && attack > prevAttack && (
                      <span className="text-green-500 text-xs ml-1">+{attack - prevAttack}</span>
                    )}
                  </td>
                  <td className="text-center py-2 px-3">
                    <span className="text-orange-400">{strength}</span>
                  </td>
                  <td className="text-center py-2 px-3">
                    <span className="text-blue-400">{defense}</span>
                  </td>
                  <td className="text-center py-2 px-3">
                    <span className="text-yellow-400">{value.toLocaleString()}</span>
                  </td>
                  <td className="text-center py-2 px-3">
                    <span className="text-gray-400">×{tier.statMultiplier}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Base Stats Reference */}
      <div className="text-xs text-gray-500 mt-2">
        Base stats (Bronze): Attack {baseStats.attack || 0}, Strength {baseStats.strength || 0}, Defense {baseStats.defense || 0}
      </div>
    </div>
  );
}

export default BulkOperationsPanel;
