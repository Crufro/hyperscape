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
import type { WeaponType, AttackType } from "@/types/game/item-types";

interface WeaponGenerationFormProps {
  onGenerate: (config: GenerationConfig) => void;
  onCancel: () => void;
  /** Initial config from preset selection */
  initialConfig?: Partial<GenerationConfig>;
}

export function WeaponGenerationForm({
  onGenerate,
  onCancel,
  initialConfig,
}: WeaponGenerationFormProps) {
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
  const [description, setDescription] = useState((meta?.description as string) ?? "");
  const [weaponType, setWeaponType] = useState<WeaponType>(
    (meta?.weaponType as WeaponType) ?? "sword"
  );
  const [attackType, setAttackType] = useState<AttackType>(
    (meta?.attackType as AttackType) ?? "melee"
  );
  const [attackSpeed, setAttackSpeed] = useState((meta?.attackSpeed as number) ?? 4);
  const [attackRange, setAttackRange] = useState((meta?.attackRange as number) ?? 1);
  const [attackBonus, setAttackBonus] = useState(
    ((meta?.bonuses as Record<string, unknown>)?.attack as number) ?? 4
  );
  const [strengthBonus, setStrengthBonus] = useState(
    ((meta?.bonuses as Record<string, unknown>)?.strength as number) ?? 3
  );
  const [levelRequired, setLevelRequired] = useState(
    ((meta?.requirements as Record<string, unknown>)?.level as number) ?? 1
  );

  // Update form when preset changes
  useEffect(() => {
    if (initialConfig) {
      const m = initialConfig.metadata as Record<string, unknown> | undefined;
      if (initialConfig.prompt) setPrompt(initialConfig.prompt);
      if (initialConfig.pipeline) setPipeline(initialConfig.pipeline);
      if (initialConfig.imageUrl) setImageUrl(initialConfig.imageUrl);
      if (initialConfig.quality) setQuality(initialConfig.quality);
      if (m?.name) setName(m.name as string);
      if (m?.description) setDescription(m.description as string);
      if (m?.weaponType) setWeaponType(m.weaponType as WeaponType);
      if (m?.attackType) setAttackType(m.attackType as AttackType);
      if (typeof m?.attackSpeed === "number") setAttackSpeed(m.attackSpeed);
      if (typeof m?.attackRange === "number") setAttackRange(m.attackRange);
      const bonuses = m?.bonuses as Record<string, unknown> | undefined;
      if (typeof bonuses?.attack === "number") setAttackBonus(bonuses.attack);
      if (typeof bonuses?.strength === "number") setStrengthBonus(bonuses.strength);
      const reqs = m?.requirements as Record<string, unknown> | undefined;
      if (typeof reqs?.level === "number") setLevelRequired(reqs.level);
    }
  }, [initialConfig]);

  const handleGenerate = () => {
    const assetId = generateAssetId(name || prompt, "weapon");
    const defaults = getDefaultMetadata("weapon", {
      attackSpeed,
      attackRange,
    });

    const config: GenerationConfig = {
      category: "weapon",
      prompt: prompt || `A ${weaponType} weapon: ${name || "weapon"}`,
      pipeline,
      imageUrl: imageUrl || undefined,
      quality,
      metadata: {
        id: assetId,
        name: name || assetId,
        type: "weapon",
        description: description || prompt,
        examine: description || `A ${name || weaponType}`,
        weaponType,
        attackType,
        attackSpeed,
        attackRange,
        bonuses: {
          attack: attackBonus,
          strength: strengthBonus,
        },
        requirements: {
          level: levelRequired,
          skills: {
            attack: levelRequired,
          },
        },
        tradeable: true,
        rarity: "common",
        ...defaults,
      },
    };

    onGenerate(config);
  };

  const weaponTypeOptions = [
    { value: "sword", label: "Sword" },
    { value: "axe", label: "Axe" },
    { value: "mace", label: "Mace" },
    { value: "dagger", label: "Dagger" },
    { value: "spear", label: "Spear" },
    { value: "bow", label: "Bow" },
    { value: "crossbow", label: "Crossbow" },
    { value: "staff", label: "Staff" },
    { value: "wand", label: "Wand" },
    { value: "scimitar", label: "Scimitar" },
    { value: "halberd", label: "Halberd" },
  ];

  const attackTypeOptions = [
    { value: "melee", label: "Melee" },
    { value: "ranged", label: "Ranged" },
    { value: "magic", label: "Magic" },
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
            placeholder="Describe the weapon (e.g., 'A bronze sword with a simple hilt')"
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
        <h3 className="text-lg font-semibold mb-4">Weapon Properties</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <NeonInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bronze Sword"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <NeonInput
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A basic sword made of bronze"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Weapon Type</Label>
              <Select
                value={weaponType}
                onChange={(value) => setWeaponType(value as WeaponType)}
                options={weaponTypeOptions}
              />
            </div>

            <div className="space-y-2">
              <Label>Attack Type</Label>
              <Select
                value={attackType}
                onChange={(value) => setAttackType(value as AttackType)}
                options={attackTypeOptions}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Attack Speed: {attackSpeed}</Label>
              <Slider
                value={[attackSpeed]}
                onValueChange={([value]) => setAttackSpeed(value)}
                min={2}
                max={7}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Attack Range: {attackRange}</Label>
              <Slider
                value={[attackRange]}
                onValueChange={([value]) => setAttackRange(value)}
                min={1}
                max={10}
                step={1}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Attack Bonus: {attackBonus}</Label>
              <Slider
                value={[attackBonus]}
                onValueChange={([value]) => setAttackBonus(value)}
                min={0}
                max={100}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <Label>Strength Bonus: {strengthBonus}</Label>
              <Slider
                value={[strengthBonus]}
                onValueChange={([value]) => setStrengthBonus(value)}
                min={0}
                max={100}
                step={1}
              />
            </div>
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
