"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { logger } from "@/lib/utils";
import {
  Users,
  Scroll,
  Map as MapIcon,
  Sword,
  FolderOpen,
  RefreshCw,
  Trash2,
  Search,
  MessageSquare,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const log = logger.child("ContentAssetsViewer");

interface ContentAsset {
  id: string;
  name: string;
  type: "npc" | "quest" | "area" | "item";
  description?: string;
  createdAt: string;
  content?: Record<string, unknown>;
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

const typeIcons = {
  npc: Users,
  quest: Scroll,
  area: MapIcon,
  item: Sword,
};

const typeColors = {
  npc: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  quest: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  area: "bg-green-500/20 text-green-400 border-green-500/30",
  item: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const typeLabels = {
  npc: "NPC",
  quest: "Quest",
  area: "Area",
  item: "Item",
};

interface ContentItemProps {
  asset: ContentAsset;
  onSelect: () => void;
  onDelete: () => void;
  isSelected?: boolean;
}

function ContentItem({ asset, onSelect, onDelete, isSelected }: ContentItemProps) {
  const Icon = typeIcons[asset.type];

  return (
    <div
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
        isSelected
          ? "border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/30"
          : "border-glass-border bg-glass-bg/50 hover:border-glass-border-hover hover:bg-glass-bg"
      )}
      onClick={onSelect}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
          typeColors[asset.type]
        )}
      >
        <Icon className="w-5 h-5" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{asset.name}</p>
          <Badge variant="outline" className={cn("text-[10px]", typeColors[asset.type])}>
            {typeLabels[asset.type]}
          </Badge>
        </div>
        {asset.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{asset.description}</p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">{formatDate(asset.createdAt)}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </div>
  );
}

export function ContentAssetsViewer() {
  const [mounted, setMounted] = useState(false);
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<ContentAsset | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/content/list");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.assets)) {
          const parsed: ContentAsset[] = data.assets.map(
            (asset: { id: string; type: string; content?: Record<string, unknown>; createdAt?: string }) => ({
              id: asset.id,
              name: asset.content?.name || asset.id,
              type: asset.type as ContentAsset["type"],
              description: asset.content?.description || asset.content?.backstory,
              createdAt: asset.createdAt || new Date().toISOString(),
              content: asset.content,
            })
          );
          setAssets(parsed);
        }
      }
    } catch (error) {
      log.error("Failed to fetch content assets", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleDelete = useCallback(
    async (asset: ContentAsset) => {
      if (!confirm(`Delete "${asset.name}"?`)) return;

      try {
        const res = await fetch(`/api/content/${asset.id}`, { method: "DELETE" });
        if (res.ok) {
          setAssets((prev) => prev.filter((a) => a.id !== asset.id));
          if (selectedAsset?.id === asset.id) {
            setSelectedAsset(null);
          }
        }
      } catch (error) {
        log.error("Failed to delete content", error);
      }
    },
    [selectedAsset]
  );

  // Filter assets
  const filteredAssets = assets.filter((asset) => {
    if (activeTab !== "all" && asset.type !== activeTab) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        asset.name.toLowerCase().includes(query) ||
        asset.type.toLowerCase().includes(query) ||
        asset.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Count by type
  const counts: Record<string, number> = {
    all: assets.length,
    npc: assets.filter((a) => a.type === "npc").length,
    quest: assets.filter((a) => a.type === "quest").length,
    area: assets.filter((a) => a.type === "area").length,
    item: assets.filter((a) => a.type === "item").length,
  };

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
          <FolderOpen className="w-5 h-5 text-cyan-400" />
          <h2 className="font-semibold text-lg">Content Library</h2>
          <Badge variant="outline" className="text-xs">
            {assets.length} items
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/content/generate">
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
          placeholder="Search content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-glass-bg border border-glass-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" className="text-xs">
            All ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="npc" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            NPCs ({counts.npc})
          </TabsTrigger>
          <TabsTrigger value="quest" className="text-xs">
            <Scroll className="w-3 h-3 mr-1" />
            Quests ({counts.quest})
          </TabsTrigger>
          <TabsTrigger value="area" className="text-xs">
            <MapIcon className="w-3 h-3 mr-1" />
            Areas ({counts.area})
          </TabsTrigger>
          <TabsTrigger value="item" className="text-xs">
            <Sword className="w-3 h-3 mr-1" />
            Items ({counts.item})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">No content found</p>
              <p className="text-xs mt-1 mb-4">
                Generate NPCs, quests, areas, or items in the Content Studio
              </p>
              <Link href="/content/generate">
                <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition-colors text-sm">
                  <Sparkles className="w-4 h-4" />
                  Open Content Studio
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAssets.map((asset) => (
                <ContentItem
                  key={asset.id}
                  asset={asset}
                  isSelected={selectedAsset?.id === asset.id}
                  onSelect={() => setSelectedAsset(asset)}
                  onDelete={() => handleDelete(asset)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Selected Content Preview */}
      {selectedAsset && (
        <GlassPanel className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{selectedAsset.name}</h3>
                <Badge variant="outline" className={typeColors[selectedAsset.type]}>
                  {typeLabels[selectedAsset.type]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Created: {formatDate(selectedAsset.createdAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href={`/content/dialogue?npcId=${selectedAsset.id}`}>
                <SpectacularButton size="sm" variant="outline">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Edit Dialogue
                </SpectacularButton>
              </Link>
              <SpectacularButton
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(selectedAsset)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </SpectacularButton>
            </div>
          </div>

          {selectedAsset.description && (
            <p className="text-sm text-muted-foreground mb-4">{selectedAsset.description}</p>
          )}

          {/* Content Details */}
          {selectedAsset.content && (
            <div className="p-3 bg-glass-bg/50 rounded-lg max-h-64 overflow-y-auto">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                {JSON.stringify(selectedAsset.content, null, 2)}
              </pre>
            </div>
          )}
        </GlassPanel>
      )}
    </div>
  );
}
