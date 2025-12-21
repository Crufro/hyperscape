"use client";

import { useState, useEffect } from "react";
import { PromptInput } from "../PromptInput";
import { PipelineSelector } from "../PipelineSelector";
import { Select } from "@/components/ui/select";
import { NeonInput } from "@/components/ui/neon-input";
import { Label } from "@/components/ui/label";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { Slider } from "@/components/ui/slider";
import type { GenerationConfig } from "../GenerationFormRouter";
import {
  generateAssetId,
  getDefaultMetadata,
} from "@/lib/generation/category-schemas";
import {
  getStringProperty,
  getNumberProperty,
  isObject,
} from "@/types/guards";

interface ResourceGenerationFormProps {
  onGenerate: (config: GenerationConfig) => void;
  onCancel: () => void;
  /** Initial config from preset selection */
  initialConfig?: Partial<GenerationConfig>;
}

/**
 * Extract resource form values from metadata using type-safe property access
 */
function extractResourceMetadata(metadata: unknown) {
  if (!isObject(metadata)) {
    return {
      name: "",
      resourceType: "tree",
      examine: "",
      skill: "woodcutting",
      toolRequired: "",
      level: 1,
      scale: 1.0,
      depletedScale: 0.3,
    };
  }

  return {
    name: getStringProperty(metadata, "name") ?? "",
    resourceType: getStringProperty(metadata, "resourceType") ?? "tree",
    examine: getStringProperty(metadata, "examine") ?? "",
    skill: getStringProperty(metadata, "skill") ?? "woodcutting",
    toolRequired: getStringProperty(metadata, "toolRequired") ?? "",
    level: getNumberProperty(metadata, "level") ?? 1,
    scale: getNumberProperty(metadata, "scale") ?? 1.0,
    depletedScale: getNumberProperty(metadata, "depletedScale") ?? 0.3,
  };
}

export function ResourceGenerationForm({
  onGenerate,
  onCancel,
  initialConfig,
}: ResourceGenerationFormProps) {
  // Extract metadata using type-safe helper
  const initialMeta = extractResourceMetadata(initialConfig?.metadata);

  const [prompt, setPrompt] = useState(initialConfig?.prompt ?? "");
  const [pipeline, setPipeline] = useState<"text-to-3d" | "image-to-3d">(
    initialConfig?.pipeline ?? "text-to-3d",
  );
  const [imageUrl, setImageUrl] = useState(initialConfig?.imageUrl ?? "");
  const [quality, setQuality] = useState<"preview" | "medium" | "high">(
    initialConfig?.quality ?? "high"
  );
  const [name, setName] = useState(initialMeta.name);
  const [type, setType] = useState(initialMeta.resourceType);
  const [examine, setExamine] = useState(initialMeta.examine);
  const [harvestSkill, setHarvestSkill] = useState(initialMeta.skill);
  const [toolRequired, setToolRequired] = useState(initialMeta.toolRequired);
  const [levelRequired, setLevelRequired] = useState(initialMeta.level);
  const [scale, setScale] = useState(initialMeta.scale);
  const [depletedScale, setDepletedScale] = useState(initialMeta.depletedScale);

  // Update form when preset changes
  useEffect(() => {
    if (initialConfig) {
      const meta = extractResourceMetadata(initialConfig.metadata);
      if (initialConfig.prompt) setPrompt(initialConfig.prompt);
      if (initialConfig.pipeline) setPipeline(initialConfig.pipeline);
      if (initialConfig.imageUrl) setImageUrl(initialConfig.imageUrl);
      if (initialConfig.quality) setQuality(initialConfig.quality);
      if (meta.name) setName(meta.name);
      if (meta.resourceType) setType(meta.resourceType);
      if (meta.examine) setExamine(meta.examine);
      if (meta.skill) setHarvestSkill(meta.skill);
      if (meta.toolRequired) setToolRequired(meta.toolRequired);
      setLevelRequired(meta.level);
      setScale(meta.scale);
      setDepletedScale(meta.depletedScale);
    }
  }, [initialConfig]);

  const handleGenerate = () => {
    const assetId = generateAssetId(name || prompt, "resource");
    const defaults = getDefaultMetadata("resource", {
      scale,
      depletedScale,
      levelRequired,
    });

    const config: GenerationConfig = {
      category: "resource",
      prompt: prompt || `A ${type} resource: ${name || "resource"}`,
      pipeline,
      imageUrl: imageUrl || undefined,
      quality,
      metadata: {
        id: assetId,
        name: name || assetId,
        type,
        examine: examine || `A ${name || type}`,
        harvestSkill,
        toolRequired: toolRequired || undefined,
        levelRequired,
        scale,
        depletedScale,
        ...defaults,
      },
    };

    onGenerate(config);
  };

  const typeOptions = [
    { value: "tree", label: "Tree" },
    { value: "ore", label: "Ore" },
    { value: "rock", label: "Rock" },
    { value: "plant", label: "Plant" },
    { value: "herb", label: "Herb" },
  ];

  const skillOptions = [
    { value: "woodcutting", label: "Woodcutting" },
    { value: "mining", label: "Mining" },
    { value: "farming", label: "Farming" },
    { value: "herblore", label: "Herblore" },
  ];

  const qualityOptions = [
    { value: "standard", label: "Standard" },
    { value: "high", label: "High" },
    { value: "ultra", label: "Ultra" },
  ];

  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-lg font-semibold mb-4">3D Model Generation</h3>
        <div className="space-y-4">
          <PipelineSelector value={pipeline} onChange={setPipeline} />

          {pipeline === "image-to-3d" && (
            <div className="space-y-2">
              <Label>Image URL</Label>
              <NeonInput
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          )}

          <PromptInput
            value={prompt}
            onChange={setPrompt}
            placeholder="Describe the resource (e.g., 'A tall oak tree with thick trunk')"
          />

          <div className="space-y-2">
            <Label>Quality</Label>
            <Select
              value={quality}
              onChange={(value) =>
                setQuality(value as "preview" | "medium" | "high")
              }
              options={qualityOptions}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-glass-border pt-6">
        <h3 className="text-lg font-semibold mb-4">Resource Properties</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <NeonInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Oak Tree"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onChange={setType} options={typeOptions} />
            </div>

            <div className="space-y-2">
              <Label>Harvest Skill</Label>
              <Select
                value={harvestSkill}
                onChange={setHarvestSkill}
                options={skillOptions}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Examine Text</Label>
            <NeonInput
              value={examine}
              onChange={(e) => setExamine(e.target.value)}
              placeholder="A tall oak tree..."
            />
          </div>

          <div className="space-y-2">
            <Label>Tool Required (optional)</Label>
            <NeonInput
              value={toolRequired}
              onChange={(e) => setToolRequired(e.target.value)}
              placeholder="bronze_hatchet"
            />
          </div>

          <div className="space-y-2">
            <Label>Level Required: {levelRequired}</Label>
            <Slider
              value={[levelRequired]}
              onValueChange={([value]) => setLevelRequired(value)}
              min={1}
              max={99}
              step={1}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Scale: {scale.toFixed(1)}</Label>
              <Slider
                value={[scale]}
                onValueChange={([value]) => setScale(value)}
                min={0.5}
                max={5.0}
                step={0.1}
              />
            </div>

            <div className="space-y-2">
              <Label>Depleted Scale: {depletedScale.toFixed(1)}</Label>
              <Slider
                value={[depletedScale]}
                onValueChange={([value]) => setDepletedScale(value)}
                min={0.1}
                max={1.0}
                step={0.1}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t border-glass-border">
        <SpectacularButton
          onClick={onCancel}
          variant="outline"
          className="flex-1"
        >
          Cancel
        </SpectacularButton>
        <SpectacularButton
          onClick={handleGenerate}
          className="flex-1"
          disabled={!prompt && !imageUrl}
        >
          Generate
        </SpectacularButton>
      </div>
    </div>
  );
}
