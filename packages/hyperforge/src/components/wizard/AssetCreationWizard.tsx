"use client";

/**
 * Asset Creation Wizard
 *
 * A step-by-step guided workflow for creating game assets.
 * Walks developers through:
 * 1. Choose asset type
 * 2. Generate 3D model (or upload)
 * 3. Fill in game data (stats, drops, etc.)
 * 4. Link relationships (drops, stores, areas)
 * 5. Validate and export
 */

import { useState, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Box,
  Users,
  TreePine,
  Store,
  Music,
  Sparkles,
  Upload,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { AssetCompletenessPanel } from "@/components/assets/AssetCompletenessPanel";
import {
  useAssetCompleteness,
  useAssetSchema,
} from "@/hooks/useAssetCompleteness";
import { getSchemaDefaults, type AssetTypeSchema } from "@/lib/assets/asset-completeness";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  optional?: boolean;
}

export interface AssetCreationWizardProps {
  /** Initial asset type to create */
  initialType?: string;
  /** Callback when asset is created */
  onComplete?: (asset: Record<string, unknown>) => void;
  /** Callback when wizard is cancelled */
  onCancel?: () => void;
}

// =============================================================================
// WIZARD STEPS
// =============================================================================

const WIZARD_STEPS: WizardStep[] = [
  {
    id: "type",
    title: "Choose Type",
    description: "What kind of asset are you creating?",
  },
  {
    id: "visual",
    title: "Visual Asset",
    description: "Generate or upload the 3D model",
  },
  {
    id: "data",
    title: "Game Data",
    description: "Set stats, properties, and behavior",
  },
  {
    id: "relationships",
    title: "Relationships",
    description: "Link to other assets",
    optional: true,
  },
  {
    id: "review",
    title: "Review & Export",
    description: "Validate and export to game",
  },
];

// =============================================================================
// ASSET TYPE OPTIONS
// =============================================================================

interface AssetTypeOption {
  type: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  examples: string[];
  manifestFile: string;
}

const ASSET_TYPES: AssetTypeOption[] = [
  {
    type: "weapon",
    name: "Weapon",
    description: "Swords, axes, bows, staves for combat",
    icon: <Box className="w-6 h-6" />,
    color: "cyan",
    examples: ["Bronze Sword", "Steel Axe", "Oak Bow"],
    manifestFile: "items.json",
  },
  {
    type: "armor",
    name: "Armor",
    description: "Helmets, bodies, legs, shields for defense",
    icon: <Box className="w-6 h-6" />,
    color: "blue",
    examples: ["Chainbody", "Spiked Helmet", "Bronze Shield"],
    manifestFile: "items.json",
  },
  {
    type: "tool",
    name: "Tool",
    description: "Pickaxes, hatchets, fishing rods for gathering",
    icon: <Box className="w-6 h-6" />,
    color: "orange",
    examples: ["Bronze Hatchet", "Steel Pickaxe", "Fishing Rod"],
    manifestFile: "items.json",
  },
  {
    type: "mob",
    name: "Mob / Enemy",
    description: "Attackable creatures that drop loot",
    icon: <Users className="w-6 h-6" />,
    color: "purple",
    examples: ["Goblin", "Skeleton", "Dragon"],
    manifestFile: "npcs.json",
  },
  {
    type: "neutral_npc",
    name: "NPC",
    description: "Shopkeepers, bankers, quest givers",
    icon: <Users className="w-6 h-6" />,
    color: "indigo",
    examples: ["Shopkeeper", "Bank Clerk", "Quest Master"],
    manifestFile: "npcs.json",
  },
  {
    type: "harvestable",
    name: "Resource",
    description: "Trees, rocks, fishing spots to harvest",
    icon: <TreePine className="w-6 h-6" />,
    color: "green",
    examples: ["Oak Tree", "Iron Rock", "Fishing Spot"],
    manifestFile: "resources.json",
  },
  {
    type: "store",
    name: "Store",
    description: "Shops that sell items to players",
    icon: <Store className="w-6 h-6" />,
    color: "yellow",
    examples: ["General Store", "Weapon Shop", "Armor Shop"],
    manifestFile: "stores.json",
  },
  {
    type: "music",
    name: "Music",
    description: "Background music for areas and combat",
    icon: <Music className="w-6 h-6" />,
    color: "pink",
    examples: ["Battle Theme", "Forest Ambience", "Town Music"],
    manifestFile: "music.json",
  },
];

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AssetCreationWizard({
  initialType,
  onComplete,
  onCancel,
}: AssetCreationWizardProps) {
  // State
  const [currentStep, setCurrentStep] = useState(initialType ? 1 : 0);
  const [selectedType, setSelectedType] = useState<string | null>(initialType || null);
  const [assetData, setAssetData] = useState<Record<string, unknown>>({});
  const [generatedModel, setGeneratedModel] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Get schema for selected type
  const { schema, defaults } = useAssetSchema(selectedType || "");
  const completeness = useAssetCompleteness({
    type: selectedType || "",
    asset: assetData,
  });

  // Initialize defaults when type is selected
  const handleTypeSelect = useCallback((type: string) => {
    setSelectedType(type);
    const typeDefaults = getSchemaDefaults(type);
    setAssetData({ ...typeDefaults, type });
  }, []);

  // Update asset data field
  const updateField = useCallback((field: string, value: unknown) => {
    setAssetData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Navigation
  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 0: // Type selection
        return selectedType !== null;
      case 1: // Visual
        return true; // Can skip to data
      case 2: // Data
        return true; // Can have incomplete data
      case 3: // Relationships
        return true; // Optional
      case 4: // Review
        return completeness.isExportReady;
      default:
        return false;
    }
  }, [currentStep, selectedType, completeness.isExportReady]);

  const handleNext = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    onComplete?.(assetData);
  };

  // Get selected type info
  const selectedTypeInfo = ASSET_TYPES.find((t) => t.type === selectedType);

  return (
    <div className="min-h-[600px] flex flex-col">
      {/* Progress Steps */}
      <div className="border-b border-glass-border p-4">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {WIZARD_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              {/* Step indicator */}
              <button
                onClick={() => index < currentStep && setCurrentStep(index)}
                disabled={index > currentStep}
                className={cn(
                  "flex items-center gap-2 transition-all",
                  index <= currentStep
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    index < currentStep
                      ? "bg-green-500 text-white"
                      : index === currentStep
                        ? "bg-cyan-500 text-white"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {index < currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="hidden md:block">
                  <div className="text-sm font-medium">{step.title}</div>
                  {step.optional && (
                    <div className="text-xs text-muted-foreground">Optional</div>
                  )}
                </div>
              </button>

              {/* Connector line */}
              {index < WIZARD_STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-12 h-0.5 mx-2",
                    index < currentStep ? "bg-green-500" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Step Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              {WIZARD_STEPS[currentStep].title}
            </h2>
            <p className="text-muted-foreground mt-1">
              {WIZARD_STEPS[currentStep].description}
            </p>
          </div>

          {/* Step 0: Type Selection */}
          {currentStep === 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {ASSET_TYPES.map((type) => (
                <GlassPanel
                  key={type.type}
                  className={cn(
                    "p-4 cursor-pointer transition-all hover:scale-[1.02]",
                    selectedType === type.type
                      ? "ring-2 ring-cyan-500 border-cyan-500/30"
                      : "hover:border-cyan-500/20"
                  )}
                  onClick={() => handleTypeSelect(type.type)}
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center mb-3",
                      `bg-${type.color}-500/20 text-${type.color}-400`
                    )}
                  >
                    {type.icon}
                  </div>
                  <h3 className="font-semibold">{type.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {type.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {type.examples.slice(0, 2).map((ex) => (
                      <span
                        key={ex}
                        className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"
                      >
                        {ex}
                      </span>
                    ))}
                  </div>
                </GlassPanel>
              ))}
            </div>
          )}

          {/* Step 1: Visual Asset */}
          {currentStep === 1 && selectedType && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Generate with AI */}
                <GlassPanel className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Generate with AI</h3>
                      <p className="text-sm text-muted-foreground">
                        Create a 3D model from text
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Asset Name
                      </label>
                      <input
                        type="text"
                        value={(assetData.name as string) || ""}
                        onChange={(e) => updateField("name", e.target.value)}
                        placeholder={`e.g., ${selectedTypeInfo?.examples[0] || "Bronze Sword"}`}
                        className="w-full px-3 py-2 bg-glass-bg border border-glass-border rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Description (optional)
                      </label>
                      <textarea
                        value={(assetData.description as string) || ""}
                        onChange={(e) => updateField("description", e.target.value)}
                        placeholder="Describe the asset for AI generation..."
                        rows={3}
                        className="w-full px-3 py-2 bg-glass-bg border border-glass-border rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
                      />
                    </div>

                    <button
                      onClick={() => {
                        // TODO: Trigger generation
                        setIsGenerating(true);
                      }}
                      disabled={!assetData.name || isGenerating}
                      className={cn(
                        "w-full py-3 rounded-lg font-medium transition-all",
                        assetData.name && !isGenerating
                          ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      )}
                    >
                      {isGenerating ? "Generating..." : "Generate 3D Model"}
                    </button>
                  </div>
                </GlassPanel>

                {/* Upload existing */}
                <GlassPanel className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Upload Existing</h3>
                      <p className="text-sm text-muted-foreground">
                        Use a model you already have
                      </p>
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-glass-border rounded-lg p-8 text-center">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Drag & drop a .glb or .gltf file
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      or click to browse
                    </p>
                  </div>
                </GlassPanel>
              </div>

              {/* Skip option */}
              <div className="text-center">
                <button
                  onClick={handleNext}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip for now - I&apos;ll add the model later
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Game Data */}
          {currentStep === 2 && selectedType && schema && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Form */}
              <div className="space-y-4">
                {Object.entries(schema.fields)
                  .filter(([, field]) => field.requirement === "required")
                  .map(([key, field]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-2">
                        {field.name}
                        <span className="text-red-400 ml-1">*</span>
                      </label>
                      {field.type === "string" || field.type === "path" ? (
                        <input
                          type="text"
                          value={(assetData[key] as string) || ""}
                          onChange={(e) => updateField(key, e.target.value)}
                          placeholder={String(field.example || "")}
                          className="w-full px-3 py-2 bg-glass-bg border border-glass-border rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      ) : field.type === "number" ? (
                        <input
                          type="number"
                          value={(assetData[key] as number) || ""}
                          onChange={(e) => updateField(key, Number(e.target.value))}
                          placeholder={String(field.example || field.default || "")}
                          className="w-full px-3 py-2 bg-glass-bg border border-glass-border rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      ) : (
                        <input
                          type="text"
                          value={JSON.stringify(assetData[key] || field.default || "")}
                          onChange={(e) => {
                            try {
                              updateField(key, JSON.parse(e.target.value));
                            } catch {
                              updateField(key, e.target.value);
                            }
                          }}
                          placeholder="Enter value..."
                          className="w-full px-3 py-2 bg-glass-bg border border-glass-border rounded-lg focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {field.description}
                      </p>
                    </div>
                  ))}
              </div>

              {/* Completeness Panel */}
              <div>
                <AssetCompletenessPanel
                  type={selectedType}
                  asset={assetData}
                  compact={false}
                />
              </div>
            </div>
          )}

          {/* Step 3: Relationships */}
          {currentStep === 3 && selectedType && (
            <div className="space-y-6">
              <GlassPanel className="p-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Link Related Assets</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Connect this asset to others in the game. For example:
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                      <li>Mobs drop items when killed</li>
                      <li>NPCs manage stores</li>
                      <li>Resources yield materials</li>
                      <li>Areas spawn mobs and resources</li>
                    </ul>
                  </div>
                </div>
              </GlassPanel>

              {/* TODO: Relationship linking UI */}
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Relationship linking will be added after the asset is created.
                </p>
                <button
                  onClick={handleNext}
                  className="mt-4 text-sm text-cyan-400 hover:text-cyan-300"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && selectedType && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Summary */}
              <GlassPanel className="p-6">
                <h3 className="font-semibold mb-4">Asset Summary</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-muted-foreground">Type</dt>
                    <dd className="font-medium">
                      {selectedTypeInfo?.name || selectedType}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Name</dt>
                    <dd className="font-medium">
                      {(assetData.name as string) || "Unnamed"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">ID</dt>
                    <dd className="font-mono text-sm">
                      {(assetData.id as string) || "Will be generated"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">
                      Export To
                    </dt>
                    <dd className="font-medium">
                      {selectedTypeInfo?.manifestFile || "items.json"}
                    </dd>
                  </div>
                </dl>
              </GlassPanel>

              {/* Validation */}
              <AssetCompletenessPanel
                type={selectedType}
                asset={assetData}
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="border-t border-glass-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={currentStep === 0 ? onCancel : handleBack}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-glass-border hover:bg-glass-bg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {currentStep === 0 ? "Cancel" : "Back"}
          </button>

          <div className="flex items-center gap-3">
            {currentStep === WIZARD_STEPS.length - 1 ? (
              <button
                onClick={handleComplete}
                disabled={!completeness.isExportReady}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all",
                  completeness.isExportReady
                    ? "bg-green-500 text-white hover:bg-green-400"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                Create Asset
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canGoNext}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all",
                  canGoNext
                    ? "bg-cyan-500 text-white hover:bg-cyan-400"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssetCreationWizard;
