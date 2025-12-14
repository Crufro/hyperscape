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

interface PropGenerationFormProps {
  onGenerate: (config: GenerationConfig) => void;
  onCancel: () => void;
}

export function PropGenerationForm({
  onGenerate,
  onCancel,
}: PropGenerationFormProps) {
  const [prompt, setPrompt] = useState("");
  const [pipeline, setPipeline] = useState<"text-to-3d" | "image-to-3d">(
    "text-to-3d",
  );
  const [imageUrl, setImageUrl] = useState("");
  const [quality, setQuality] = useState<"preview" | "medium" | "high">("high");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState(0);

  const handleGenerate = () => {
    const assetId = generateAssetId(name || prompt, "prop");
    const defaults = getDefaultMetadata("prop", { value });

    const config: GenerationConfig = {
      category: "prop",
      prompt: prompt || `A prop: ${name || "decorative object"}`,
      pipeline,
      imageUrl: imageUrl || undefined,
      quality,
      metadata: {
        id: assetId,
        name: name || assetId,
        type: "prop",
        description: description || prompt,
        value,
        tradeable: false,
        rarity: "common",
        ...defaults,
      },
    };

    onGenerate(config);
  };

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
            placeholder="Describe the prop (e.g., 'A decorative vase with intricate patterns')"
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
        <h3 className="text-lg font-semibold mb-4">Prop Properties</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <NeonInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Decorative Vase"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <NeonInput
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A beautiful decorative vase..."
            />
          </div>

          <div className="space-y-2">
            <Label>Value (coins)</Label>
            <NeonInput
              type="number"
              value={value.toString()}
              onChange={(e) => setValue(parseInt(e.target.value) || 0)}
              placeholder="0"
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
