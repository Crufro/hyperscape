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
import type { WeaponType, AttackType } from "@/types/game/item-types";

interface WeaponGenerationFormProps {
  onGenerate: (config: GenerationConfig) => void;
  onCancel: () => void;
}

export function WeaponGenerationForm({
  onGenerate,
  onCancel,
}: WeaponGenerationFormProps) {
  const [prompt, setPrompt] = useState("");
  const [pipeline, setPipeline] = useState<"text-to-3d" | "image-to-3d">(
    "text-to-3d",
  );
  const [imageUrl, setImageUrl] = useState("");
  const [quality, setQuality] = useState<"preview" | "medium" | "high">("high");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [weaponType, setWeaponType] = useState<WeaponType>("sword");
  const [attackType, setAttackType] = useState<AttackType>("melee");
  const [attackSpeed, setAttackSpeed] = useState(4);
  const [attackRange, setAttackRange] = useState(1);
  const [attackBonus, setAttackBonus] = useState(4);
  const [strengthBonus, setStrengthBonus] = useState(3);
  const [levelRequired, setLevelRequired] = useState(1);

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
