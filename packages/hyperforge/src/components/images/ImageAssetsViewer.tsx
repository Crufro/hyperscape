"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { logger } from "@/lib/utils";
import {
  Download,
  Palette,
  Sparkles,
  Image as ImageIcon,
  FolderOpen,
  RefreshCw,
  Trash2,
  ExternalLink,
  Search,
} from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const log = logger.child("ImageAssetsViewer");

interface ImageAsset {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl: string;
  type: string;
  source: "CDN" | "FORGE" | "LOCAL";
  prompt?: string;
  createdAt: string;
  width?: number;
  height?: number;
  size?: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface ImageItemProps {
  asset: ImageAsset;
  onDownload: () => void;
  onDelete?: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
}

function ImageItem({
  asset,
  onDownload,
  onDelete,
  onSelect,
  isSelected,
}: ImageItemProps) {
  const typeColors: Record<string, string> = {
    "concept-art": "bg-purple-500/20 text-purple-400 border-purple-500/30",
    sprite: "bg-green-500/20 text-green-400 border-green-500/30",
    texture: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    icon: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    other: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };

  const sourceColors: Record<string, string> = {
    CDN: "bg-blue-500/20 text-blue-400",
    FORGE: "bg-purple-500/20 text-purple-400",
    LOCAL: "bg-green-500/20 text-green-400",
  };

  return (
    <div
      className={cn(
        "group relative rounded-lg overflow-hidden border transition-all cursor-pointer",
        isSelected
          ? "border-cyan-500 ring-2 ring-cyan-500/30"
          : "border-glass-border hover:border-glass-border-hover"
      )}
      onClick={onSelect}
    >
      {/* Thumbnail */}
      <div className="aspect-square bg-black/20 relative">
        <Image
          src={asset.thumbnailUrl}
          alt={asset.filename}
          fill
          className="object-cover"
          unoptimized
        />

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload();
                }}
                className="flex items-center gap-1 px-2 py-1 rounded bg-white/20 hover:bg-white/30 text-white text-xs transition-colors"
              >
                <Download className="w-3 h-3" />
                Download
              </button>
              {asset.type === "concept-art" && (
                <Link
                  href={`/generate?conceptArt=${encodeURIComponent(asset.url)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-purple-500/50 hover:bg-purple-500/70 text-white text-xs transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  Use for 3D
                </Link>
              )}
              {onDelete && asset.source !== "CDN" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-red-500/50 hover:bg-red-500/70 text-white text-xs transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-2 bg-glass-bg/50">
        <p className="text-xs font-medium truncate">{asset.filename}</p>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          <Badge
            variant="outline"
            className={cn("text-[10px]", typeColors[asset.type] || typeColors.other)}
          >
            {asset.type}
          </Badge>
          <Badge variant="outline" className={cn("text-[10px]", sourceColors[asset.source])}>
            {asset.source}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {formatDate(asset.createdAt)}
          {asset.size && ` • ${formatFileSize(asset.size)}`}
        </p>
      </div>
    </div>
  );
}

export function ImageAssetsViewer() {
  const [mounted, setMounted] = useState(false);
  const [assets, setAssets] = useState<ImageAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<ImageAsset | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/images");
      if (res.ok) {
        const data = await res.json();
        setAssets(data.images || []);
      }
    } catch (error) {
      log.error("Failed to fetch image assets", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleDownload = useCallback((asset: ImageAsset) => {
    const a = document.createElement("a");
    a.href = asset.url;
    a.download = asset.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handleDelete = useCallback(
    async (asset: ImageAsset) => {
      if (!confirm(`Delete "${asset.filename}"?`)) return;

      try {
        const res = await fetch(`/api/images/${asset.id}`, { method: "DELETE" });
        if (res.ok) {
          setAssets((prev) => prev.filter((a) => a.id !== asset.id));
          if (selectedAsset?.id === asset.id) {
            setSelectedAsset(null);
          }
        }
      } catch (error) {
        log.error("Failed to delete image", error);
      }
    },
    [selectedAsset]
  );

  // Get unique types for tabs
  const types = ["all", ...new Set(assets.map((a) => a.type))];

  // Filter assets
  const filteredAssets = assets.filter((asset) => {
    if (activeTab !== "all" && asset.type !== activeTab) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        asset.filename.toLowerCase().includes(query) ||
        asset.type.toLowerCase().includes(query) ||
        asset.prompt?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Count by type
  const counts: Record<string, number> = {
    all: assets.length,
  };
  assets.forEach((a) => {
    counts[a.type] = (counts[a.type] || 0) + 1;
  });

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-pink-400" />
          <h2 className="font-semibold text-lg">Image Library</h2>
          <Badge variant="outline" className="text-xs">
            {assets.length} images
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/images/studio">
            <SpectacularButton size="sm">
              <Sparkles className="w-4 h-4 mr-1" />
              Generate New
            </SpectacularButton>
          </Link>
          <SpectacularButton
            variant="ghost"
            size="sm"
            onClick={fetchAssets}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </SpectacularButton>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search images..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-glass-bg border border-glass-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-pink-500/50"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          {types.map((type) => (
            <TabsTrigger key={type} value={type} className="text-xs capitalize">
              {type === "all" ? "All" : type.replace("-", " ")} ({counts[type] || 0})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">No images found</p>
              <p className="text-xs mt-1">
                Generate concept art, sprites, or textures to see them here
              </p>
              <div className="flex justify-center mt-4">
                <Link href="/images/studio">
                  <SpectacularButton size="sm" variant="outline">
                    <Palette className="w-4 h-4 mr-1" />
                    Open Image Studio
                  </SpectacularButton>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredAssets.map((asset) => (
                <ImageItem
                  key={asset.id}
                  asset={asset}
                  isSelected={selectedAsset?.id === asset.id}
                  onSelect={() => setSelectedAsset(asset)}
                  onDownload={() => handleDownload(asset)}
                  onDelete={() => handleDelete(asset)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Selected Asset Preview */}
      {selectedAsset && (
        <GlassPanel className="p-4">
          <div className="flex gap-4">
            <div className="w-48 h-48 rounded-lg overflow-hidden bg-black/20 flex-shrink-0">
              <Image
                src={selectedAsset.url}
                alt={selectedAsset.filename}
                width={192}
                height={192}
                className="w-full h-full object-contain"
                unoptimized
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{selectedAsset.filename}</h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="capitalize">
                  {selectedAsset.type}
                </Badge>
                <Badge variant="outline">{selectedAsset.source}</Badge>
                {selectedAsset.size && (
                  <Badge variant="outline">{formatFileSize(selectedAsset.size)}</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Created: {formatDate(selectedAsset.createdAt)}
              </p>
              {selectedAsset.prompt && (
                <p className="text-sm text-muted-foreground mt-2 italic">
                  &quot;{selectedAsset.prompt}&quot;
                </p>
              )}
              <div className="flex gap-2 mt-4">
                <SpectacularButton size="sm" onClick={() => handleDownload(selectedAsset)}>
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </SpectacularButton>
                {selectedAsset.type === "concept-art" && (
                  <Link href={`/generate?conceptArt=${encodeURIComponent(selectedAsset.url)}`}>
                    <SpectacularButton size="sm" variant="outline">
                      <Sparkles className="w-4 h-4 mr-1" />
                      Use for 3D Generation
                    </SpectacularButton>
                  </Link>
                )}
                <a href={selectedAsset.url} target="_blank" rel="noopener noreferrer">
                  <SpectacularButton size="sm" variant="ghost">
                    <ExternalLink className="w-4 h-4" />
                  </SpectacularButton>
                </a>
              </div>
            </div>
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
