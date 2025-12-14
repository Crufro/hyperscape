"use client";

import { useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid } from "@react-three/drei";
import { Suspense } from "react";
import { X } from "lucide-react";
import { ModelViewer } from "./ModelViewer";
import { ViewportControls } from "./ViewportControls";
import { EnvironmentControls } from "./EnvironmentControls";
import { ViewportShortcuts } from "./ViewportShortcuts";
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
import type { AssetData } from "@/types/asset";

interface Viewport3DProps {
  selectedAsset?: AssetData | null;
}

export function Viewport3D({ selectedAsset }: Viewport3DProps) {
  const { viewportPanel, closeViewportPanel, setViewportPanel } = useAppStore();
  const [environment, setEnvironment] = useState("studio");
  const [showGrid, setShowGrid] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const environmentPresets = {
    neutral: "warehouse",
    studio: "studio",
    outdoor: "sunset",
    indoor: "apartment",
    night: "night",
  };

  // Check if current asset is a VRM file
  const isVRM =
    selectedAsset?.modelUrl?.toLowerCase().includes(".vrm") ||
    selectedAsset?.modelUrl?.includes("/model.vrm") ||
    (selectedAsset as { hasVRM?: boolean } | undefined)?.hasVRM === true;

  // Handle retexture - calls real API
  const handleRetexture = useCallback(async () => {
    if (!selectedAsset?.id || isVRM) return;

    // Open enhancement panel with retexture tab
    setViewportPanel("enhancement");
    console.log(
      "[Viewport] Opening retexture panel for asset:",
      selectedAsset.id,
    );
  }, [selectedAsset, isVRM, setViewportPanel]);

  // Handle regenerate - calls real API
  const handleRegenerate = useCallback(async () => {
    if (!selectedAsset?.id || isVRM) return;

    // Open enhancement panel with regenerate tab
    setViewportPanel("enhancement");
    console.log(
      "[Viewport] Opening regenerate panel for asset:",
      selectedAsset.id,
    );
  }, [selectedAsset, isVRM, setViewportPanel]);

  // Handle sprites generation
  const handleSprites = useCallback(async () => {
    if (!selectedAsset?.id) return;

    // For now, sprites generation opens the enhancement panel
    // TODO: Add dedicated sprites API endpoint
    console.log("[Viewport] Sprites requested for asset:", selectedAsset.id);
    alert(
      "Sprites generation coming soon! Select the asset and use the Sprites tab in the enhancement panel.",
    );
  }, [selectedAsset]);

  // Handle edit - open properties panel
  const handleEdit = useCallback(() => {
    if (selectedAsset) {
      setViewportPanel("properties");
    }
  }, [selectedAsset, setViewportPanel]);

  return (
    <div className="relative h-full w-full bg-gradient-to-b from-zinc-900 to-zinc-950">
      <Canvas
        camera={{ position: [3, 2, 3], fov: 50 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          <Environment
            preset={
              environmentPresets[
                environment as keyof typeof environmentPresets
              ] || "studio"
            }
          />

          {/* Model */}
          <ModelViewer modelUrl={selectedAsset?.modelUrl} />

          {/* Grid */}
          {showGrid && (
            <Grid
              args={[10, 10]}
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
        onEdit={handleEdit}
        onToggleVisibility={() => console.log("Toggle visibility")}
        onToggleGrid={() => setShowGrid(!showGrid)}
        onToggleTheme={() => console.log("Toggle theme")}
        onRefresh={() => window.location.reload()}
        onCapture={() => console.log("Capture")}
        onSettings={() => setViewportPanel("properties")}
      />

      {/* Environment Controls - Bottom Right */}
      <EnvironmentControls
        environment={environment}
        onEnvironmentChange={setEnvironment}
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
        />
      )}
    </div>
  );
}

/** Panel overlay component rendered inside the viewport */
function ViewportPanelOverlay({
  panelType,
  selectedAsset,
  onClose,
  onSwitchPanel,
}: {
  panelType: ViewportPanelType;
  selectedAsset?: AssetData | null;
  onClose: () => void;
  onSwitchPanel: (panel: ViewportPanelType) => void;
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
            asset={selectedAsset}
            isOpen={true}
            onClose={onClose}
            isViewportOverlay
          />
        )}

        {panelType === "enhancement" && selectedAsset && (
          <EnhancementPanel
            asset={selectedAsset}
            onClose={onClose}
            hideHeader
          />
        )}

        {panelType === "character-equipment" && (
          <CharacterEquipmentPanel selectedAsset={selectedAsset} />
        )}

        {panelType === "armor-fitting" && (
          <ArmorFittingPanel selectedAsset={selectedAsset} />
        )}

        {panelType === "hand-rigging" && (
          <HandRiggingPanel selectedAsset={selectedAsset} />
        )}

        {panelType === "retargeting" && (
          <RetargetingPanel selectedAsset={selectedAsset} />
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
