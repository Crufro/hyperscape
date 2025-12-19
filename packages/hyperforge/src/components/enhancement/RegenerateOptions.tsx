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
import { RefreshCw, Settings2 } from "lucide-react";
import type { AssetData } from "@/types/asset";
import { logger } from "@/lib/utils";

const log = logger.child("RegenerateOptions");

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

  // Update mesh quality when asset changes
  useEffect(() => {
    setMeshQuality(getMeshQualityForCategory(asset.category));
  }, [asset.category]);

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

      const response = await fetch("/api/enhancement/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: asset.id,
          prompt:
            prompt ||
            `A ${asset.name.toLowerCase()}, high quality 3D game asset`,
          variationStrength,
          // Mesh quality settings
          meshOptions: {
            targetPolycount: meshQuality.targetPolycount,
            topology: meshQuality.topology,
            shouldRemesh: meshQuality.shouldRemesh,
            enablePBR: meshQuality.enablePBR,
          },
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
      <div className="border-t border-glass-border pt-4">
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
      </div>
    </div>
  );
}
