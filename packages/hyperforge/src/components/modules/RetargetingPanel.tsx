"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  RefreshCw,
  Upload,
  Download,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Bone,
  ArrowRight,
  Check,
  AlertCircle,
} from "lucide-react";
import type { AssetData } from "@/types/asset";

interface RetargetingPanelProps {
  selectedAsset?: AssetData | null;
}

const boneMapping = [
  { source: "Hips", target: "Hips", status: "mapped" },
  { source: "Spine", target: "Spine", status: "mapped" },
  { source: "Chest", target: "Chest", status: "mapped" },
  { source: "Neck", target: "Neck", status: "mapped" },
  { source: "Head", target: "Head", status: "mapped" },
  { source: "LeftShoulder", target: "LeftShoulder", status: "mapped" },
  { source: "RightShoulder", target: "RightShoulder", status: "mapped" },
  { source: "LeftArm", target: "LeftUpperArm", status: "warning" },
  { source: "RightArm", target: "RightUpperArm", status: "warning" },
];

export function RetargetingPanel({ selectedAsset }: RetargetingPanelProps) {
  const [sourceAnimation, setSourceAnimation] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames] = useState(120);
  const [blendWeight, setBlendWeight] = useState(100);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-glass-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Retargeting</h2>
          <Badge variant="outline" className="text-xs">
            Beta
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Retarget animations between different rigs
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="setup" className="w-full">
          <div className="p-4 border-b border-glass-border">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="mapping">Mapping</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="setup" className="mt-0 p-4 space-y-4">
            {/* Source Animation */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Source Animation
              </div>
              <div className="p-3 rounded-lg bg-glass-bg/50 border border-dashed border-glass-border">
                {sourceAnimation ? (
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-cyan-400" />
                    <div>
                      <div className="text-sm font-medium">
                        {sourceAnimation}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        120 frames @ 30fps
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Drop animation file or click to browse
                    </p>
                    <SpectacularButton
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => setSourceAnimation("walk_cycle.fbx")}
                    >
                      Browse Files
                    </SpectacularButton>
                  </div>
                )}
              </div>
            </div>

            {/* Target Character */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Target Character
              </div>
              <div className="p-3 rounded-lg bg-glass-bg/50 border border-glass-border">
                {selectedAsset ? (
                  <div className="flex items-center gap-3">
                    <Bone className="w-5 h-5 text-cyan-400" />
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
                    Select a rigged character from the vault
                  </p>
                )}
              </div>
            </div>

            {/* Blend Settings */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Blend Weight
                </span>
                <span className="text-sm font-mono">{blendWeight}%</span>
              </div>
              <Slider
                value={[blendWeight]}
                onValueChange={([value]) => setBlendWeight(value)}
                min={0}
                max={100}
                step={1}
              />
            </div>
          </TabsContent>

          <TabsContent value="mapping" className="mt-0 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Bone Mapping
              </div>
              <SpectacularButton size="sm" variant="outline">
                Auto-Map
              </SpectacularButton>
            </div>

            <div className="space-y-2">
              {boneMapping.map((bone, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded-lg bg-glass-bg/30 border border-glass-border"
                >
                  <span className="text-xs text-muted-foreground w-24 truncate">
                    {bone.source}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-foreground w-24 truncate">
                    {bone.target}
                  </span>
                  {bone.status === "mapped" ? (
                    <Check className="w-4 h-4 text-green-400 ml-auto" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-400 ml-auto" />
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Yellow indicates bones that may need manual adjustment
            </p>
          </TabsContent>

          <TabsContent value="preview" className="mt-0 p-4 space-y-4">
            {/* Timeline */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Frame {currentFrame}</span>
                <span>{totalFrames} total</span>
              </div>
              <Slider
                value={[currentFrame]}
                onValueChange={([value]) => setCurrentFrame(value)}
                min={0}
                max={totalFrames}
                step={1}
              />
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-2">
              <SpectacularButton
                size="sm"
                variant="outline"
                onClick={() => setCurrentFrame(0)}
              >
                <SkipBack className="w-4 h-4" />
              </SpectacularButton>
              <SpectacularButton
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </SpectacularButton>
              <SpectacularButton
                size="sm"
                variant="outline"
                onClick={() => setCurrentFrame(totalFrames)}
              >
                <SkipForward className="w-4 h-4" />
              </SpectacularButton>
            </div>

            {/* Preview Status */}
            <div className="p-3 rounded-lg bg-glass-bg/50 border border-glass-border text-center">
              <p className="text-sm text-muted-foreground">
                {sourceAnimation && selectedAsset
                  ? "Preview animation in the 3D viewport"
                  : "Load source animation and select target to preview"}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-glass-border">
        <SpectacularButton
          className="w-full"
          disabled={!sourceAnimation || !selectedAsset}
        >
          <Download className="w-4 h-4 mr-2" />
          Export Retargeted Animation
        </SpectacularButton>
      </div>
    </div>
  );
}
