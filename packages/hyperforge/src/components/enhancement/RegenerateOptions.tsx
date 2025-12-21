"use client";

import { useState, useEffect } from "react";
import { NeonInput } from "@/components/ui/neon-input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { useToast } from "@/components/ui/toast";
import { ProgressTracker } from "../generation/ProgressTracker";
import {
  MeshQualityControls,
  getMeshQualityForCategory,
  type MeshQualitySettings,
} from "./MeshQualityControls";
import { RefreshCw, Settings2, Palette, Sparkles } from "lucide-react";
import type { AssetData } from "@/types/asset";
import { logger, cn } from "@/lib/utils";

const log = logger.child("RegenerateOptions");

// Material preset interface
interface MaterialPreset {
  id: string;
  name: string;
  displayName: string;
  category: string;
  tier: number;
  color: string;
  stylePrompt: string;
  description?: string;
}

// Game style interface
interface GameStyleInfo {
  id: string;
  name: string;
  base: string;
  enhanced?: string;
  generation?: string;
}

// Categories that support material variants
const MATERIAL_SUPPORTED_CATEGORIES = [
  "weapon",
  "armor",
  "tool",
  "item",
  "equipment",
  "melee",
  "ranged",
  "shield",
];

interface RegenerateOptionsProps {
  asset: AssetData;
}

export function RegenerateOptions({ asset }: RegenerateOptionsProps) {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [variationStrength, setVariationStrength] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showMeshOptions, setShowMeshOptions] = useState(false);
  const [meshQuality, setMeshQuality] = useState<MeshQualitySettings>(() =>
    getMeshQualityForCategory(asset.category),
  );

  // Material and game style state
  const [materialPresets, setMaterialPresets] = useState<MaterialPreset[]>([]);
  const [gameStyles, setGameStyles] = useState<Map<string, GameStyleInfo>>(
    new Map()
  );
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [selectedGameStyle, setSelectedGameStyle] = useState<string | null>(
    null,
  );
  const [showStyleOptions, setShowStyleOptions] = useState(false);
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);

  // Check if this asset supports materials
  const supportsMaterials = MATERIAL_SUPPORTED_CATEGORIES.some(
    (cat) =>
      asset.category?.toLowerCase().includes(cat) ||
      asset.type?.toLowerCase().includes(cat),
  );

  // Update mesh quality when asset changes
  useEffect(() => {
    setMeshQuality(getMeshQualityForCategory(asset.category));
  }, [asset.category]);

  // Load material presets and game styles
  useEffect(() => {
    const loadPresets = async () => {
      setIsLoadingPresets(true);
      try {
        const [materialsRes, stylesRes] = await Promise.all([
          fetch("/prompts/material-presets.json"),
          fetch("/prompts/game-style-prompts.json"),
        ]);

        if (materialsRes.ok) {
          const materials = await materialsRes.json();
          setMaterialPresets(materials);
        }

        if (stylesRes.ok) {
          const stylesData = await stylesRes.json();
          const allStyles = new Map<string, GameStyleInfo>();
          if (stylesData.default) {
            Object.entries(stylesData.default).forEach(([id, style]) => {
              allStyles.set(id, { id, ...(style as Omit<GameStyleInfo, "id">) });
            });
          }
          if (stylesData.custom) {
            Object.entries(stylesData.custom).forEach(([id, style]) => {
              allStyles.set(id, { id, ...(style as Omit<GameStyleInfo, "id">) });
            });
          }
          setGameStyles(allStyles);

          // Set default game style from asset's generation params
          const genParams = (
            asset as { generationParams?: Record<string, unknown> }
          ).generationParams;
          const assetStyle =
            (genParams?.gameStyle as string) ||
            (genParams?.style as string) ||
            "runescape";
          if (allStyles.has(assetStyle)) {
            setSelectedGameStyle(assetStyle);
          }

          // Set default material from asset's generation params
          const assetMaterial =
            (genParams?.materialPresetId as string) ||
            (genParams?.material as string);
          if (assetMaterial) {
            setSelectedMaterial(assetMaterial);
          }
        }
      } catch (error) {
        log.debug("Failed to load presets:", error);
      } finally {
        setIsLoadingPresets(false);
      }
    };

    loadPresets();
  }, [asset]);

  const handleRegenerate = async () => {
    setIsProcessing(true);
    setProgress(0);

    // Start progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 95));
    }, 1000);

    try {
      // Check if this is a CDN asset (not in database)
      const isCDNAsset = asset.source === "CDN";

      // Get selected material and game style info
      const material = selectedMaterial
        ? materialPresets.find((m) => m.id === selectedMaterial)
        : null;
      const gameStyle = selectedGameStyle
        ? gameStyles.get(selectedGameStyle)
        : undefined;

      // Build the prompt with material and style info
      let finalPrompt = prompt;
      if (!finalPrompt) {
        finalPrompt = `A ${asset.name.toLowerCase()}, high quality 3D game asset`;
      }

      // Add material styling to prompt if selected
      if (material && supportsMaterials) {
        finalPrompt = `${finalPrompt}, ${material.stylePrompt}`;
      }

      // Add game style to prompt if selected
      if (gameStyle?.base) {
        finalPrompt = `${finalPrompt}, ${gameStyle.base}`;
      }

      const response = await fetch("/api/enhancement/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: asset.id,
          prompt: finalPrompt,
          variationStrength,
          // Mesh quality settings
          meshOptions: {
            targetPolycount: meshQuality.targetPolycount,
            topology: meshQuality.topology,
            shouldRemesh: meshQuality.shouldRemesh,
            enablePBR: meshQuality.enablePBR,
          },
          // Material and style metadata
          materialPresetId: selectedMaterial,
          gameStyle: selectedGameStyle,
          // Include asset info for CDN assets that aren't in the database
          ...(isCDNAsset && {
            assetName: asset.name,
            assetType: asset.type || "object",
            assetCategory: asset.category,
            assetDescription: asset.description,
            thumbnailUrl: asset.thumbnailUrl,
          }),
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Regeneration failed");
      }

      const data = await response.json();
      setProgress(100);

      // Show success toast after state updates
      setTimeout(() => {
        toast({
          variant: "success",
          title: "Regeneration Complete",
          description: `Created: ${data.name || "New variant"}`,
          duration: 5000,
        });
        setIsProcessing(false);
      }, 100);
    } catch (error) {
      clearInterval(progressInterval);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log.error(
        {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
        "Regeneration error",
      );
      setIsProcessing(false);
      setProgress(0);

      setTimeout(() => {
        toast({
          variant: "destructive",
          title: "Regeneration Failed",
          description: errorMessage || "Regeneration operation failed",
          duration: 5000,
        });
      }, 100);
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold">Regenerate Asset</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Generate a new variation of{" "}
          <span className="text-foreground font-medium">{asset.name}</span> with
          similar characteristics.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Prompt (optional)</Label>
            <NeonInput
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Leave empty to use original prompt"
            />
          </div>

          <div className="space-y-2">
            <Label>Variation Strength: {variationStrength}%</Label>
            <Slider
              value={[variationStrength]}
              onValueChange={([value]) => setVariationStrength(value)}
              min={0}
              max={100}
              step={5}
            />
            <p className="text-xs text-muted-foreground">
              Higher values create more variation from the original
            </p>
          </div>

          {/* Style & Material Options Toggle */}
          <button
            type="button"
            onClick={() => setShowStyleOptions(!showStyleOptions)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            {showStyleOptions ? "Hide" : "Show"} Style & Material Options
          </button>

          {/* Style & Material Selection */}
          {showStyleOptions && (
            <div className="p-4 rounded-lg bg-glass-bg border border-glass-border space-y-4">
              {/* Game Style Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Game Style
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {Array.from(gameStyles.values()).map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setSelectedGameStyle(style.id)}
                      className={cn(
                        "p-2 rounded-lg border text-left transition-all text-sm",
                        selectedGameStyle === style.id
                          ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                          : "border-glass-border bg-glass-bg/30 hover:border-amber-500/30 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <span className="font-medium">{style.name}</span>
                    </button>
                  ))}
                </div>
                {selectedGameStyle && gameStyles.get(selectedGameStyle)?.base && (
                  <p className="text-xs text-muted-foreground italic">
                    &quot;{gameStyles.get(selectedGameStyle)?.base}&quot;
                  </p>
                )}
              </div>

              {/* Material Selection (only for supported categories) */}
              {supportsMaterials && materialPresets.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-glass-border">
                  <Label className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-400" />
                    Material Variant
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {/* None option */}
                    <button
                      type="button"
                      onClick={() => setSelectedMaterial(null)}
                      className={cn(
                        "p-2 rounded-lg border transition-all flex flex-col items-center",
                        selectedMaterial === null
                          ? "border-purple-500/50 bg-purple-500/10"
                          : "border-glass-border bg-glass-bg/30 hover:border-purple-500/30",
                      )}
                    >
                      <div className="w-6 h-6 rounded-md border border-glass-border bg-zinc-800 mb-1" />
                      <span className="text-[10px]">Original</span>
                    </button>
                    {materialPresets.map((material) => (
                      <button
                        key={material.id}
                        type="button"
                        onClick={() => setSelectedMaterial(material.id)}
                        title={material.description || material.stylePrompt}
                        className={cn(
                          "p-2 rounded-lg border transition-all flex flex-col items-center",
                          selectedMaterial === material.id
                            ? "border-purple-500/50 bg-purple-500/10"
                            : "border-glass-border bg-glass-bg/30 hover:border-purple-500/30",
                        )}
                      >
                        <div
                          className="w-6 h-6 rounded-md border border-glass-border mb-1"
                          style={{ backgroundColor: material.color }}
                        />
                        <span className="text-[10px] truncate w-full text-center">
                          {material.displayName}
                        </span>
                      </button>
                    ))}
                  </div>
                  {selectedMaterial && (
                    <p className="text-xs text-muted-foreground">
                      {materialPresets.find((m) => m.id === selectedMaterial)
                        ?.description ||
                        materialPresets.find((m) => m.id === selectedMaterial)
                          ?.stylePrompt}
                    </p>
                  )}
                </div>
              )}

              {isLoadingPresets && (
                <p className="text-xs text-muted-foreground">
                  Loading options...
                </p>
              )}
            </div>
          )}

          {/* Mesh Quality Options Toggle */}
          <button
            type="button"
            onClick={() => setShowMeshOptions(!showMeshOptions)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            {showMeshOptions ? "Hide" : "Show"} Mesh Quality Options
          </button>

          {/* Mesh Quality Controls */}
          {showMeshOptions && (
            <div className="p-4 rounded-lg bg-glass-bg border border-glass-border">
              <MeshQualityControls
                value={meshQuality}
                onChange={setMeshQuality}
                compact
                showAdvanced
              />
            </div>
          )}

          {isProcessing && (
            <ProgressTracker
              progress={progress}
              currentStep="Regenerating model... This may take 2-5 minutes"
            />
          )}

          <SpectacularButton
            onClick={handleRegenerate}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? "Processing..." : "Regenerate"}
          </SpectacularButton>
        </div>
      </div>

      {/* Current Settings Summary */}
      <div className="border-t border-glass-border pt-4 space-y-1">
        <p className="text-xs text-muted-foreground">
          Quality:{" "}
          <span className="text-foreground">
            {meshQuality.assetClass.replace("_", " ")}
          </span>
          {" • "}
          <span className="text-foreground">
            {meshQuality.targetPolycount.toLocaleString()} polys
          </span>
          {" • "}
          <span className="text-foreground">{meshQuality.topology}</span>
        </p>
        {(selectedGameStyle || selectedMaterial) && (
          <p className="text-xs text-muted-foreground">
            {selectedGameStyle && (
              <>
                Style:{" "}
                <span className="text-amber-400">
                  {gameStyles.get(selectedGameStyle)?.name || selectedGameStyle}
                </span>
              </>
            )}
            {selectedGameStyle && selectedMaterial && " • "}
            {selectedMaterial && (
              <>
                Material:{" "}
                <span className="text-purple-400">
                  {materialPresets.find((m) => m.id === selectedMaterial)
                    ?.displayName || selectedMaterial}
                </span>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
