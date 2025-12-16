"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  Package,
  User,
  ArrowLeft,
  Wand2,
  Settings2,
  Layers,
  Grid3X3,
  ChevronDown,
  ChevronUp,
  Loader2,
  Camera,
  Box,
  Check,
  Library,
  Hand,
} from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

// Types for prompts
interface StyleDefinition {
  name: string;
  base: string;
  enhanced?: string;
  generation?: string;
  fallback?: string;
}

interface GameStylePrompts {
  version: string;
  default: Record<string, StyleDefinition>;
  custom: Record<string, StyleDefinition>;
}

interface AssetTypeDefinition {
  name: string;
  prompt: string;
  placeholder: string;
}

interface AssetTypePrompts {
  version: string;
  avatar: {
    default: Record<string, AssetTypeDefinition>;
    custom: Record<string, AssetTypeDefinition>;
  };
  item: {
    default: Record<string, AssetTypeDefinition>;
    custom: Record<string, AssetTypeDefinition>;
  };
}

interface MaterialPreset {
  id: string;
  name: string;
  displayName: string;
  category: string;
  tier: number;
  color: string;
  stylePrompt: string;
  description: string;
}

type GenerationType = "item" | "avatar" | null;
type ActiveView = "config" | "progress" | "results";

export default function GeneratePage() {
  // Generation type state
  const [generationType, setGenerationType] = useState<GenerationType>(null);
  const [activeView, setActiveView] = useState<ActiveView>("config");

  // Form state
  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState("weapon");
  const [description, setDescription] = useState("");
  const [gameStyle, setGameStyle] = useState("runescape");

  // Pipeline options
  const [useGPT4Enhancement, setUseGPT4Enhancement] = useState(true);
  const [enableRetexturing, setEnableRetexturing] = useState(true);
  const [enableSprites, setEnableSprites] = useState(false);
  const [enableRigging, setEnableRigging] = useState(true);
  const [enableVRMConversion, setEnableVRMConversion] = useState(true); // VRM conversion for avatars/NPCs
  const [enableHandRigging, setEnableHandRigging] = useState(false); // Add hand bones for finger animation
  const [quality, setQuality] = useState<"preview" | "medium" | "high">(
    "medium",
  );

  // Result state for navigating to VRM viewer
  const [generatedAssetId, setGeneratedAssetId] = useState<string | null>(null);
  const [hasVRM, setHasVRM] = useState(false);
  const [hasHandRigging, setHasHandRigging] = useState(false);

  // Progress state
  const [currentStage, setCurrentStage] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [completedStages, setCompletedStages] = useState<string[]>([]);

  // Material state
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([
    "bronze",
    "steel",
    "mithril",
  ]);
  const [materialPresets, setMaterialPresets] = useState<MaterialPreset[]>([]);

  // Prompt data
  const [gameStylePrompts, setGameStylePrompts] =
    useState<GameStylePrompts | null>(null);
  const [assetTypePrompts, setAssetTypePrompts] =
    useState<AssetTypePrompts | null>(null);

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load prompts on mount
  useEffect(() => {
    async function loadPrompts() {
      try {
        const [styles, types, materials] = await Promise.all([
          fetch("/prompts/game-style-prompts.json").then((r) => r.json()),
          fetch("/prompts/asset-type-prompts.json").then((r) => r.json()),
          fetch("/prompts/material-presets.json").then((r) => r.json()),
        ]);
        setGameStylePrompts(styles);
        setAssetTypePrompts(types);
        setMaterialPresets(materials);
      } catch (error) {
        console.error("Failed to load prompts:", error);
      }
    }
    loadPrompts();
  }, []);

  // Update asset type when generation type changes
  useEffect(() => {
    if (generationType === "avatar") {
      setAssetType("character");
    } else if (generationType === "item") {
      setAssetType("weapon");
    }
  }, [generationType]);

  // Get current asset types for the generation type
  const currentAssetTypes = useMemo(() => {
    if (!assetTypePrompts || !generationType) return {};
    const typeData = assetTypePrompts[generationType];
    return { ...typeData?.default, ...typeData?.custom };
  }, [assetTypePrompts, generationType]);

  // Get all style options
  const allStyles = useMemo(() => {
    if (!gameStylePrompts) return [];
    return [
      ...Object.entries(gameStylePrompts.default).map(([id, style]) => ({
        id,
        ...style,
        isDefault: true,
      })),
      ...Object.entries(gameStylePrompts.custom).map(([id, style]) => ({
        id,
        ...style,
        isDefault: false,
      })),
    ];
  }, [gameStylePrompts]);

  // Toggle material selection
  const toggleMaterial = (materialId: string) => {
    setSelectedMaterials((prev) =>
      prev.includes(materialId)
        ? prev.filter((id) => id !== materialId)
        : [...prev, materialId],
    );
  };

  // Handle generation with streaming progress
  const handleStartGeneration = async () => {
    if (!assetName || !description) {
      alert("Please fill in all required fields");
      return;
    }

    setIsGenerating(true);
    setActiveView("progress");
    setGeneratedAssetId(null);
    setHasVRM(false);
    setHasHandRigging(false);
    setCurrentStage("");
    setCurrentStep("");
    setProgressPercent(0);
    setCompletedStages([]);

    try {
      const response = await fetch("/api/generation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          stream: true, // Enable streaming
          config: {
            prompt: description,
            category: generationType === "avatar" ? "npc" : assetType,
            pipeline: "text-to-3d",
            quality: quality, // preview, medium, or high
            convertToVRM: generationType === "avatar" && enableVRMConversion,
            enableHandRigging: generationType === "avatar" && enableHandRigging,
            useGPT4Enhancement,
            metadata: {
              id: assetName.toLowerCase().replace(/\s+/g, "_"),
              name: assetName,
              description,
              type: assetType,
            },
            assetName,
            assetType,
            description,
            generationType,
            gameStyle,
            enableRetexturing,
            enableSprites,
            enableRigging,
            selectedMaterials: enableRetexturing ? selectedMaterials : [],
            materialPresets: enableRetexturing
              ? materialPresets.filter((p) => selectedMaterials.includes(p.id))
              : [],
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Generation failed");
      }

      // Handle SSE streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "progress") {
                  // Update progress UI
                  if (data.stage) {
                    // Mark previous stage as complete when moving to new stage
                    if (currentStage && data.stage !== currentStage) {
                      setCompletedStages((prev) =>
                        prev.includes(currentStage)
                          ? prev
                          : [...prev, currentStage],
                      );
                    }
                    setCurrentStage(data.stage);
                  }
                  if (data.currentStep) setCurrentStep(data.currentStep);
                  // Check for both progress and percent (generation service uses progress)
                  const progressValue = data.progress ?? data.percent;
                  if (progressValue !== undefined)
                    setProgressPercent(progressValue);
                } else if (data.type === "complete") {
                  const result = data.result;
                  console.log("Generation complete:", result);

                  // Store result info for navigation
                  if (result.metadata?.assetId) {
                    setGeneratedAssetId(result.metadata.assetId);
                  }
                  if (result.hasVRM) {
                    setHasVRM(true);
                  }
                  if (result.hasHandRigging) {
                    setHasHandRigging(true);
                  }

                  setIsGenerating(false);
                  setActiveView("results");
                } else if (data.type === "error") {
                  throw new Error(data.error);
                }
              } catch (e) {
                console.warn("Failed to parse SSE data:", line, e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Generation failed:", error);
      setIsGenerating(false);
      setActiveView("config");
      alert(
        `Generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  // Type selector screen
  if (!generationType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-2">
              What would you like to create?
            </h1>
            <p className="text-muted-foreground">
              Choose your generation type to get started
            </p>
          </div>

          {/* Type Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Items */}
            <button
              onClick={() => setGenerationType("item")}
              className="group relative bg-glass-bg hover:bg-glass-bg/80 border border-glass-border hover:border-cyan-500/50 rounded-xl p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-cyan-500/10 text-left"
            >
              <div className="flex flex-col items-center space-y-4">
                <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center group-hover:bg-cyan-500/20 transition-all">
                  <Package className="w-10 h-10 text-cyan-400" />
                </div>
                <h2 className="text-xl font-semibold">Items</h2>
                <p className="text-sm text-muted-foreground text-center">
                  Weapons, armor, tools, consumables, and other game objects
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {["Weapons", "Armor", "Tools", "Resources"].map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-glass-bg px-2 py-1 rounded text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>

            {/* Avatars */}
            <button
              onClick={() => setGenerationType("avatar")}
              className="group relative bg-glass-bg hover:bg-glass-bg/80 border border-glass-border hover:border-purple-500/50 rounded-xl p-8 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/10 text-left"
            >
              <div className="flex flex-col items-center space-y-4">
                <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center group-hover:bg-purple-500/20 transition-all">
                  <User className="w-10 h-10 text-purple-400" />
                </div>
                <h2 className="text-xl font-semibold">Avatars</h2>
                <p className="text-sm text-muted-foreground text-center">
                  Characters, NPCs, and creatures with auto-rigging support
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {["Auto-Rigging", "VRM Export", "Animations"].map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-glass-bg px-2 py-1 rounded text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          </div>

          {/* Back to Library Link */}
          <div className="text-center mt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Library className="w-4 h-4" />
              Back to Asset Library
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main generation interface
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-glass-border px-6 flex items-center justify-between bg-glass-bg/30 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setGenerationType(null);
              setActiveView("config");
              setAssetName("");
              setDescription("");
            }}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back</span>
          </button>

          <div className="h-6 w-px bg-glass-border" />

          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                generationType === "item"
                  ? "bg-cyan-500/20"
                  : "bg-purple-500/20",
              )}
            >
              {generationType === "item" ? (
                <Package className="w-4 h-4 text-cyan-400" />
              ) : (
                <User className="w-4 h-4 text-purple-400" />
              )}
            </div>
            <span className="font-semibold">
              {generationType === "item"
                ? "Item Generation"
                : "Avatar Generation"}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-glass-bg rounded-lg p-1">
          {[
            { id: "config", label: "Configure" },
            { id: "progress", label: "Progress" },
            { id: "results", label: "Results" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id as ActiveView)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm transition-colors",
                activeView === tab.id
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Library className="w-4 h-4" />
          <span>Library</span>
        </Link>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {activeView === "config" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Asset Details */}
              <GlassPanel className="p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-cyan-400" />
                  Asset Details
                </h2>

                <div className="space-y-4">
                  {/* Asset Name */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Asset Name *
                    </label>
                    <input
                      type="text"
                      value={assetName}
                      onChange={(e) => setAssetName(e.target.value)}
                      placeholder={
                        generationType === "item"
                          ? "e.g., Bronze Longsword"
                          : "e.g., Forest Guardian"
                      }
                      className="w-full px-4 py-2 bg-glass-bg border border-glass-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>

                  {/* Asset Type */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Asset Type
                    </label>
                    <select
                      value={assetType}
                      onChange={(e) => setAssetType(e.target.value)}
                      className="w-full px-4 py-2 bg-glass-bg border border-glass-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      {Object.entries(currentAssetTypes).map(([id, type]) => (
                        <option key={id} value={id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Description *
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={
                        currentAssetTypes[assetType]?.placeholder ||
                        "Describe your asset in detail..."
                      }
                      rows={4}
                      className="w-full px-4 py-2 bg-glass-bg border border-glass-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                    />
                  </div>

                  {/* Game Style */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Art Style
                    </label>
                    <select
                      value={gameStyle}
                      onChange={(e) => setGameStyle(e.target.value)}
                      className="w-full px-4 py-2 bg-glass-bg border border-glass-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      {allStyles.map((style) => (
                        <option key={style.id} value={style.id}>
                          {style.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </GlassPanel>

              {/* Material Variants (Items only) */}
              {generationType === "item" && enableRetexturing && (
                <GlassPanel className="p-6">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-cyan-400" />
                    Material Variants
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select materials to generate texture variants for your asset
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {materialPresets.map((material) => (
                      <button
                        key={material.id}
                        onClick={() => toggleMaterial(material.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all",
                          selectedMaterials.includes(material.id)
                            ? "border-cyan-500/50 bg-cyan-500/10"
                            : "border-glass-border hover:border-glass-border/80 hover:bg-glass-bg/50",
                        )}
                      >
                        <div
                          className="w-6 h-6 rounded-full border-2 border-white/20"
                          style={{ backgroundColor: material.color }}
                        />
                        <span className="text-sm font-medium">
                          {material.displayName}
                        </span>
                        {selectedMaterials.includes(material.id) && (
                          <Check className="w-4 h-4 text-cyan-400 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </GlassPanel>
              )}

              {/* Advanced Options */}
              <GlassPanel className="p-6">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full flex items-center justify-between"
                >
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Settings2 className="w-5 h-5 text-cyan-400" />
                    Advanced Options
                  </h2>
                  {showAdvanced ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="mt-4 space-y-4 pt-4 border-t border-glass-border">
                    <p className="text-sm text-muted-foreground">
                      Fine-tune your generation with custom prompts and settings
                    </p>
                    {/* Add more advanced options here */}
                  </div>
                )}
              </GlassPanel>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Pipeline Options */}
              <GlassPanel className="p-6">
                <h2 className="text-lg font-semibold mb-4">Pipeline Options</h2>

                <div className="space-y-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm">GPT-4 Enhancement</span>
                    <Checkbox
                      checked={useGPT4Enhancement}
                      onCheckedChange={() =>
                        setUseGPT4Enhancement(!useGPT4Enhancement)
                      }
                    />
                  </label>

                  {generationType === "item" && (
                    <>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm">Material Retexturing</span>
                        <Checkbox
                          checked={enableRetexturing}
                          onCheckedChange={() =>
                            setEnableRetexturing(!enableRetexturing)
                          }
                        />
                      </label>

                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm">2D Sprites</span>
                        <Checkbox
                          checked={enableSprites}
                          onCheckedChange={() =>
                            setEnableSprites(!enableSprites)
                          }
                        />
                      </label>
                    </>
                  )}

                  {generationType === "avatar" && (
                    <>
                      {/* Meshy Auto-Rigging - uses Meshy's rigging API */}
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-sm">Meshy Auto-Rigging</span>
                          <p className="text-xs text-muted-foreground">
                            Humanoid skeleton via Meshy API
                          </p>
                        </div>
                        <Checkbox
                          checked={enableRigging}
                          onCheckedChange={() =>
                            setEnableRigging(!enableRigging)
                          }
                        />
                      </label>

                      {/* Hand Rigging - our custom finger bone addition */}
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-sm">Hand Rigging</span>
                          <p className="text-xs text-muted-foreground">
                            Add finger bones (custom)
                          </p>
                        </div>
                        <Checkbox
                          checked={enableHandRigging}
                          onCheckedChange={() =>
                            setEnableHandRigging(!enableHandRigging)
                          }
                        />
                      </label>

                      {/* VRM Conversion - our custom VRM 1.0 converter */}
                      <label className="flex items-center justify-between cursor-pointer">
                        <div>
                          <span className="text-sm">VRM 1.0 Conversion</span>
                          <p className="text-xs text-muted-foreground">
                            Export for VRChat/animation (custom)
                          </p>
                        </div>
                        <Checkbox
                          checked={enableVRMConversion}
                          onCheckedChange={() =>
                            setEnableVRMConversion(!enableVRMConversion)
                          }
                        />
                      </label>
                    </>
                  )}

                  {/* Meshy AI Model Quality */}
                  <div>
                    <label className="block text-sm mb-2">AI Model</label>
                    <select
                      value={quality}
                      onChange={(e) =>
                        setQuality(e.target.value as typeof quality)
                      }
                      className="w-full px-3 py-2 bg-glass-bg border border-glass-border rounded-lg text-sm"
                    >
                      <option value="preview">
                        Meshy-4 (Fast, Lower Quality)
                      </option>
                      <option value="medium">Meshy-5 (Balanced)</option>
                      <option value="high">
                        Meshy-6 / Latest (Best Quality)
                      </option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Higher quality = longer generation time
                    </p>
                  </div>
                </div>
              </GlassPanel>

              {/* Generate Button */}
              <SpectacularButton
                onClick={handleStartGeneration}
                disabled={!assetName || !description || isGenerating}
                className="w-full h-14"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Start Generation
                  </>
                )}
              </SpectacularButton>
            </div>
          </div>
        )}

        {activeView === "progress" && (
          <div className="max-w-2xl mx-auto">
            <GlassPanel className="p-8 text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-cyan-400 animate-spin" />
              <h2 className="text-xl font-semibold mb-2">
                Generating Your Asset
              </h2>
              <p className="text-muted-foreground mb-2">
                {currentStep || "Starting generation pipeline..."}
              </p>

              {/* Overall Progress Bar */}
              <div className="w-full bg-glass-bg rounded-full h-2 mb-6">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Pipeline Stages */}
              <div className="space-y-3 text-left">
                {[
                  {
                    id: "Prompt Enhancement",
                    label: "Prompt Enhancement",
                    icon: Wand2,
                  },
                  {
                    id: "Text-to-3D Preview",
                    label: "3D Preview Generation",
                    icon: Box,
                  },
                  {
                    id: "Text-to-3D Refine",
                    label: "3D Model Refinement",
                    icon: Box,
                  },
                  ...(enableRigging && generationType === "avatar"
                    ? [
                        {
                          id: "Meshy Auto-Rigging",
                          label: "Auto-Rigging (Meshy)",
                          icon: User,
                        },
                      ]
                    : []),
                  ...(enableHandRigging && generationType === "avatar"
                    ? [
                        {
                          id: "Hand Rigging",
                          label: "Hand Rigging",
                          icon: Hand,
                        },
                      ]
                    : []),
                  ...(enableVRMConversion && generationType === "avatar"
                    ? [
                        {
                          id: "VRM Conversion",
                          label: "VRM Conversion",
                          icon: User,
                        },
                      ]
                    : []),
                  { id: "Saving", label: "Saving Asset", icon: Package },
                ].map((stage) => {
                  const isCompleted = completedStages.includes(stage.id);
                  const isActive = currentStage === stage.id;

                  return (
                    <div
                      key={stage.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg transition-all",
                        isActive
                          ? "bg-cyan-500/20 border border-cyan-500/30"
                          : isCompleted
                            ? "bg-green-500/10"
                            : "bg-glass-bg/50",
                      )}
                    >
                      <stage.icon
                        className={cn(
                          "w-5 h-5",
                          isActive
                            ? "text-cyan-400"
                            : isCompleted
                              ? "text-green-400"
                              : "text-muted-foreground",
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm",
                          isActive
                            ? "text-cyan-400 font-medium"
                            : isCompleted
                              ? "text-green-400"
                              : "",
                        )}
                      >
                        {stage.label}
                      </span>
                      <div className="ml-auto">
                        {isActive ? (
                          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                        ) : isCompleted ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-glass-border" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassPanel>
          </div>
        )}

        {activeView === "results" && (
          <div className="text-center py-12">
            <GlassPanel className="p-8 max-w-lg mx-auto">
              <Check className="w-12 h-12 mx-auto mb-4 text-green-400" />
              <h2 className="text-xl font-semibold mb-2">
                Generation Complete!
              </h2>
              <p className="text-muted-foreground mb-4">
                Your asset has been generated and saved to your library
              </p>

              {/* Feature Badges */}
              <div className="mb-6 flex flex-wrap gap-2 justify-center">
                {hasVRM && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/20 text-cyan-400 text-sm">
                    <User className="w-4 h-4" />
                    VRM Format
                  </div>
                )}
                {hasHandRigging && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-400 text-sm">
                    <Hand className="w-4 h-4" />
                    Hand Bones
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {/* Test Animations Button - only shown when VRM was generated */}
                {hasVRM && generatedAssetId && (
                  <Link
                    href={`/studio/retarget?asset=${generatedAssetId}`}
                    className="w-full"
                  >
                    <SpectacularButton className="w-full">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Test Animations with VRM
                    </SpectacularButton>
                  </Link>
                )}

                <div className="flex gap-3 justify-center">
                  <SpectacularButton
                    variant="outline"
                    onClick={() => {
                      setActiveView("config");
                      setAssetName("");
                      setDescription("");
                      setGeneratedAssetId(null);
                      setHasVRM(false);
                      setHasHandRigging(false);
                    }}
                  >
                    Generate Another
                  </SpectacularButton>

                  <Link href="/">
                    <SpectacularButton>
                      <Library className="w-4 h-4 mr-2" />
                      View in Library
                    </SpectacularButton>
                  </Link>
                </div>
              </div>
            </GlassPanel>
          </div>
        )}
      </main>
    </div>
  );
}
