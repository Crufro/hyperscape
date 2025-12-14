"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Music,
  Mic,
  Volume2,
  Play,
  Pause,
  Square,
  Download,
  Upload,
  AudioWaveform,
  Settings,
  Sparkles,
} from "lucide-react";

interface AudioStudioPanelProps {
  selectedAsset?: { id: string; name: string } | null;
}

const voicePresets = [
  {
    id: "male-warrior",
    label: "Male Warrior",
    description: "Deep, commanding voice",
  },
  {
    id: "female-mage",
    label: "Female Mage",
    description: "Mystical, ethereal tone",
  },
  { id: "old-sage", label: "Old Sage", description: "Wise, elderly voice" },
  { id: "young-hero", label: "Young Hero", description: "Energetic, youthful" },
  { id: "villain", label: "Villain", description: "Dark, menacing tone" },
  { id: "merchant", label: "Merchant", description: "Friendly, persuasive" },
];

const soundEffects = [
  { id: "sword-swing", label: "Sword Swing", duration: "0.3s" },
  { id: "footsteps", label: "Footsteps", duration: "1.2s" },
  { id: "magic-cast", label: "Magic Cast", duration: "0.8s" },
  { id: "door-open", label: "Door Open", duration: "0.5s" },
  { id: "coin-pickup", label: "Coin Pickup", duration: "0.2s" },
];

export function AudioStudioPanel({ selectedAsset }: AudioStudioPanelProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("male-warrior");
  const [textToSpeak, setTextToSpeak] = useState("");
  const [volume, setVolume] = useState(80);
  const [pitch, setPitch] = useState(50);
  const [speed, setSpeed] = useState(50);

  const handleGenerate = () => {
    // Simulate generation
    console.log("Generating voice:", {
      voice: selectedVoice,
      text: textToSpeak,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-glass-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Audio Studio</h2>
          <Badge variant="outline" className="text-xs">
            Beta
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Generate and edit game audio content
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Tabs defaultValue="voice" className="w-full">
          <div className="p-4 border-b border-glass-border">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="voice">Voice</TabsTrigger>
              <TabsTrigger value="sfx">SFX</TabsTrigger>
              <TabsTrigger value="music">Music</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="voice" className="mt-0 p-4 space-y-4">
            {/* Voice Preset Selection */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Voice Preset
              </div>
              <div className="grid grid-cols-2 gap-2">
                {voicePresets.slice(0, 4).map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice.id)}
                    className={`
                      p-2 rounded-lg text-left transition-all
                      ${
                        selectedVoice === voice.id
                          ? "bg-cyan-500/20 border border-cyan-500/30"
                          : "bg-glass-bg/50 border border-glass-border hover:bg-glass-bg"
                      }
                    `}
                  >
                    <div className="text-xs font-medium">{voice.label}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {voice.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Text Input */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Text to Speak
              </div>
              <textarea
                value={textToSpeak}
                onChange={(e) => setTextToSpeak(e.target.value)}
                placeholder="Enter the dialogue text..."
                className="w-full h-24 px-3 py-2 bg-glass-bg border border-glass-border rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>

            {/* Voice Settings */}
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Voice Settings
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Pitch</span>
                  <span className="font-mono text-xs">{pitch}%</span>
                </div>
                <Slider
                  value={[pitch]}
                  onValueChange={([value]) => setPitch(value)}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Speed</span>
                  <span className="font-mono text-xs">{speed}%</span>
                </div>
                <Slider
                  value={[speed]}
                  onValueChange={([value]) => setSpeed(value)}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
            </div>

            {/* Generate Button */}
            <SpectacularButton
              className="w-full"
              onClick={handleGenerate}
              disabled={!textToSpeak.trim()}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Voice
            </SpectacularButton>
          </TabsContent>

          <TabsContent value="sfx" className="mt-0 p-4 space-y-4">
            {/* SFX Library */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Sound Effects Library
              </div>
              <div className="space-y-2">
                {soundEffects.map((sfx) => (
                  <div
                    key={sfx.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-glass-bg/30 border border-glass-border"
                  >
                    <SpectacularButton
                      size="sm"
                      variant="outline"
                      className="w-8 h-8 p-0"
                    >
                      <Play className="w-3 h-3" />
                    </SpectacularButton>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{sfx.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {sfx.duration}
                      </div>
                    </div>
                    <AudioWaveform className="w-16 h-4 text-cyan-400/50" />
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Custom SFX */}
            <div className="p-3 rounded-lg bg-glass-bg/50 border border-glass-border">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Generate Custom SFX
              </div>
              <input
                type="text"
                placeholder="Describe the sound effect..."
                className="w-full px-3 py-2 bg-glass-bg border border-glass-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
              <SpectacularButton size="sm" className="w-full mt-2">
                <Sparkles className="w-4 h-4 mr-2" />
                Generate SFX
              </SpectacularButton>
            </div>
          </TabsContent>

          <TabsContent value="music" className="mt-0 p-4 space-y-4">
            {/* Music Generation */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Music Generation
              </div>
              <p className="text-sm text-muted-foreground">
                Generate ambient music and themes for your game.
              </p>
            </div>

            {/* Genre Selection */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Genre
              </div>
              <div className="grid grid-cols-2 gap-2">
                {["Epic Fantasy", "Dark Ambient", "Adventure", "Combat"].map(
                  (genre) => (
                    <button
                      key={genre}
                      className="p-2 rounded-lg bg-glass-bg/50 border border-glass-border hover:bg-glass-bg text-sm transition-all"
                    >
                      {genre}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  Duration
                </span>
                <span className="font-mono text-xs">60s</span>
              </div>
              <Slider defaultValue={[60]} min={15} max={180} step={15} />
            </div>

            <SpectacularButton className="w-full">
              <Music className="w-4 h-4 mr-2" />
              Generate Music
            </SpectacularButton>
          </TabsContent>
        </Tabs>
      </div>

      {/* Audio Preview Bar */}
      <div className="p-4 border-t border-glass-border">
        <div className="flex items-center gap-3">
          <SpectacularButton
            size="sm"
            variant="outline"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </SpectacularButton>
          <div className="flex-1">
            <div className="h-1 bg-glass-bg rounded-full overflow-hidden">
              <div className="h-full w-1/3 bg-cyan-400 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[volume]}
              onValueChange={([value]) => setVolume(value)}
              min={0}
              max={100}
              step={1}
              className="w-20"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
