"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { logger } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import {
  Palette,
  Grid3X3,
  Layers,
  Sparkles,
  Download,
  Loader2,
  Check,
  Wand2,
  Grid2X2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const log = logger.child("ImageStudioPanel");

// ============ CONCEPT ART TYPES ============
type ArtStyle = "realistic" | "stylized" | "pixel" | "painterly";
type ViewAngle = "front" | "side" | "isometric" | "three-quarter";
type AssetType = "weapon" | "armor" | "character" | "item" | "prop" | "environment";

// ============ SPRITE TYPES ============
type SpriteStyle = "pixel-16" | "pixel-32" | "pixel-64" | "hand-drawn" | "flat";
type SpriteType = "character" | "item" | "tile" | "ui" | "effect";

// ============ TEXTURE TYPES ============
type TextureStyle = "realistic" | "stylized" | "painted" | "procedural";
type TextureType = "ground" | "wall" | "metal" | "wood" | "fabric" | "stone" | "organic";
type TextureResolution = "512" | "1024" | "2048";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  type: "concept-art" | "sprite" | "texture";
}

export function ImageStudioPanel() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"concept-art" | "sprites" | "textures">("concept-art");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ============ CONCEPT ART STATE ============
  const [conceptPrompt, setConceptPrompt] = useState("");
  const [artStyle, setArtStyle] = useState<ArtStyle>("stylized");
  const [viewAngle, setViewAngle] = useState<ViewAngle>("isometric");
  const [assetType, setAssetType] = useState<AssetType>("item");
  const [isGeneratingConcept, setIsGeneratingConcept] = useState(false);

  // ============ SPRITE STATE ============
  const [spritePrompt, setSpritePrompt] = useState("");
  const [spriteStyle, setSpriteStyle] = useState<SpriteStyle>("pixel-32");
  const [spriteType, setSpriteType] = useState<SpriteType>("item");
  const [transparent, setTransparent] = useState(true);
  const [isGeneratingSprite, setIsGeneratingSprite] = useState(false);

  // ============ TEXTURE STATE ============
  const [texturePrompt, setTexturePrompt] = useState("");
  const [textureStyle, setTextureStyle] = useState<TextureStyle>("stylized");
  const [textureType, setTextureType] = useState<TextureType>("ground");
  const [resolution, setResolution] = useState<TextureResolution>("1024");
  const [seamless, setSeamless] = useState(true);
  const [previewTiling, setPreviewTiling] = useState(false);
  const [isGeneratingTexture, setIsGeneratingTexture] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ============ OPTIONS DATA ============
  const artStyles: { id: ArtStyle; label: string; description: string }[] = [
    { id: "realistic", label: "Realistic", description: "Photorealistic rendering" },
    { id: "stylized", label: "Stylized", description: "Game art style" },
    { id: "pixel", label: "Pixel Art", description: "Retro pixel aesthetic" },
    { id: "painterly", label: "Painterly", description: "Hand-painted look" },
  ];

  const viewAngles: { id: ViewAngle; label: string }[] = [
    { id: "front", label: "Front View" },
    { id: "side", label: "Side Profile" },
    { id: "isometric", label: "Isometric 3/4" },
    { id: "three-quarter", label: "Three-Quarter" },
  ];

  const assetTypes: { id: AssetType; label: string }[] = [
    { id: "weapon", label: "Weapon" },
    { id: "armor", label: "Armor" },
    { id: "character", label: "Character" },
    { id: "item", label: "Item" },
    { id: "prop", label: "Prop" },
    { id: "environment", label: "Environment" },
  ];

  const spriteStyles: { id: SpriteStyle; label: string; description: string }[] = [
    { id: "pixel-16", label: "16×16", description: "Classic retro" },
    { id: "pixel-32", label: "32×32", description: "Standard" },
    { id: "pixel-64", label: "64×64", description: "High-detail" },
    { id: "hand-drawn", label: "Hand-Drawn", description: "Illustrated" },
    { id: "flat", label: "Flat", description: "Clean minimal" },
  ];

  const spriteTypes: { id: SpriteType; label: string }[] = [
    { id: "character", label: "Character" },
    { id: "item", label: "Item" },
    { id: "tile", label: "Tile" },
    { id: "ui", label: "UI Element" },
    { id: "effect", label: "Effect" },
  ];

  const textureStyles: { id: TextureStyle; label: string; description: string }[] = [
    { id: "realistic", label: "Realistic", description: "Photo-realistic" },
    { id: "stylized", label: "Stylized", description: "Hand-painted" },
    { id: "painted", label: "Painted", description: "Artistic" },
    { id: "procedural", label: "Procedural", description: "Geometric" },
  ];

  const textureTypes: { id: TextureType; label: string }[] = [
    { id: "ground", label: "Ground/Terrain" },
    { id: "wall", label: "Wall/Brick" },
    { id: "metal", label: "Metal" },
    { id: "wood", label: "Wood" },
    { id: "fabric", label: "Fabric" },
    { id: "stone", label: "Stone" },
    { id: "organic", label: "Organic" },
  ];

  // ============ GENERATE HANDLERS ============
  const handleGenerateConceptArt = async () => {
    if (!conceptPrompt.trim()) {
      setError("Please enter a description");
      return;
    }

    setIsGeneratingConcept(true);
    setError(null);

    try {
      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "concept-art",
          prompt: conceptPrompt,
          options: { style: artStyle, viewAngle, assetType, background: "simple" },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await response.json();
      if (data.image) {
        setGeneratedImages((prev) => [
          { id: data.image.id || Date.now().toString(), url: data.image.url, prompt: conceptPrompt, type: "concept-art" },
          ...prev,
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGeneratingConcept(false);
    }
  };

  const handleGenerateSprite = async () => {
    if (!spritePrompt.trim()) {
      setError("Please enter a description");
      return;
    }

    setIsGeneratingSprite(true);
    setError(null);

    try {
      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sprite",
          prompt: spritePrompt,
          options: { style: spriteStyle, spriteType, transparent },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await response.json();
      if (data.image) {
        setGeneratedImages((prev) => [
          { id: data.image.id || Date.now().toString(), url: data.image.url, prompt: spritePrompt, type: "sprite" },
          ...prev,
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGeneratingSprite(false);
    }
  };

  const handleGenerateTexture = async () => {
    if (!texturePrompt.trim()) {
      setError("Please enter a description");
      return;
    }

    setIsGeneratingTexture(true);
    setError(null);

    try {
      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "texture",
          prompt: texturePrompt,
          options: { style: textureStyle, textureType, resolution, seamless },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await response.json();
      if (data.image) {
        setGeneratedImages((prev) => [
          { id: data.image.id || Date.now().toString(), url: data.image.url, prompt: texturePrompt, type: "texture" },
          ...prev,
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGeneratingTexture(false);
    }
  };

  const handleDownload = async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${image.type}-${image.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      log.error("Failed to download:", error);
    }
  };

  // Filter images by current tab
  const filteredImages = generatedImages.filter((img) => {
    if (activeTab === "concept-art") return img.type === "concept-art";
    if (activeTab === "sprites") return img.type === "sprite";
    if (activeTab === "textures") return img.type === "texture";
    return true;
  });

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="concept-art" className="text-sm">
            <Palette className="w-4 h-4 mr-2" />
            Concept Art
          </TabsTrigger>
          <TabsTrigger value="sprites" className="text-sm">
            <Grid3X3 className="w-4 h-4 mr-2" />
            Sprites
          </TabsTrigger>
          <TabsTrigger value="textures" className="text-sm">
            <Layers className="w-4 h-4 mr-2" />
            Textures
          </TabsTrigger>
        </TabsList>

        {/* ============ CONCEPT ART TAB ============ */}
        <TabsContent value="concept-art">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Prompt */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Wand2 className="w-4 h-4 inline mr-1 text-purple-400" />
                  Description
                </label>
                <textarea
                  value={conceptPrompt}
                  onChange={(e) => setConceptPrompt(e.target.value)}
                  placeholder="Describe your concept art... e.g., 'A legendary fire sword with molten lava blade'"
                  rows={3}
                  className="w-full px-4 py-3 bg-glass-bg border border-glass-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                />
              </div>

              {/* Style */}
              <div>
                <label className="block text-sm font-medium mb-2">Art Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {artStyles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setArtStyle(style.id)}
                      className={cn(
                        "p-2 rounded-lg border text-left transition-all text-sm",
                        artStyle === style.id ? "border-purple-500/50 bg-purple-500/10" : "border-glass-border hover:border-glass-border/80"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{style.label}</span>
                        {artStyle === style.id && <Check className="w-3 h-3 text-purple-400" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* View Angle & Asset Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">View Angle</label>
                  <select
                    value={viewAngle}
                    onChange={(e) => setViewAngle(e.target.value as ViewAngle)}
                    className="w-full px-3 py-2 bg-glass-bg border border-glass-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    {viewAngles.map((v) => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Asset Type</label>
                  <select
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value as AssetType)}
                    className="w-full px-3 py-2 bg-glass-bg border border-glass-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  >
                    {assetTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Generate Button */}
              <SpectacularButton onClick={handleGenerateConceptArt} disabled={isGeneratingConcept || !conceptPrompt.trim()} className="w-full">
                {isGeneratingConcept ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />Generate Concept Art</>
                )}
              </SpectacularButton>
            </div>

            {/* Preview */}
            <div className="rounded-xl border border-glass-border bg-glass-bg/30 p-4 min-h-[300px]">
              <h3 className="text-sm font-medium mb-3">Generated Images</h3>
              {filteredImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                  <Palette className="w-12 h-12 opacity-30 mb-2" />
                  <p className="text-sm">Your concept art will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredImages.slice(0, 4).map((img) => (
                    <div key={img.id} className="group relative rounded-lg overflow-hidden border border-glass-border">
                      <Image src={img.url} alt={img.prompt} width={200} height={200} className="w-full aspect-square object-cover" unoptimized />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button onClick={() => handleDownload(img)} className="p-2 rounded-lg bg-white/20 hover:bg-white/30">
                          <Download className="w-4 h-4 text-white" />
                        </button>
                        <Link href={`/generate?conceptArt=${encodeURIComponent(img.url)}`} className="p-2 rounded-lg bg-purple-500/50 hover:bg-purple-500/70">
                          <Sparkles className="w-4 h-4 text-white" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ============ SPRITES TAB ============ */}
        <TabsContent value="sprites">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Prompt */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Wand2 className="w-4 h-4 inline mr-1 text-cyan-400" />
                  Description
                </label>
                <textarea
                  value={spritePrompt}
                  onChange={(e) => setSpritePrompt(e.target.value)}
                  placeholder="Describe your sprite... e.g., 'A glowing health potion in a red glass bottle'"
                  rows={3}
                  className="w-full px-4 py-3 bg-glass-bg border border-glass-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                />
              </div>

              {/* Style */}
              <div>
                <label className="block text-sm font-medium mb-2">Sprite Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {spriteStyles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSpriteStyle(style.id)}
                      className={cn(
                        "p-2 rounded-lg border text-left transition-all text-sm",
                        spriteStyle === style.id ? "border-cyan-500/50 bg-cyan-500/10" : "border-glass-border hover:border-glass-border/80"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs">{style.label}</span>
                        {spriteStyle === style.id && <Check className="w-3 h-3 text-cyan-400" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Type & Transparent */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Sprite Type</label>
                  <select
                    value={spriteType}
                    onChange={(e) => setSpriteType(e.target.value as SpriteType)}
                    className="w-full px-3 py-2 bg-glass-bg border border-glass-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    {spriteTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button
                      onClick={() => setTransparent(!transparent)}
                      className={cn("w-10 h-5 rounded-full transition-colors relative", transparent ? "bg-cyan-500" : "bg-glass-border")}
                    >
                      <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform", transparent ? "left-5" : "left-0.5")} />
                    </button>
                    <span className="text-sm">Transparent</span>
                  </label>
                </div>
              </div>

              {/* Generate Button */}
              <SpectacularButton onClick={handleGenerateSprite} disabled={isGeneratingSprite || !spritePrompt.trim()} className="w-full">
                {isGeneratingSprite ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />Generate Sprite</>
                )}
              </SpectacularButton>
            </div>

            {/* Preview */}
            <div className="rounded-xl border border-glass-border bg-glass-bg/30 p-4 min-h-[300px]">
              <h3 className="text-sm font-medium mb-3">Generated Sprites</h3>
              {filteredImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                  <Grid3X3 className="w-12 h-12 opacity-30 mb-2" />
                  <p className="text-sm">Your sprites will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {filteredImages.slice(0, 6).map((img) => (
                    <div key={img.id} className="group relative rounded-lg overflow-hidden border border-glass-border" style={{ background: "url('/checkerboard.svg') repeat" }}>
                      <img src={img.url} alt={img.prompt} className="w-full aspect-square object-contain" style={{ imageRendering: spriteStyle.startsWith("pixel") ? "pixelated" : "auto" }} />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={() => handleDownload(img)} className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400">
                          <Download className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ============ TEXTURES TAB ============ */}
        <TabsContent value="textures">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Prompt */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Wand2 className="w-4 h-4 inline mr-1 text-green-400" />
                  Description
                </label>
                <textarea
                  value={texturePrompt}
                  onChange={(e) => setTexturePrompt(e.target.value)}
                  placeholder="Describe your texture... e.g., 'Mossy cobblestone path with grass between stones'"
                  rows={3}
                  className="w-full px-4 py-3 bg-glass-bg border border-glass-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none"
                />
              </div>

              {/* Style */}
              <div>
                <label className="block text-sm font-medium mb-2">Texture Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {textureStyles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setTextureStyle(style.id)}
                      className={cn(
                        "p-2 rounded-lg border text-left transition-all text-sm",
                        textureStyle === style.id ? "border-green-500/50 bg-green-500/10" : "border-glass-border hover:border-glass-border/80"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{style.label}</span>
                        {textureStyle === style.id && <Check className="w-3 h-3 text-green-400" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Type & Resolution */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Material Type</label>
                  <select
                    value={textureType}
                    onChange={(e) => setTextureType(e.target.value as TextureType)}
                    className="w-full px-3 py-2 bg-glass-bg border border-glass-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  >
                    {textureTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Resolution</label>
                  <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as TextureResolution)}
                    className="w-full px-3 py-2 bg-glass-bg border border-glass-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  >
                    <option value="512">512×512</option>
                    <option value="1024">1024×1024</option>
                    <option value="2048">2048×2048</option>
                  </select>
                </div>
              </div>

              {/* Seamless & Tiling Preview */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button
                    onClick={() => setSeamless(!seamless)}
                    className={cn("w-10 h-5 rounded-full transition-colors relative", seamless ? "bg-green-500" : "bg-glass-border")}
                  >
                    <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform", seamless ? "left-5" : "left-0.5")} />
                  </button>
                  <span className="text-sm">Seamless</span>
                </label>
                <button
                  onClick={() => setPreviewTiling(!previewTiling)}
                  className={cn("flex items-center gap-1 px-2 py-1 rounded text-xs", previewTiling ? "bg-green-500/20 text-green-400" : "bg-glass-bg text-muted-foreground")}
                >
                  <Grid2X2 className="w-3 h-3" />
                  Tile Preview
                </button>
              </div>

              {/* Generate Button */}
              <SpectacularButton onClick={handleGenerateTexture} disabled={isGeneratingTexture || !texturePrompt.trim()} className="w-full">
                {isGeneratingTexture ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />Generate Texture</>
                )}
              </SpectacularButton>
            </div>

            {/* Preview */}
            <div className="rounded-xl border border-glass-border bg-glass-bg/30 p-4 min-h-[300px]">
              <h3 className="text-sm font-medium mb-3">Generated Textures</h3>
              {filteredImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                  <Layers className="w-12 h-12 opacity-30 mb-2" />
                  <p className="text-sm">Your textures will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredImages.slice(0, 4).map((img) => (
                    <div key={img.id} className="group relative rounded-lg overflow-hidden border border-glass-border">
                      <div
                        className="w-full aspect-square"
                        style={previewTiling ? { backgroundImage: `url(${img.url})`, backgroundSize: "50%", backgroundRepeat: "repeat" } : undefined}
                      >
                        {!previewTiling && <img src={img.url} alt={img.prompt} className="w-full h-full object-cover" />}
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={() => handleDownload(img)} className="p-2 rounded-lg bg-green-500 hover:bg-green-400">
                          <Download className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
