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

interface ResourceGenerationFormProps {
  onGenerate: (config: GenerationConfig) => void;
  onCancel: () => void;
  /** Initial config from preset selection */
  initialConfig?: Partial<GenerationConfig>;
}

export function ResourceGenerationForm({
  onGenerate,
  onCancel,
  initialConfig,
}: ResourceGenerationFormProps) {
  // Extract metadata for initializing form fields
  const meta = initialConfig?.metadata as Record<string, unknown> | undefined;

  const [prompt, setPrompt] = useState(initialConfig?.prompt ?? "");
  const [pipeline, setPipeline] = useState<"text-to-3d" | "image-to-3d">(
    initialConfig?.pipeline ?? "text-to-3d",
  );
  const [imageUrl, setImageUrl] = useState(initialConfig?.imageUrl ?? "");
  const [quality, setQuality] = useState<"preview" | "medium" | "high">(
    initialConfig?.quality ?? "high"
  );
  const [name, setName] = useState((meta?.name as string) ?? "");
  const [type, setType] = useState((meta?.resourceType as string) ?? "tree");
  const [examine, setExamine] = useState((meta?.examine as string) ?? "");
  const [harvestSkill, setHarvestSkill] = useState((meta?.skill as string) ?? "woodcutting");
  const [toolRequired, setToolRequired] = useState((meta?.toolRequired as string) ?? "");
  const [levelRequired, setLevelRequired] = useState((meta?.level as number) ?? 1);
  const [scale, setScale] = useState((meta?.scale as number) ?? 1.0);
  const [depletedScale, setDepletedScale] = useState((meta?.depletedScale as number) ?? 0.3);

  // Update form when preset changes
  useEffect(() => {
    if (initialConfig) {
      const m = initialConfig.metadata as Record<string, unknown> | undefined;
      if (initialConfig.prompt) setPrompt(initialConfig.prompt);
      if (initialConfig.pipeline) setPipeline(initialConfig.pipeline);
      if (initialConfig.imageUrl) setImageUrl(initialConfig.imageUrl);
      if (initialConfig.quality) setQuality(initialConfig.quality);
      if (m?.name) setName(m.name as string);
      if (m?.resourceType) setType(m.resourceType as string);
      if (m?.examine) setExamine(m.examine as string);
      if (m?.skill) setHarvestSkill(m.skill as string);
      if (m?.toolRequired) setToolRequired(m.toolRequired as string);
      if (typeof m?.level === "number") setLevelRequired(m.level);
      if (typeof m?.scale === "number") setScale(m.scale);
      if (typeof m?.depletedScale === "number") setDepletedScale(m.depletedScale);
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
        toolRequired: toolRequired || null,
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
