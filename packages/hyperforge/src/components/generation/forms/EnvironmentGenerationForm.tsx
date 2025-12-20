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

interface EnvironmentGenerationFormProps {
  onGenerate: (config: GenerationConfig) => void;
  onCancel: () => void;
  /** Initial config from preset selection */
  initialConfig?: Partial<GenerationConfig>;
}

export function EnvironmentGenerationForm({
  onGenerate,
  onCancel,
  initialConfig,
}: EnvironmentGenerationFormProps) {
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
  const [type, setType] = useState((meta?.environmentType as string) ?? "tree");
  const [scale, setScale] = useState((meta?.scale as number) ?? 1.0);

  // Update form when preset changes
  useEffect(() => {
    if (initialConfig) {
      const m = initialConfig.metadata as Record<string, unknown> | undefined;
      if (initialConfig.prompt) setPrompt(initialConfig.prompt);
      if (initialConfig.pipeline) setPipeline(initialConfig.pipeline);
      if (initialConfig.imageUrl) setImageUrl(initialConfig.imageUrl);
      if (initialConfig.quality) setQuality(initialConfig.quality);
      if (m?.name) setName(m.name as string);
      if (m?.environmentType) setType(m.environmentType as string);
      if (typeof m?.scale === "number") setScale(m.scale);
    }
  }, [initialConfig]);

  const handleGenerate = () => {
    // Use "prop" category for environment objects (trees, rocks, etc.)
    const assetId = generateAssetId(name || prompt, "prop");
    const defaults = getDefaultMetadata("prop", { scale });

    const config: GenerationConfig = {
      category: "prop",
      prompt: prompt || `A ${type}: ${name || "environment object"}`,
      pipeline,
      imageUrl: imageUrl || undefined,
      quality,
      metadata: {
        id: assetId,
        name: name || assetId,
        type,
        scale,
        ...defaults,
      },
    };

    onGenerate(config);
  };

  const typeOptions = [
    { value: "tree", label: "Tree" },
    { value: "rock", label: "Rock" },
    { value: "boulder", label: "Boulder" },
    { value: "bush", label: "Bush" },
    { value: "grass", label: "Grass" },
    { value: "flower", label: "Flower" },
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
            placeholder="Describe the environment object (e.g., 'A large mossy boulder')"
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
        <h3 className="text-lg font-semibold mb-4">Environment Properties</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <NeonInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mossy Boulder"
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onChange={setType} options={typeOptions} />
          </div>

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
