"use client";

import { useState } from "react";
import { PromptInput } from "../PromptInput";
import { PipelineSelector } from "../PipelineSelector";
import { Select } from "@/components/ui/select";
import { NeonInput } from "@/components/ui/neon-input";
import { Label } from "@/components/ui/label";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import type { GenerationConfig } from "../GenerationFormRouter";
import {
  generateAssetId,
  getDefaultMetadata,
} from "@/lib/generation/category-schemas";

interface BuildingGenerationFormProps {
  onGenerate: (config: GenerationConfig) => void;
  onCancel: () => void;
}

export function BuildingGenerationForm({
  onGenerate,
  onCancel,
}: BuildingGenerationFormProps) {
  const [prompt, setPrompt] = useState("");
  const [pipeline, setPipeline] = useState<"text-to-3d" | "image-to-3d">(
    "text-to-3d",
  );
  const [imageUrl, setImageUrl] = useState("");
  const [quality, setQuality] = useState<"preview" | "medium" | "high">("high");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [componentType, setComponentType] = useState("wall");

  const handleGenerate = () => {
    const assetId = generateAssetId(name || prompt, "building");
    const defaults = getDefaultMetadata("building");

    const config: GenerationConfig = {
      category: "building",
      prompt: prompt || `A building component: ${name || componentType}`,
      pipeline,
      imageUrl: imageUrl || undefined,
      quality,
      metadata: {
        id: assetId,
        name: name || assetId,
        type: "building",
        description: description || prompt,
        componentType,
        tradeable: false,
        rarity: "common",
        ...defaults,
      },
    };

    onGenerate(config);
  };

  const componentTypeOptions = [
    { value: "wall", label: "Wall" },
    { value: "door", label: "Door" },
    { value: "window", label: "Window" },
    { value: "roof", label: "Roof" },
    { value: "floor", label: "Floor" },
    { value: "step", label: "Step" },
    { value: "corner", label: "Corner" },
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
            placeholder="Describe the building component (e.g., 'A stone wall section with weathered texture')"
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
        <h3 className="text-lg font-semibold mb-4">
          Building Component Properties
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <NeonInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Stone Wall Section"
            />
          </div>

          <div className="space-y-2">
            <Label>Component Type</Label>
            <Select
              value={componentType}
              onChange={setComponentType}
              options={componentTypeOptions}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <NeonInput
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A weathered stone wall section..."
            />
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
