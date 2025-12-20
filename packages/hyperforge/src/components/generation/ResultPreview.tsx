"use client";

import { useState, useMemo } from "react";
import { useGenerationStore } from "@/stores/generation-store";
import { logger } from "@/lib/utils";
import { cn } from "@/lib/utils";

const log = logger.child("ResultPreview");
import { useVariantStore } from "@/stores/variant-store";
import Link from "next/link";
import {
  Check,
  Download,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Box,
  Palette,
  Plus,
  X,
  Image,
  Hexagon,
  Paintbrush,
  ChevronRight,
  Clock,
  Loader2,
} from "lucide-react";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { Modal } from "@/components/ui/modal";
import { VariantDefinitionPanel } from "./VariantDefinitionPanel";
import type { TextureVariant } from "./GenerationFormRouter";

// =============================================================================
// PIPELINE STAGE TYPES
// =============================================================================

interface PipelineStage {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: "pending" | "active" | "completed" | "failed";
  previewUrl?: string;
  description?: string;
}

// =============================================================================
// PIPELINE PROGRESS COMPONENT
// =============================================================================

interface PipelineProgressProps {
  stages: PipelineStage[];
  currentStageIndex: number;
  className?: string;
}

function PipelineProgress({ stages, currentStageIndex, className }: PipelineProgressProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <h4 className="text-sm font-medium text-muted-foreground">Generation Pipeline</h4>
      <div className="flex items-center gap-2">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex items-center">
            {/* Stage indicator */}
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                stage.status === "completed" && "bg-green-500/20 text-green-400",
                stage.status === "active" && "bg-cyan-500/20 text-cyan-400 animate-pulse",
                stage.status === "pending" && "bg-glass-bg text-muted-foreground",
                stage.status === "failed" && "bg-destructive/20 text-destructive"
              )}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                {stage.status === "active" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : stage.status === "completed" ? (
                  <Check className="w-4 h-4" />
                ) : (
                  stage.icon
                )}
              </div>
              <span className="text-xs font-medium">{stage.name}</span>
            </div>
            
            {/* Connector */}
            {index < stages.length - 1 && (
              <ChevronRight
                className={cn(
                  "w-4 h-4 mx-1",
                  index < currentStageIndex
                    ? "text-green-400"
                    : "text-muted-foreground/30"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// STAGE PREVIEW GRID
// =============================================================================

interface StagePreviewGridProps {
  stages: PipelineStage[];
}

function StagePreviewGrid({ stages }: StagePreviewGridProps) {
  const completedWithPreviews = stages.filter(
    (s) => s.status === "completed" && s.previewUrl
  );

  if (completedWithPreviews.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">
        Generation Stages
      </h4>
      <div className="grid grid-cols-3 gap-2">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={cn(
              "aspect-square rounded-lg overflow-hidden border transition-all",
              stage.status === "completed" && stage.previewUrl
                ? "border-green-500/30 bg-glass-bg"
                : "border-glass-border bg-glass-bg/30"
            )}
          >
            {stage.previewUrl ? (
              <div className="relative w-full h-full group">
                <img
                  src={stage.previewUrl}
                  alt={stage.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <span className="text-xs font-medium text-white">
                    {stage.name}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40">
                <div className="w-6 h-6 mb-1">{stage.icon}</div>
                <span className="text-[10px]">{stage.name}</span>
                {stage.status === "active" && (
                  <Loader2 className="w-3 h-3 mt-1 animate-spin text-cyan-400" />
                )}
                {stage.status === "pending" && (
                  <Clock className="w-3 h-3 mt-1 text-muted-foreground/30" />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ResultPreview() {
  const { generatedAssets, progress, currentGeneration, reset } = useGenerationStore();
  const { setBaseModel } = useVariantStore();

  const [showVariantModal, setShowVariantModal] = useState(false);
  const [pendingVariants, setPendingVariants] = useState<TextureVariant[]>([]);
  const [isCreatingVariants, setIsCreatingVariants] = useState(false);

  // Get the most recent generated asset
  const latestAsset = generatedAssets[generatedAssets.length - 1];

  // Build pipeline stages based on current generation config and progress
  const pipelineStages = useMemo((): PipelineStage[] => {
    const config = currentGeneration || latestAsset?.config;
    const metadata = latestAsset?.metadata;
    const isCompleted = progress.status === "completed";
    const currentStep = progress.currentStep?.toLowerCase() || "";

    const stages: PipelineStage[] = [];

    // Concept Art stage (if enabled)
    if (config?.generateConceptArt) {
      const conceptArtUrl = metadata?.conceptArtUrl as string | undefined;
      const isActive = currentStep.includes("concept");
      
      stages.push({
        id: "concept-art",
        name: "Concept Art",
        icon: <Image className="w-4 h-4" />,
        status: conceptArtUrl
          ? "completed"
          : isActive
            ? "active"
            : isCompleted
              ? "completed"
              : "pending",
        previewUrl: conceptArtUrl,
        description: "AI-generated concept art for texturing",
      });
    }

    // Mesh Generation stage
    const meshUrl = metadata?.meshPreviewUrl as string | undefined;
    const isMeshActive = currentStep.includes("mesh") || currentStep.includes("generating");
    stages.push({
      id: "mesh",
      name: "3D Mesh",
      icon: <Hexagon className="w-4 h-4" />,
      status: latestAsset?.modelUrl
        ? "completed"
        : isMeshActive
          ? "active"
          : isCompleted
            ? "completed"
            : "pending",
      previewUrl: meshUrl,
      description: "Base 3D geometry generation",
    });

    // Texturing stage
    const texturedUrl = latestAsset?.thumbnailUrl as string | undefined;
    const isTextureActive = currentStep.includes("texture") || currentStep.includes("material");
    stages.push({
      id: "textured",
      name: "Textured",
      icon: <Paintbrush className="w-4 h-4" />,
      status: latestAsset?.thumbnailUrl
        ? "completed"
        : isTextureActive
          ? "active"
          : isCompleted
            ? "completed"
            : "pending",
      previewUrl: texturedUrl,
      description: "Final textured model",
    });

    return stages;
  }, [currentGeneration, latestAsset, progress]);

  // Get current stage index
  const currentStageIndex = useMemo(() => {
    const activeIndex = pipelineStages.findIndex((s) => s.status === "active");
    if (activeIndex >= 0) return activeIndex;
    const lastCompleted = pipelineStages.findLastIndex((s) => s.status === "completed");
    return lastCompleted >= 0 ? lastCompleted : 0;
  }, [pipelineStages]);

  if (!latestAsset) {
    return (
      <div className="glass-panel p-4">
        <h3 className="text-sm font-medium mb-2">Generation Complete</h3>
        <p className="text-xs text-muted-foreground">
          Your 3D model is ready to preview and download.
        </p>
      </div>
    );
  }

  const metadata = latestAsset.metadata;
  const hasVRM = metadata?.hasVRM === true;
  const hasHandRigging = metadata?.hasHandRigging === true;
  const hasVariants = metadata?.hasVariants === true;
  const variantCount = (metadata?.variantCount as number) || 0;
  const assetId = (metadata?.assetId as string) || latestAsset.id;
  const localModelUrl = metadata?.localModelUrl as string;
  const localVrmUrl = metadata?.localVrmUrl as string;
  const localThumbnailUrl = metadata?.localThumbnailUrl as string;

  const handleOpenVariantModal = () => {
    // Set this asset as the base model for variants
    setBaseModel(
      assetId,
      localModelUrl || latestAsset.modelUrl || "",
      String(metadata?.name || assetId),
    );
    setPendingVariants([]);
    setShowVariantModal(true);
  };

  const handleCreateVariants = async () => {
    if (pendingVariants.length === 0) return;

    setIsCreatingVariants(true);

    try {
      const response = await fetch("/api/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch",
          baseModelId: assetId,
          baseModelUrl: localModelUrl || latestAsset.modelUrl,
          variants: pendingVariants,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        log.info("Variants created", { result });
        // Could update UI to show pending variants
      }
    } catch (error) {
      log.error("Failed to create variants", error);
    } finally {
      setIsCreatingVariants(false);
      setShowVariantModal(false);
      setPendingVariants([]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Success Header */}
      <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h3 className="font-semibold text-green-400">Generation Complete!</h3>
          <p className="text-sm text-muted-foreground">
            {latestAsset.config?.category || "Asset"} has been generated
            successfully
          </p>
        </div>
      </div>

      {/* Pipeline Progress */}
      {pipelineStages.length > 1 && (
        <div className="glass-panel p-4 space-y-3">
          <PipelineProgress
            stages={pipelineStages}
            currentStageIndex={currentStageIndex}
          />
          <StagePreviewGrid stages={pipelineStages} />
        </div>
      )}

      {/* Preview Card */}
      <div className="glass-panel p-4 space-y-4">
        {/* Thumbnail */}
        <div className="aspect-square bg-glass-bg rounded-lg overflow-hidden flex items-center justify-center relative group">
          {localThumbnailUrl || latestAsset.thumbnailUrl ? (
            <>
              <img
                src={localThumbnailUrl || latestAsset.thumbnailUrl}
                alt={String(metadata?.name || "Generated Asset")}
                className="w-full h-full object-cover"
              />
              {/* Quick view overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-sm font-medium">Final Result</span>
              </div>
            </>
          ) : (
            <Box className="w-16 h-16 text-muted-foreground/30" />
          )}
        </div>

        {/* Asset Info */}
        <div className="space-y-2">
          <h4 className="font-medium truncate">
            {String(metadata?.name || assetId)}
          </h4>
          <div className="flex flex-wrap gap-2">
            {/* Category Badge */}
            <span className="px-2 py-1 rounded-full text-xs bg-cyan-500/20 text-cyan-400">
              {latestAsset.category}
            </span>

            {/* VRM Badge */}
            {hasVRM && (
              <span className="px-2 py-1 rounded-full text-xs bg-purple-500/20 text-purple-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                VRM
              </span>
            )}

            {/* Hand Rigging Badge */}
            {hasHandRigging && (
              <span className="px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-400">
                Hand Bones
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {/* Download GLB */}
          {(localModelUrl || latestAsset.modelUrl) && (
            <a
              href={localModelUrl || latestAsset.modelUrl}
              download={`${assetId}.glb`}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-glass-bg hover:bg-glass-bg/80 text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Download GLB
            </a>
          )}

          {/* Download VRM */}
          {hasVRM && localVrmUrl && (
            <a
              href={localVrmUrl}
              download={`${assetId}.vrm`}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Download VRM
            </a>
          )}

          {/* Test Animations Link */}
          {hasVRM && (
            <Link
              href={`/studio/retarget?asset=${assetId}`}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-foreground hover:from-cyan-500/30 hover:to-purple-500/30 text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Test Animations
              <ExternalLink className="w-3 h-3 opacity-50" />
            </Link>
          )}

          {/* Convert to VRM Link (if not already VRM) */}
          {!hasVRM &&
            (latestAsset.category === "npc" ||
              latestAsset.category === "character") && (
              <Link
                href={`/studio/retarget?asset=${assetId}`}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-sm transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Convert to VRM
                <ExternalLink className="w-3 h-3 opacity-50" />
              </Link>
            )}

          {/* Add Texture Variant Button */}
          <button
            onClick={handleOpenVariantModal}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-foreground hover:from-purple-500/30 hover:to-pink-500/30 text-sm transition-colors border border-purple-500/20"
          >
            <Palette className="w-4 h-4 text-purple-400" />
            Add Texture Variants
            <Plus className="w-3 h-3 opacity-50" />
          </button>

          {/* Show existing variants count */}
          {hasVariants && variantCount > 0 && (
            <div className="text-center text-xs text-muted-foreground">
              {variantCount} texture variant{variantCount !== 1 ? "s" : ""}{" "}
              registered
            </div>
          )}
        </div>
      </div>

      {/* Generate Another */}
      <SpectacularButton onClick={reset} variant="outline" className="w-full">
        Generate Another
      </SpectacularButton>

      {/* Variant Creation Modal */}
      <Modal
        isOpen={showVariantModal}
        onClose={() => setShowVariantModal(false)}
        title="Create Texture Variants"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Create texture variants for{" "}
            <span className="font-medium text-foreground">
              {String(metadata?.name || assetId)}
            </span>
            . Each variant uses the same base mesh with different textures.
          </p>

          <VariantDefinitionPanel
            variants={pendingVariants}
            onVariantsChange={setPendingVariants}
          />

          <div className="flex gap-2 pt-4 border-t border-glass-border">
            <SpectacularButton
              variant="outline"
              onClick={() => setShowVariantModal(false)}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </SpectacularButton>
            <SpectacularButton
              onClick={handleCreateVariants}
              disabled={pendingVariants.length === 0 || isCreatingVariants}
              className="flex-1"
            >
              <Palette className="w-4 h-4 mr-2" />
              {isCreatingVariants
                ? "Creating..."
                : `Create ${pendingVariants.length} Variant${pendingVariants.length !== 1 ? "s" : ""}`}
            </SpectacularButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
