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
import {
  getStringProperty,
  getNumberProperty,
  getObjectProperty,
  isObject,
} from "@/types/guards";

interface WeaponGenerationFormProps {
  onGenerate: (config: GenerationConfig) => void;
  onCancel: () => void;
  /** Initial config from preset selection */
  initialConfig?: Partial<GenerationConfig>;
}

/**
 * Extract weapon form values from metadata using type-safe property access
 */
function extractWeaponMetadata(metadata: unknown) {
  if (!isObject(metadata)) {
    return {
      name: "",
      description: "",
      weaponType: "sword" as WeaponType,
      attackType: "melee" as AttackType,
      attackSpeed: 4,
      attackRange: 1,
      attackBonus: 4,
      strengthBonus: 3,
      levelRequired: 1,
    };
  }

  const bonuses = getObjectProperty(metadata, "bonuses");
  const requirements = getObjectProperty(metadata, "requirements");

  return {
    name: getStringProperty(metadata, "name") ?? "",
    description: getStringProperty(metadata, "description") ?? "",
    weaponType: (getStringProperty(metadata, "weaponType") as WeaponType) ?? "sword",
    attackType: (getStringProperty(metadata, "attackType") as AttackType) ?? "melee",
    attackSpeed: getNumberProperty(metadata, "attackSpeed") ?? 4,
    attackRange: getNumberProperty(metadata, "attackRange") ?? 1,
    attackBonus: bonuses ? (getNumberProperty(bonuses, "attack") ?? 4) : 4,
    strengthBonus: bonuses ? (getNumberProperty(bonuses, "strength") ?? 3) : 3,
    levelRequired: requirements ? (getNumberProperty(requirements, "level") ?? 1) : 1,
  };
}

export function WeaponGenerationForm({
  onGenerate,
  onCancel,
  initialConfig,
}: WeaponGenerationFormProps) {
  // Extract metadata using type-safe helper
  const initialMeta = extractWeaponMetadata(initialConfig?.metadata);

  const [prompt, setPrompt] = useState(initialConfig?.prompt ?? "");
  const [pipeline, setPipeline] = useState<"text-to-3d" | "image-to-3d">(
    initialConfig?.pipeline ?? "text-to-3d",
  );
  const [imageUrl, setImageUrl] = useState(initialConfig?.imageUrl ?? "");
  const [quality, setQuality] = useState<"preview" | "medium" | "high">(
    initialConfig?.quality ?? "high"
  );
  const [name, setName] = useState(initialMeta.name);
  const [description, setDescription] = useState(initialMeta.description);
  const [weaponType, setWeaponType] = useState<WeaponType>(initialMeta.weaponType);
  const [attackType, setAttackType] = useState<AttackType>(initialMeta.attackType);
  const [attackSpeed, setAttackSpeed] = useState(initialMeta.attackSpeed);
  const [attackRange, setAttackRange] = useState(initialMeta.attackRange);
  const [attackBonus, setAttackBonus] = useState(initialMeta.attackBonus);
  const [strengthBonus, setStrengthBonus] = useState(initialMeta.strengthBonus);
  const [levelRequired, setLevelRequired] = useState(initialMeta.levelRequired);

  // Update form when preset changes
  useEffect(() => {
    if (initialConfig) {
      const meta = extractWeaponMetadata(initialConfig.metadata);
      if (initialConfig.prompt) setPrompt(initialConfig.prompt);
      if (initialConfig.pipeline) setPipeline(initialConfig.pipeline);
      if (initialConfig.imageUrl) setImageUrl(initialConfig.imageUrl);
      if (initialConfig.quality) setQuality(initialConfig.quality);
      if (meta.name) setName(meta.name);
      if (meta.description) setDescription(meta.description);
      setWeaponType(meta.weaponType);
      setAttackType(meta.attackType);
      setAttackSpeed(meta.attackSpeed);
      setAttackRange(meta.attackRange);
      setAttackBonus(meta.attackBonus);
      setStrengthBonus(meta.strengthBonus);
      setLevelRequired(meta.levelRequired);
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
