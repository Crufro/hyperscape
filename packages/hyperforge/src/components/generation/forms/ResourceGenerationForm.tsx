"use client";

import { useState } from "react";
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
}

export function ResourceGenerationForm({
  onGenerate,
  onCancel,
}: ResourceGenerationFormProps) {
  const [prompt, setPrompt] = useState("");
  const [pipeline, setPipeline] = useState<"text-to-3d" | "image-to-3d">(
    "text-to-3d",
  );
  const [imageUrl, setImageUrl] = useState("");
  const [quality, setQuality] = useState<"preview" | "medium" | "high">("high");
  const [name, setName] = useState("");
  const [type, setType] = useState("tree");
  const [examine, setExamine] = useState("");
  const [harvestSkill, setHarvestSkill] = useState("woodcutting");
  const [toolRequired, setToolRequired] = useState("");
  const [levelRequired, setLevelRequired] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [depletedScale, setDepletedScale] = useState(0.3);

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
