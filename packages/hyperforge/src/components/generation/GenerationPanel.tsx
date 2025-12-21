"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { ErrorBoundary, type RecoveryAction } from "@/components/ui/error-boundary";
import { CategorySelector } from "./CategorySelector";
import {
  GenerationFormRouter,
  type GenerationConfig,
} from "./GenerationFormRouter";
import { ProgressTracker } from "./ProgressTracker";
import { ResultPreview } from "./ResultPreview";
import { PresetSelector } from "./PresetSelector";
import { useGenerationStore } from "@/stores/generation-store";
import { useToast } from "@/components/ui/toast";
import type { AssetCategory } from "@/types/categories";
import { Sparkles, Zap, RefreshCw } from "lucide-react";

export function GenerationPanel() {
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [presetConfig, setPresetConfig] = useState<GenerationConfig | null>(null);
  const { toast } = useToast();
  const {
    selectedCategory,
    setSelectedCategory,
    currentGeneration,
    setCurrentGeneration,
    progress,
    setProgress,
    addGeneratedAsset,
    reset,
  } = useGenerationStore();

  // Handle preset selection
  const handlePresetSelect = useCallback((config: GenerationConfig) => {
    setPresetConfig(config);
    setSelectedCategory(config.category);
    toast({
      title: "Preset Loaded",
      description: "Form populated with preset settings",
      duration: 2000,
    });
  }, [setSelectedCategory, toast]);

  const handleCategorySelect = (category: AssetCategory) => {
    setSelectedCategory(category);
    setShowCategorySelector(false);
  };

  const handleGenerate = useCallback(async (config: GenerationConfig) => {
    setCurrentGeneration(config);
    setProgress({
      status: "generating",
      progress: 0,
      currentStep: "Starting generation...",
    });

    try {
      const response = await fetch("/api/generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          config,
        }),
      });

      if (!response.ok) {
        throw new Error("Generation failed");
      }

      const result = await response.json();

      // The generation API runs synchronously (polls internally),
      // so when we get here the generation is complete
      setProgress({
        status: "completed",
        progress: 100,
        currentStep: "Generation complete!",
      });

      // Add the generated asset with all metadata from the result
      // Extract known metadata fields, omitting category which is set separately
      const { category: _metaCategory, ...restMetadata } = config.metadata || {};
      addGeneratedAsset({
        id: result.taskId || crypto.randomUUID(),
        category: config.category,
        config,
        modelUrl: result.localModelUrl || result.modelUrl,
        thumbnailUrl: result.localThumbnailUrl || result.thumbnailUrl,
        metadata: {
          ...restMetadata,
          assetId: result.metadata?.assetId,
          hasVRM: result.hasVRM,
          hasHandRigging: result.hasHandRigging,
          localModelUrl: result.localModelUrl,
          localVrmUrl: result.localVrmUrl,
          localThumbnailUrl: result.localThumbnailUrl,
          vrmUrl: result.vrmUrl,
        },
        createdAt: new Date(),
      });

      toast({
        variant: "success",
        title: "Generation Complete",
        description: `${config.category} asset generated successfully${result.hasVRM ? " (VRM converted)" : ""}`,
        duration: 5000,
      });
    } catch (error) {
      setProgress({
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : "Generation failed",
      });

      toast({
        variant: "destructive",
        title: "Generation Failed",
        description:
          error instanceof Error ? error.message : "Generation failed",
        duration: 5000,
      });
    }
  }, [setCurrentGeneration, setProgress, addGeneratedAsset, toast]);

  // Use ref for stable reference in callbacks
  const handleGenerateRef = useRef(handleGenerate);
  useEffect(() => {
    handleGenerateRef.current = handleGenerate;
  });

  // Quick generate with preset (one-click)
  const handleQuickGenerate = useCallback(() => {
    if (!presetConfig) return;
    handleGenerateRef.current(presetConfig);
  }, [presetConfig]);

  const handleCancel = () => {
    setSelectedCategory(null);
    setCurrentGeneration(null);
    setProgress({
      status: "idle",
      progress: 0,
    });
  };

  const isGenerating = progress.status === "generating";

  // Recovery actions for ErrorBoundary
  const recoveryActions: RecoveryAction[] = useMemo(() => [
    {
      id: "reset-generation",
      label: "Reset Generation",
      icon: <RefreshCw className="w-4 h-4" />,
      action: () => {
        reset();
        setPresetConfig(null);
      },
      forCategories: ["generation"],
    },
  ], [reset]);

  return (
    <ErrorBoundary
      recoveryActions={recoveryActions}
      context="Generation Panel"
      showHistory
    >
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-glass-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Generate Asset</h2>
          <SpectacularButton
            size="sm"
            onClick={() => setShowCategorySelector(true)}
            disabled={isGenerating}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            New
          </SpectacularButton>
        </div>

        {/* Preset Selector with Quick Generate */}
        {selectedCategory && !isGenerating && progress.status !== "completed" && (
          <div className="flex gap-2">
            <PresetSelector
              category={selectedCategory}
              currentConfig={presetConfig || currentGeneration || undefined}
              onPresetSelect={handlePresetSelect}
              className="flex-1"
            />
            {presetConfig && (
              <SpectacularButton
                size="sm"
                onClick={handleQuickGenerate}
                title="Quick Generate with Preset"
              >
                <Zap className="w-4 h-4" />
              </SpectacularButton>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="3d" className="w-full h-full flex flex-col">
          <div className="p-4 border-b border-glass-border">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="3d">3D Models</TabsTrigger>
              <TabsTrigger value="audio">Audio</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="3d" className="flex-1 overflow-y-auto mt-0">
            {isGenerating ? (
              <div className="p-4 space-y-4">
                <ProgressTracker
                  progress={progress.progress}
                  currentStep={progress.currentStep}
                />
                {progress.error && (
                  <div className="text-sm text-destructive">
                    {progress.error}
                  </div>
                )}
              </div>
            ) : progress.status === "completed" ? (
              <div className="p-4">
                <ResultPreview />
              </div>
            ) : (
              <GenerationFormRouter
                category={selectedCategory}
                onGenerate={handleGenerate}
                onCancel={handleCancel}
                initialConfig={presetConfig ?? undefined}
              />
            )}
          </TabsContent>

          <TabsContent
            value="audio"
            className="flex-1 overflow-y-auto mt-0 p-4"
          >
            <p className="text-sm text-muted-foreground">
              Audio generation (ElevenLabs) coming soon
            </p>
          </TabsContent>

          <TabsContent
            value="content"
            className="flex-1 overflow-y-auto mt-0 p-4"
          >
            <p className="text-sm text-muted-foreground">
              Content generation (AI Gateway) coming soon
            </p>
          </TabsContent>
        </Tabs>
      </div>

      <CategorySelector
        isOpen={showCategorySelector}
        onClose={() => setShowCategorySelector(false)}
        onSelect={handleCategorySelect}
      />
    </div>
    </ErrorBoundary>
  );
}
