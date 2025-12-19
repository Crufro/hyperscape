"use client";

import {} from "react";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Box, User, Building, Package, Gem, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MeshTopology, AssetClass } from "@/lib/meshy/types";

/**
 * Asset class presets for Meshy generation
 * Optimized for 60fps RuneScape-style web MMO performance
 *
 * Target budgets:
 * - Avatars/NPCs: 5K-10K (ideally ~5K for mobs, ~8K for player avatars)
 * - Items/Props: 500-3K (RuneScape assets are typically ~1K or less)
 * - Buildings: 2K-8K (using LOD for distance)
 */
export const ASSET_CLASS_PRESETS: Record<
  AssetClass,
  {
    name: string;
    description: string;
    icon: typeof Box;
    defaultPolycount: number;
    minPolycount: number;
    maxPolycount: number;
    topology: MeshTopology;
    examples: string;
  }
> = {
  small_prop: {
    name: "Small Prop",
    description: "Tiny items - ultra lightweight",
    icon: Gem,
    defaultPolycount: 500,
    minPolycount: 200,
    maxPolycount: 1000,
    topology: "triangle",
    examples: "Coins, runes, gems, small drops",
  },
  medium_prop: {
    name: "Medium Prop",
    description: "Standard game items & equipment",
    icon: Package,
    defaultPolycount: 1500,
    minPolycount: 500,
    maxPolycount: 3000,
    topology: "triangle",
    examples: "Weapons, shields, armor, potions",
  },
  large_prop: {
    name: "Large Prop",
    description: "Bigger world objects",
    icon: Box,
    defaultPolycount: 2500,
    minPolycount: 1000,
    maxPolycount: 5000,
    topology: "triangle",
    examples: "Furniture, crates, anvils, signs",
  },
  npc_character: {
    name: "NPC / Character",
    description: "Rigged characters (5K-10K budget)",
    icon: User,
    defaultPolycount: 5000,
    minPolycount: 3000,
    maxPolycount: 10000,
    topology: "quad", // Better for rigging
    examples: "NPCs, mobs, player avatars",
  },
  small_building: {
    name: "Small Building",
    description: "Small structures with LOD",
    icon: Building,
    defaultPolycount: 4000,
    minPolycount: 2000,
    maxPolycount: 8000,
    topology: "triangle",
    examples: "Houses, shops, small towers",
  },
  large_structure: {
    name: "Large Structure",
    description: "Major buildings (use LOD)",
    icon: Building,
    defaultPolycount: 8000,
    minPolycount: 4000,
    maxPolycount: 15000,
    topology: "triangle",
    examples: "Castles, dungeons, temples",
  },
  custom: {
    name: "Custom",
    description: "Manual polycount control",
    icon: Box,
    defaultPolycount: 2000,
    minPolycount: 100,
    maxPolycount: 20000,
    topology: "triangle",
    examples: "Any asset type",
  },
};

export interface MeshQualitySettings {
  assetClass: AssetClass;
  targetPolycount: number;
  topology: MeshTopology;
  shouldRemesh: boolean;
  enablePBR: boolean;
}

interface MeshQualityControlsProps {
  value: MeshQualitySettings;
  onChange: (settings: MeshQualitySettings) => void;
  /** Show compact version for side panels */
  compact?: boolean;
  /** Show advanced options (remesh, PBR) */
  showAdvanced?: boolean;
}

export function MeshQualityControls({
  value,
  onChange,
  compact = false,
  showAdvanced = true,
}: MeshQualityControlsProps) {
  const preset = ASSET_CLASS_PRESETS[value.assetClass];
  const PresetIcon = preset.icon;

  // Update polycount when asset class changes
  const handleAssetClassChange = (newClass: string) => {
    const newPreset = ASSET_CLASS_PRESETS[newClass as AssetClass];
    onChange({
      ...value,
      assetClass: newClass as AssetClass,
      targetPolycount: newPreset.defaultPolycount,
      topology: newPreset.topology,
    });
  };

  const assetClassOptions = Object.entries(ASSET_CLASS_PRESETS).map(
    ([key, preset]) => ({
      value: key,
      label: preset.name,
    }),
  );

  const topologyOptions = [
    { value: "triangle", label: "Triangle (Runtime)" },
    { value: "quad", label: "Quad (Rigging)" },
  ];

  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {/* Asset Class Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <PresetIcon className="w-4 h-4 text-muted-foreground" />
          Asset Type
        </Label>
        <Select
          value={value.assetClass}
          onChange={handleAssetClassChange}
          options={assetClassOptions}
        />
        <p className="text-xs text-muted-foreground">
          {preset.description} • {preset.examples}
        </p>
      </div>

      {/* Polycount Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Target Polycount</Label>
          <span className="text-sm font-mono text-muted-foreground">
            {value.targetPolycount.toLocaleString()}
          </span>
        </div>
        <Slider
          value={[value.targetPolycount]}
          onValueChange={([v]) => onChange({ ...value, targetPolycount: v })}
          min={preset.minPolycount}
          max={preset.maxPolycount}
          step={100}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{preset.minPolycount.toLocaleString()}</span>
          <span>{preset.maxPolycount.toLocaleString()}</span>
        </div>
      </div>

      {/* Topology Selection */}
      <div className="space-y-2">
        <Label>Mesh Topology</Label>
        <Select
          value={value.topology}
          onChange={(v) => onChange({ ...value, topology: v as MeshTopology })}
          options={topologyOptions}
        />
        <p className="text-xs text-muted-foreground">
          {value.topology === "triangle"
            ? "Triangle meshes are GPU-optimized for runtime rendering"
            : "Quad meshes are better for rigging and animation workflows"}
        </p>
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="space-y-3 pt-2 border-t border-glass-border">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Remesh</Label>
              <p className="text-xs text-muted-foreground">
                Clean up topology for better quality
              </p>
            </div>
            <Switch
              checked={value.shouldRemesh}
              onCheckedChange={(checked) =>
                onChange({ ...value, shouldRemesh: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">PBR Textures</Label>
              <p className="text-xs text-muted-foreground">
                Generate metallic, roughness, normal maps
              </p>
            </div>
            <Switch
              checked={value.enablePBR}
              onCheckedChange={(checked) =>
                onChange({ ...value, enablePBR: checked })
              }
            />
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <div className="flex gap-2">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-300/80">
            <p className="font-medium text-blue-300">Mesh Quality Tips</p>
            <ul className="mt-1 space-y-0.5 list-disc list-inside">
              <li>Lower polycounts = faster loading & rendering</li>
              <li>Use quad topology only for characters needing rigging</li>
              <li>Remeshing improves topology but may lose fine details</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Default mesh quality settings
 * Optimized for RuneScape-style game assets (~1.5K polys)
 */
export const DEFAULT_MESH_QUALITY: MeshQualitySettings = {
  assetClass: "medium_prop",
  targetPolycount: 1500,
  topology: "triangle",
  shouldRemesh: true,
  enablePBR: true,
};

/**
 * Get mesh quality settings for a given asset category
 */
export function getMeshQualityForCategory(
  category?: string,
): MeshQualitySettings {
  if (!category) return DEFAULT_MESH_QUALITY;

  const cat = category.toLowerCase();

  if (
    cat === "npc" ||
    cat === "mob" ||
    cat === "character" ||
    cat === "avatar"
  ) {
    return {
      ...ASSET_CLASS_PRESETS.npc_character,
      assetClass: "npc_character",
      targetPolycount: ASSET_CLASS_PRESETS.npc_character.defaultPolycount,
      shouldRemesh: true,
      enablePBR: true,
    };
  }

  if (cat === "weapon" || cat === "armor" || cat === "tool") {
    return {
      ...ASSET_CLASS_PRESETS.medium_prop,
      assetClass: "medium_prop",
      targetPolycount: ASSET_CLASS_PRESETS.medium_prop.defaultPolycount,
      shouldRemesh: true,
      enablePBR: true,
    };
  }

  if (cat === "building" || cat === "structure") {
    return {
      ...ASSET_CLASS_PRESETS.small_building,
      assetClass: "small_building",
      targetPolycount: ASSET_CLASS_PRESETS.small_building.defaultPolycount,
      shouldRemesh: true,
      enablePBR: true,
    };
  }

  if (
    cat === "item" ||
    cat === "resource" ||
    cat === "consumable" ||
    cat === "potion"
  ) {
    return {
      ...ASSET_CLASS_PRESETS.small_prop,
      assetClass: "small_prop",
      targetPolycount: ASSET_CLASS_PRESETS.small_prop.defaultPolycount,
      shouldRemesh: true,
      enablePBR: true,
    };
  }

  if (cat === "prop" || cat === "furniture" || cat === "decoration") {
    return {
      ...ASSET_CLASS_PRESETS.large_prop,
      assetClass: "large_prop",
      targetPolycount: ASSET_CLASS_PRESETS.large_prop.defaultPolycount,
      shouldRemesh: true,
      enablePBR: true,
    };
  }

  if (
    cat === "environment" ||
    cat === "terrain" ||
    cat === "tree" ||
    cat === "plant"
  ) {
    return {
      ...ASSET_CLASS_PRESETS.large_prop,
      assetClass: "large_prop",
      targetPolycount: ASSET_CLASS_PRESETS.large_prop.defaultPolycount,
      shouldRemesh: true,
      enablePBR: true,
    };
  }

  return DEFAULT_MESH_QUALITY;
}
