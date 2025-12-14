"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Hand,
  Bone,
  Grip,
  MousePointer,
  RotateCw,
  Download,
  Play,
  Pause,
  Settings,
} from "lucide-react";
import type { AssetData } from "@/types/asset";

interface HandRiggingPanelProps {
  selectedAsset?: AssetData | null;
}

const fingerBones = [
  { id: "thumb", label: "Thumb", joints: 3 },
  { id: "index", label: "Index", joints: 4 },
  { id: "middle", label: "Middle", joints: 4 },
  { id: "ring", label: "Ring", joints: 4 },
  { id: "pinky", label: "Pinky", joints: 4 },
];

const handPresets = [
  { id: "open", label: "Open Hand" },
  { id: "fist", label: "Fist" },
  { id: "point", label: "Pointing" },
  { id: "grip", label: "Grip" },
  { id: "peace", label: "Peace Sign" },
  { id: "ok", label: "OK Sign" },
];

export function HandRiggingPanel({ selectedAsset }: HandRiggingPanelProps) {
  const [selectedFinger, setSelectedFinger] = useState("index");
  const [selectedHand, setSelectedHand] = useState<"left" | "right">("right");
  const [isPlaying, setIsPlaying] = useState(false);
  const [fingerCurls, setFingerCurls] = useState<Record<string, number>>({
    thumb: 0,
    index: 0,
    middle: 0,
    ring: 0,
    pinky: 0,
  });

  const handleCurlChange = (finger: string, value: number) => {
    setFingerCurls((prev) => ({ ...prev, [finger]: value }));
  };

  const handlePresetApply = (presetId: string) => {
    // Apply preset finger positions
    switch (presetId) {
      case "fist":
        setFingerCurls({
          thumb: 80,
          index: 100,
          middle: 100,
          ring: 100,
          pinky: 100,
        });
        break;
      case "open":
        setFingerCurls({ thumb: 0, index: 0, middle: 0, ring: 0, pinky: 0 });
        break;
      case "point":
        setFingerCurls({
          thumb: 50,
          index: 0,
          middle: 100,
          ring: 100,
          pinky: 100,
        });
        break;
      case "grip":
        setFingerCurls({
          thumb: 60,
          index: 70,
          middle: 70,
          ring: 70,
          pinky: 70,
        });
        break;
      case "peace":
        setFingerCurls({
          thumb: 80,
          index: 0,
          middle: 0,
          ring: 100,
          pinky: 100,
        });
        break;
      case "ok":
        setFingerCurls({ thumb: 50, index: 50, middle: 0, ring: 0, pinky: 0 });
        break;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-glass-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Hand Rigging</h2>
          <Badge variant="outline" className="text-xs">
            Beta
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure hand bone positions and poses
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="pose" className="w-full">
          <div className="p-4 border-b border-glass-border">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pose">Pose</TabsTrigger>
              <TabsTrigger value="bones">Bones</TabsTrigger>
              <TabsTrigger value="presets">Presets</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="pose" className="mt-0 p-4 space-y-4">
            {/* Hand Selection */}
            <div className="flex gap-2">
              <SpectacularButton
                size="sm"
                variant={selectedHand === "left" ? "default" : "outline"}
                onClick={() => setSelectedHand("left")}
                className="flex-1"
              >
                <Hand className="w-4 h-4 mr-2 -scale-x-100" />
                Left
              </SpectacularButton>
              <SpectacularButton
                size="sm"
                variant={selectedHand === "right" ? "default" : "outline"}
                onClick={() => setSelectedHand("right")}
                className="flex-1"
              >
                <Hand className="w-4 h-4 mr-2" />
                Right
              </SpectacularButton>
            </div>

            {/* Finger Controls */}
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Finger Curl
              </div>
              {fingerBones.map((finger) => (
                <div key={finger.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setSelectedFinger(finger.id)}
                      className={`text-sm ${selectedFinger === finger.id ? "text-cyan-400" : "text-foreground"}`}
                    >
                      {finger.label}
                    </button>
                    <span className="text-xs font-mono text-muted-foreground">
                      {fingerCurls[finger.id]}%
                    </span>
                  </div>
                  <Slider
                    value={[fingerCurls[finger.id]]}
                    onValueChange={([value]) =>
                      handleCurlChange(finger.id, value)
                    }
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
              ))}
            </div>

            {/* Preview Controls */}
            <div className="flex gap-2">
              <SpectacularButton
                size="sm"
                variant="outline"
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex-1"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Preview
                  </>
                )}
              </SpectacularButton>
              <SpectacularButton
                size="sm"
                variant="outline"
                onClick={() => handlePresetApply("open")}
              >
                <RotateCw className="w-4 h-4" />
              </SpectacularButton>
            </div>
          </TabsContent>

          <TabsContent value="bones" className="mt-0 p-4 space-y-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Bone Hierarchy -{" "}
              {selectedFinger.charAt(0).toUpperCase() + selectedFinger.slice(1)}
            </div>

            <div className="space-y-2">
              {fingerBones.find((f) => f.id === selectedFinger)?.joints &&
                Array.from({
                  length: fingerBones.find((f) => f.id === selectedFinger)!
                    .joints,
                }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 rounded-lg bg-glass-bg/30 border border-glass-border"
                    style={{ marginLeft: `${i * 12}px` }}
                  >
                    <Bone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      {selectedFinger}_
                      {i === 0
                        ? "metacarpal"
                        : i === 1
                          ? "proximal"
                          : i === 2
                            ? "intermediate"
                            : "distal"}
                    </span>
                  </div>
                ))}
            </div>

            <div className="p-3 rounded-lg bg-glass-bg/50 border border-glass-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Settings className="w-4 h-4" />
                <span>Advanced bone editing requires VRM model</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="presets" className="mt-0 p-4 space-y-3">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">
              Quick Poses
            </div>
            <div className="grid grid-cols-2 gap-2">
              {handPresets.map((preset) => (
                <SpectacularButton
                  key={preset.id}
                  size="sm"
                  variant="outline"
                  onClick={() => handlePresetApply(preset.id)}
                  className="justify-start"
                >
                  <Grip className="w-4 h-4 mr-2" />
                  {preset.label}
                </SpectacularButton>
              ))}
            </div>

            <div className="pt-4 border-t border-glass-border">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Save Custom Pose
              </div>
              <SpectacularButton size="sm" variant="outline" className="w-full">
                <MousePointer className="w-4 h-4 mr-2" />
                Save Current as Preset
              </SpectacularButton>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-glass-border">
        <SpectacularButton className="w-full" disabled={!selectedAsset}>
          <Download className="w-4 h-4 mr-2" />
          Export Rigged Hands
        </SpectacularButton>
      </div>
    </div>
  );
}
