"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Shield,
  Move,
  RotateCw,
  Scale,
  Layers,
  Download,
  Undo,
  Redo,
  Eye,
} from "lucide-react";
import type { AssetData } from "@/types/asset";

interface ArmorFittingPanelProps {
  selectedAsset?: AssetData | null;
}

const bodyParts = [
  { id: "torso", label: "Torso" },
  { id: "shoulders", label: "Shoulders" },
  { id: "arms", label: "Arms" },
  { id: "waist", label: "Waist" },
  { id: "legs", label: "Legs" },
];

export function ArmorFittingPanel({ selectedAsset }: ArmorFittingPanelProps) {
  const [selectedPart, setSelectedPart] = useState("torso");
  const [transforms, setTransforms] = useState<
    Record<string, { scale: number; offset: number }>
  >({
    torso: { scale: 100, offset: 0 },
    shoulders: { scale: 100, offset: 0 },
    arms: { scale: 100, offset: 0 },
    waist: { scale: 100, offset: 0 },
    legs: { scale: 100, offset: 0 },
  });

  const handleTransformChange = (
    part: string,
    field: "scale" | "offset",
    value: number,
  ) => {
    setTransforms((prev) => ({
      ...prev,
      [part]: { ...prev[part], [field]: value },
    }));
  };

  const handleReset = () => {
    setTransforms({
      torso: { scale: 100, offset: 0 },
      shoulders: { scale: 100, offset: 0 },
      arms: { scale: 100, offset: 0 },
      waist: { scale: 100, offset: 0 },
      legs: { scale: 100, offset: 0 },
    });
  };

  const currentTransform = transforms[selectedPart];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-glass-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Armor Fitting</h2>
          <Badge variant="outline" className="text-xs">
            Beta
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Fit armor pieces to character body shape
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="fitting" className="w-full">
          <div className="p-4 border-b border-glass-border">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="fitting">Fitting</TabsTrigger>
              <TabsTrigger value="layers">Layers</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="fitting" className="mt-0 p-4 space-y-4">
            {/* Selected Assets */}
            <div className="p-3 rounded-lg bg-glass-bg/50 border border-glass-border">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Selected Armor
              </div>
              {selectedAsset ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-glass-bg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {selectedAsset.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedAsset.category}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select an armor piece from the vault
                </p>
              )}
            </div>

            {/* Body Part Selector */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Body Region
              </div>
              <div className="grid grid-cols-3 gap-2">
                {bodyParts.map((part) => (
                  <button
                    key={part.id}
                    onClick={() => setSelectedPart(part.id)}
                    className={`
                      px-3 py-2 rounded-lg text-xs font-medium transition-all
                      ${
                        selectedPart === part.id
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                          : "bg-glass-bg/50 text-muted-foreground hover:text-foreground border border-glass-border"
                      }
                    `}
                  >
                    {part.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transform Controls */}
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Transform -{" "}
                {bodyParts.find((p) => p.id === selectedPart)?.label}
              </div>

              {/* Scale */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Scale className="w-4 h-4 text-muted-foreground" />
                    <span>Scale</span>
                  </div>
                  <span className="text-sm font-mono">
                    {currentTransform.scale}%
                  </span>
                </div>
                <Slider
                  value={[currentTransform.scale]}
                  onValueChange={([value]) =>
                    handleTransformChange(selectedPart, "scale", value)
                  }
                  min={50}
                  max={150}
                  step={1}
                />
              </div>

              {/* Offset */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Move className="w-4 h-4 text-muted-foreground" />
                    <span>Offset</span>
                  </div>
                  <span className="text-sm font-mono">
                    {currentTransform.offset}mm
                  </span>
                </div>
                <Slider
                  value={[currentTransform.offset]}
                  onValueChange={([value]) =>
                    handleTransformChange(selectedPart, "offset", value)
                  }
                  min={-20}
                  max={20}
                  step={1}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <SpectacularButton size="sm" variant="outline" className="flex-1">
                <Undo className="w-4 h-4 mr-1" />
                Undo
              </SpectacularButton>
              <SpectacularButton size="sm" variant="outline" className="flex-1">
                <Redo className="w-4 h-4 mr-1" />
                Redo
              </SpectacularButton>
              <SpectacularButton
                size="sm"
                variant="outline"
                onClick={handleReset}
              >
                <RotateCw className="w-4 h-4" />
              </SpectacularButton>
            </div>
          </TabsContent>

          <TabsContent value="layers" className="mt-0 p-4 space-y-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Armor Layers
            </div>
            <p className="text-sm text-muted-foreground">
              Manage layering order for multi-piece armor sets.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-glass-bg/30 border border-glass-border">
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Base Layer</span>
                </div>
                <Eye className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-glass-bg/30 border border-glass-border">
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Armor Layer</span>
                </div>
                <Eye className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-glass-bg/30 border border-glass-border">
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Accessory Layer</span>
                </div>
                <Eye className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-glass-border">
        <SpectacularButton className="w-full" disabled={!selectedAsset}>
          <Download className="w-4 h-4 mr-2" />
          Export Fitted Armor
        </SpectacularButton>
      </div>
    </div>
  );
}
