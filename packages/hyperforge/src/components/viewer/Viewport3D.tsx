"use client";

import { logger } from "@/lib/utils";
import { useState, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid } from "@react-three/drei";
import { Suspense } from "react";
import { X } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { ModelViewer, type ModelInfo } from "./ModelViewer";
import { VRMViewer } from "./VRMViewer";
import { ViewportControls } from "./ViewportControls";
import { EnvironmentControls } from "./EnvironmentControls";
import { ViewportShortcuts } from "./ViewportShortcuts";
import {
  ViewportSettingsModal,
  DEFAULT_VIEWPORT_SETTINGS,
  type ViewportSettings,
} from "./ViewportSettingsModal";
import { useToast } from "@/components/ui";
import { EnhancementPanel } from "@/components/enhancement/EnhancementPanel";
import { GenerationPanel } from "@/components/generation/GenerationPanel";
import { PropertiesPanel } from "@/components/panels/PropertiesPanel";
import {
  CharacterEquipmentPanel,
  ArmorFittingPanel,
  HandRiggingPanel,
  RetargetingPanel,
  AudioStudioPanel,
} from "@/components/modules";
import { useAppStore, type ViewportPanelType } from "@/stores/app-store";
import { useThumbnailOverrides } from "@/hooks/useThumbnailOverrides";
import type { BaseAsset, HyperForgeAsset } from "@/types/asset";

const log = logger.child("Viewport3D");

interface Viewport3DProps {
  selectedAsset?: BaseAsset | null;
  onAssetDeleted?: (assetId: string) => void;
}

export function Viewport3D({ selectedAsset, onAssetDeleted }: Viewport3DProps) {
  const { viewportPanel, closeViewportPanel, setViewportPanel } = useAppStore();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { setThumbnailOverride } = useThumbnailOverrides();
  const [showModel, setShowModel] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [viewportSettings, setViewportSettings] = useState<ViewportSettings>(
    DEFAULT_VIEWPORT_SETTINGS,
  );
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);

  // Track VRM loading failures to fallback to GLB viewer
  const [vrmFailed, setVrmFailed] = useState(false);
  
  // Reset VRM failed state when asset changes
  useEffect(() => {
    setVrmFailed(false);
  }, [selectedAsset?.id]);
  
  // Derived state from settings
  const environment = viewportSettings.environment;
  const showGrid = viewportSettings.showGrid;

  const environmentPresets: Record<
    string,
    | "forest"
    | "studio"
    | "warehouse"
    | "sunset"
    | "apartment"
    | "night"
    | "city"
    | "dawn"
    | "lobby"
    | "park"
  > = {
    neutral: "warehouse",
    studio: "studio",
    outdoor: "sunset",
    indoor: "apartment",
    night: "night",
  };

  // Check if current asset is a VRM file and get VRM URL
  // Only use VRM viewer if the PRIMARY modelUrl is a VRM (no GLB fallback available)
  // If there's a separate vrmUrl but also a GLB modelUrl, prefer the GLB for stability
  const modelUrl = selectedAsset?.modelUrl;
  const modelUrlIsVrm = modelUrl?.toLowerCase().endsWith(".vrm");
  
  // Only use VRM viewer if:
  // 1. The modelUrl itself ends with .vrm (no GLB alternative), OR
  // 2. There's no modelUrl but there's a valid vrmUrl
  // This ensures we prefer GLB when both are available
  const explicitVrmUrl = (selectedAsset as { vrmUrl?: string } | undefined)?.vrmUrl;
  
  // Determine VRM URL - only use if no GLB is available
  const vrmUrl = modelUrlIsVrm 
    ? modelUrl  // Model itself is VRM
    : (!modelUrl && explicitVrmUrl?.startsWith("http") && explicitVrmUrl?.toLowerCase().endsWith(".vrm"))
      ? explicitVrmUrl  // No model, but have explicit VRM URL
      : null;
  
  const isVRM = !!vrmUrl && !vrmFailed;
  const validExplicitVrmUrl = vrmUrl; // For debug logging

  // Debug VRM detection
  useEffect(() => {
    if (selectedAsset?.id) {
      log.debug("VRM detection:", {
        assetId: selectedAsset.id,
        modelUrl: modelUrl?.slice(-50),
        modelUrlIsVrm,
        explicitVrmUrl: explicitVrmUrl?.slice(-50),
        vrmUrl: vrmUrl?.slice(-50),
        isVRM,
        vrmFailed,
      });
    }
  }, [selectedAsset?.id, modelUrl, modelUrlIsVrm, explicitVrmUrl, vrmUrl, isVRM, vrmFailed]);

  // Handle retexture - calls real API
  const handleRetexture = useCallback(async () => {
    if (!selectedAsset?.id) {
      toast({
        title: "No asset selected",
        description: "Select an asset from the vault to retexture it.",
        variant: "default",
      });
      return;
    }
    if (isVRM) {
      toast({
        title: "Not available for VRM",
        description: "Retexturing is not available for character assets.",
        variant: "default",
      });
      return;
    }

    // Open enhancement panel with retexture tab
    setViewportPanel("enhancement");
    log.info("Opening retexture panel for asset:", selectedAsset.id);
  }, [selectedAsset, isVRM, setViewportPanel, toast]);

  // Handle regenerate - calls real API
  const handleRegenerate = useCallback(async () => {
    if (!selectedAsset?.id) {
      toast({
        title: "No asset selected",
        description: "Select an asset from the vault to regenerate it.",
        variant: "default",
      });
      return;
    }
    if (isVRM) {
      toast({
        title: "Not available for VRM",
        description: "Regeneration is not available for character assets.",
        variant: "default",
      });
      return;
    }

    // Open enhancement panel with regenerate tab
    setViewportPanel("enhancement");
    log.info("Opening regenerate panel for asset:", selectedAsset.id);
  }, [selectedAsset, isVRM, setViewportPanel, toast]);

  // Handle sprites generation
  const handleSprites = useCallback(async () => {
    if (!selectedAsset?.id || !selectedAsset?.name) {
      toast({
        title: "No asset selected",
        description: "Select an asset from the vault to generate sprites.",
        variant: "default",
      });
      return;
    }

    setIsProcessing(true);
    log.info("Generating sprites for asset:", selectedAsset.id);

    try {
      // Get asset source to determine storage location
      const assetSource = (selectedAsset as { source?: string }).source;

      const response = await fetch("/api/sprites/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: selectedAsset.id,
          assetName: selectedAsset.name,
          assetDescription: selectedAsset.description,
          assetCategory: selectedAsset.category,
          views: ["front", "side", "back", "isometric"],
          style: "clean",
          updateThumbnail: true,
          source: assetSource, // Pass source for proper storage handling
        }),
      });

      const result = await response.json();

      if (result.success) {
        log.info(
          `Generated ${result.sprites.length} sprites`,
          result.thumbnailUrl ? `Thumbnail: ${result.thumbnailUrl}` : "",
        );

        // Save thumbnail override for this asset (for CDN assets with local sprites)
        if (result.thumbnailUrl && selectedAsset.id) {
          setThumbnailOverride(selectedAsset.id, result.thumbnailUrl);
          log.info(
            `Saved thumbnail override for ${selectedAsset.id}: ${result.thumbnailUrl}`,
          );
        }

        toast({
          title: "Sprites generated",
          description: `Successfully generated ${result.sprites.length} sprites!${result.thumbnailUrl ? " Thumbnail updated." : ""}`,
          variant: "success",
        });
      } else {
        log.error("Sprite generation failed:", result.error);
        toast({
          title: "Sprite generation failed",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      log.error("Sprite generation error:", error);
      toast({
        title: "Sprite generation error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedAsset, toast, setThumbnailOverride]);

  // Handle settings modal
  const handleSettings = useCallback(() => {
    setSettingsModalOpen(true);
  }, []);

  // Handle model load - capture mesh stats
  const handleModelLoad = useCallback((info: ModelInfo) => {
    setModelInfo(info);
    log.info("Model loaded with stats:", info);
  }, []);

  // Handle toggle visibility
  const handleToggleVisibility = useCallback(() => {
    setShowModel(!showModel);
  }, [showModel]);

  // Handle toggle theme
  const handleToggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  // Handle capture screenshot
  const handleCapture = useCallback(() => {
    // Get canvas element from the DOM
    const canvas = document.querySelector("canvas");
    if (!canvas) {
      log.warn("No canvas found for capture");
      return;
    }

    // Create download link
    const link = document.createElement("a");
    link.download = `${selectedAsset?.name || "capture"}-${Date.now().toString(36).slice(-6)}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [selectedAsset]);

  // #region agent log - Debug instrumentation
  if (typeof window !== "undefined") {
    fetch("http://127.0.0.1:7242/ingest/ef06d7d2-0f29-426d-9574-6692c61c9819", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "Viewport3D.tsx:162",
        message: "Viewport3D render POST-FIX-v4",
        data: {
          isVRM,
          vrmUrl: vrmUrl?.slice(-50),
          validExplicitVrmUrl: validExplicitVrmUrl?.slice(-50),
          explicitVrmUrl: explicitVrmUrl?.slice(-50),
          modelUrl: selectedAsset?.modelUrl?.slice(-50),
          modelUrlIsVrm,
          assetId: selectedAsset?.id,
          willUseVRMViewer: !!(isVRM && vrmUrl),
          showModel,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        runId: "post-fix-v4",
        hypothesisId: "A",
      }),
    }).catch(() => {});
  }
  // #endregion

  // Use VRMViewer for VRM assets (standalone component with its own canvas)
  if (isVRM && vrmUrl && showModel) {
    return (
      <div className="relative h-full w-full bg-gradient-to-b from-zinc-900 to-zinc-950">
        <VRMViewer
          key={vrmUrl} // Force remount when VRM URL changes to clean up old model
          vrmUrl={vrmUrl}
          className="h-full w-full"
          onLoad={(vrm, info) => {
            log.info("VRM loaded via VRMViewer:", info);
          }}
          onError={(error) => {
            log.info("VRM load failed, falling back to GLB viewer:", { 
              message: error.message, 
              vrmUrl,
              modelUrl: selectedAsset?.modelUrl 
            });
            setVrmFailed(true);
          }}
        />

        {/* Viewport Controls - Top Left */}
        <ViewportControls
          isVRM={isVRM}
          isProcessing={isProcessing}
          onRetexture={handleRetexture}
          onRegenerate={handleRegenerate}
          onSprites={handleSprites}
          onToggleVisibility={handleToggleVisibility}
          onToggleGrid={() =>
            setViewportSettings((s) => ({ ...s, showGrid: !s.showGrid }))
          }
          onToggleTheme={handleToggleTheme}
          onRefresh={() => window.location.reload()}
          onCapture={handleCapture}
          onSettings={handleSettings}
        />

        {/* Environment Controls - Bottom Right */}
        <EnvironmentControls
          environment={environment}
          onEnvironmentChange={(env) =>
            setViewportSettings((s) => ({ ...s, environment: env }))
          }
        />

        {/* Shortcuts - Bottom Left */}
        <ViewportShortcuts />

        {/* Viewport Panel Overlay - Right Side */}
        {viewportPanel !== "none" && (
          <ViewportPanelOverlay
            panelType={viewportPanel}
            selectedAsset={selectedAsset}
            onClose={closeViewportPanel}
            onSwitchPanel={setViewportPanel}
            onAssetDeleted={onAssetDeleted}
            modelInfo={null}
          />
        )}

        {/* Viewport Settings Modal */}
        <ViewportSettingsModal
          isOpen={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
          settings={viewportSettings}
          onSettingsChange={setViewportSettings}
        />
      </div>
    );
  }

  // Use R3F Canvas for regular GLB/GLTF models
  return (
    <div className="relative h-full w-full bg-gradient-to-b from-zinc-900 to-zinc-950">
      <Canvas
        camera={{ position: [3, 2, 3], fov: viewportSettings.cameraFov }}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={viewportSettings.ambientIntensity} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={viewportSettings.directionalIntensity}
            castShadow
          />
          <Environment
            preset={
              environmentPresets[
                environment as keyof typeof environmentPresets
              ] || "studio"
            }
          />

          {/* Model - key forces remount when URL changes to clean up old model */}
          {showModel && (
            <ModelViewer
              key={selectedAsset?.modelUrl || "no-model"}
              modelUrl={selectedAsset?.modelUrl}
              onModelLoad={handleModelLoad}
            />
          )}

          {/* Grid */}
          {showGrid && (
            <Grid
              args={[viewportSettings.gridSize, viewportSettings.gridSize]}
              cellSize={0.5}
              cellThickness={0.5}
              cellColor="#333"
              sectionSize={2}
              sectionThickness={1}
              sectionColor="#444"
              fadeDistance={15}
              fadeStrength={1}
              followCamera={false}
              infiniteGrid
            />
          )}

          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={viewportSettings.autoRotate}
            autoRotateSpeed={2}
            minDistance={1}
            maxDistance={20}
            target={[0, 0.5, 0]}
          />
        </Suspense>
      </Canvas>

      {/* Viewport Controls - Top Left */}
      <ViewportControls
        isVRM={isVRM}
        isProcessing={isProcessing}
        onRetexture={handleRetexture}
        onRegenerate={handleRegenerate}
        onSprites={handleSprites}
        onToggleVisibility={handleToggleVisibility}
        onToggleGrid={() =>
          setViewportSettings((s) => ({ ...s, showGrid: !s.showGrid }))
        }
        onToggleTheme={handleToggleTheme}
        onRefresh={() => window.location.reload()}
        onCapture={handleCapture}
        onSettings={handleSettings}
      />

      {/* Environment Controls - Bottom Right */}
      <EnvironmentControls
        environment={environment}
        onEnvironmentChange={(env) =>
          setViewportSettings((s) => ({ ...s, environment: env }))
        }
      />

      {/* Shortcuts - Bottom Left */}
      <ViewportShortcuts />

      {/* Viewport Panel Overlay - Right Side */}
      {viewportPanel !== "none" && (
        <ViewportPanelOverlay
          panelType={viewportPanel}
          selectedAsset={selectedAsset}
          onClose={closeViewportPanel}
          onSwitchPanel={setViewportPanel}
          onAssetDeleted={onAssetDeleted}
          modelInfo={modelInfo}
        />
      )}

      {/* Viewport Settings Modal */}
      <ViewportSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={viewportSettings}
        onSettingsChange={setViewportSettings}
      />
    </div>
  );
}

/** Panel overlay component rendered inside the viewport */
function ViewportPanelOverlay({
  panelType,
  selectedAsset,
  onClose,
  onSwitchPanel,
  onAssetDeleted,
  modelInfo,
}: {
  panelType: ViewportPanelType;
  selectedAsset?: BaseAsset | null;
  onClose: () => void;
  onSwitchPanel: (panel: ViewportPanelType) => void;
  onAssetDeleted?: (assetId: string) => void;
  modelInfo?: ModelInfo | null;
}) {
  const panelConfig: Record<
    ViewportPanelType,
    { title: string; showAssetSwitcher: boolean }
  > = {
    none: { title: "", showAssetSwitcher: false },
    generation: { title: "Generate Asset", showAssetSwitcher: false },
    properties: { title: "Properties", showAssetSwitcher: true },
    enhancement: { title: "Enhance Asset", showAssetSwitcher: true },
    "character-equipment": {
      title: "Character Equipment",
      showAssetSwitcher: false,
    },
    "armor-fitting": { title: "Armor Fitting", showAssetSwitcher: false },
    "hand-rigging": { title: "Hand Rigging", showAssetSwitcher: false },
    retargeting: { title: "Retargeting", showAssetSwitcher: false },
    "audio-studio": { title: "Audio Studio", showAssetSwitcher: false },
  };

  const config = panelConfig[panelType];

  const getPanelSubtitle = () => {
    if (selectedAsset && config.showAssetSwitcher) {
      return selectedAsset.name;
    }
    return null;
  };

  return (
    <div className="absolute top-4 right-4 bottom-4 w-96 bg-glass-bg/95 backdrop-blur-xl border border-glass-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
      {/* Panel Header */}
      <div className="flex items-center justify-between p-3 border-b border-glass-border bg-glass-bg/50">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            {config.title}
          </h3>
          {getPanelSubtitle() && (
            <p className="text-xs text-muted-foreground truncate">
              {getPanelSubtitle()}
            </p>
          )}
        </div>

        {/* Panel switcher for asset-related panels */}
        {selectedAsset && config.showAssetSwitcher && (
          <div className="flex gap-1 mr-2">
            <button
              onClick={() => onSwitchPanel("properties")}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                panelType === "properties"
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-glass-bg"
              }`}
            >
              Info
            </button>
            <button
              onClick={() => onSwitchPanel("enhancement")}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                panelType === "enhancement"
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-muted-foreground hover:text-foreground hover:bg-glass-bg"
              }`}
            >
              Enhance
            </button>
          </div>
        )}

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-glass-bg transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-hidden">
        {panelType === "generation" && <GenerationPanel />}

        {panelType === "properties" && selectedAsset && (
          <PropertiesPanel
            asset={selectedAsset as HyperForgeAsset}
            isOpen={true}
            onClose={onClose}
            onAssetDeleted={onAssetDeleted}
            isViewportOverlay
            modelInfo={modelInfo}
          />
        )}

        {panelType === "enhancement" && selectedAsset && (
          <EnhancementPanel
            asset={selectedAsset as HyperForgeAsset}
            onClose={onClose}
            hideHeader
          />
        )}

        {panelType === "character-equipment" && (
          <CharacterEquipmentPanel selectedAsset={selectedAsset as HyperForgeAsset | null} />
        )}

        {panelType === "armor-fitting" && (
          <ArmorFittingPanel selectedAsset={selectedAsset as HyperForgeAsset | null} />
        )}

        {panelType === "hand-rigging" && (
          <HandRiggingPanel selectedAsset={selectedAsset as HyperForgeAsset | null} />
        )}

        {panelType === "retargeting" && (
          <RetargetingPanel selectedAsset={selectedAsset as HyperForgeAsset | null} />
        )}

        {panelType === "audio-studio" && <AudioStudioPanel />}

        {(panelType === "properties" || panelType === "enhancement") &&
          !selectedAsset && (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
              Select an asset from the vault to view details
            </div>
          )}
      </div>
    </div>
  );
}
