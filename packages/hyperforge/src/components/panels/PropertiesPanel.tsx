"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  Download,
  Upload,
  Copy,
  Trash2,
  Loader2,
  Play,
  Axe,
  TreeDeciduous,
  Sword,
  Shield,
  Heart,
  Skull,
  Coins,
  Package,
  Clock,
  Target,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { AssetData } from "@/types/asset";

// Game data types
interface ResourceGameData {
  id: string;
  name: string;
  type: string;
  examine?: string;
  harvestSkill: string;
  toolRequired: string;
  levelRequired: number;
  baseCycleTicks: number;
  depleteChance: number;
  respawnTicks: number;
  harvestYield: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    chance: number;
    xpAmount: number;
  }>;
}

interface NPCGameData {
  id: string;
  name: string;
  description?: string;
  category: string;
  faction?: string;
  stats?: {
    level: number;
    health: number;
    attack: number;
    strength: number;
    defense: number;
    ranged?: number;
    magic?: number;
  };
  combat?: {
    attackable: boolean;
    aggressive?: boolean;
    retaliates?: boolean;
    aggroRange?: number;
    combatRange?: number;
    attackSpeedTicks?: number;
    respawnTicks?: number;
  };
  drops?: {
    defaultDrop?: { enabled: boolean; itemId: string; quantity: number };
    always?: DropItem[];
    common?: DropItem[];
    uncommon?: DropItem[];
    rare?: DropItem[];
    veryRare?: DropItem[];
  };
}

interface DropItem {
  itemId: string;
  minQuantity: number;
  maxQuantity: number;
  chance: number;
  rarity: string;
}

interface ItemGameData {
  id: string;
  name: string;
  type: string;
  value?: number;
  requirements?: { level: number; skills: Record<string, number> };
}

interface PropertiesPanelProps {
  asset: AssetData | null;
  isOpen: boolean;
  onClose: () => void;
  onAssetDeleted?: (assetId: string) => void;
  onAssetDuplicated?: (newAsset: { id: string; name: string }) => void;
  /** When true, renders without container styling (used inside viewport overlay) */
  isViewportOverlay?: boolean;
}

// Rarity colors for drop table
const rarityColors: Record<string, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  very_rare: "text-purple-400",
  veryRare: "text-purple-400",
  legendary: "text-orange-400",
};

// Helper component for drop table rows
function DropTableRow({ drop }: { drop: DropItem }) {
  const quantityText =
    drop.minQuantity === drop.maxQuantity
      ? `×${drop.minQuantity}`
      : `×${drop.minQuantity}-${drop.maxQuantity}`;

  const chanceText =
    drop.chance >= 1
      ? "100%"
      : drop.chance >= 0.1
        ? `${(drop.chance * 100).toFixed(0)}%`
        : drop.chance >= 0.01
          ? `${(drop.chance * 100).toFixed(1)}%`
          : `1/${Math.round(1 / drop.chance)}`;

  return (
    <div className="flex items-center justify-between p-2 rounded bg-glass-bg/50 text-sm">
      <div className="flex items-center gap-2">
        <Coins className="w-3 h-3 text-amber-400" />
        <span className="capitalize">{drop.itemId.replace(/_/g, " ")}</span>
        <span className="text-xs text-muted-foreground">{quantityText}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{chanceText}</span>
        <Badge
          variant="outline"
          className={cn("text-[10px] capitalize", rarityColors[drop.rarity])}
        >
          {drop.rarity.replace("_", " ")}
        </Badge>
      </div>
    </div>
  );
}

export function PropertiesPanel({
  asset,
  isOpen,
  onClose,
  onAssetDeleted,
  onAssetDuplicated,
  isViewportOverlay = false,
}: PropertiesPanelProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Game data states
  const [resourceData, setResourceData] = useState<ResourceGameData | null>(
    null,
  );
  const [npcData, setNpcData] = useState<NPCGameData | null>(null);
  const [toolData, setToolData] = useState<ItemGameData | null>(null);
  const [relatedItems, setRelatedItems] = useState<ItemGameData[]>([]);
  const [isLoadingGameData, setIsLoadingGameData] = useState(false);

  // Fetch game data when asset changes
  useEffect(() => {
    if (!asset) return;

    const fetchGameData = async () => {
      setIsLoadingGameData(true);
      setResourceData(null);
      setNpcData(null);
      setToolData(null);
      setRelatedItems([]);

      try {
        // Determine what type of game data to fetch based on asset properties
        const isResource =
          asset.category === "resource" ||
          asset.type === "tree" ||
          asset.type === "fishing_spot" ||
          asset.id?.includes("tree");
        const isNPC =
          asset.category === "npc" ||
          asset.category === "mob" ||
          asset.type === "mob" ||
          asset.id?.includes("goblin");

        if (isResource) {
          // Try to find matching resource
          const resourceId =
            asset.id === "tree" ? "tree_normal" : asset.id || "tree_normal";
          const res = await fetch(
            `/api/game/data?type=resource&id=${resourceId}`,
          );
          if (res.ok) {
            const data = await res.json();
            setResourceData(data.data);
            if (data.toolData) setToolData(data.toolData);
            if (data.relatedItems) setRelatedItems(data.relatedItems);
          }
        } else if (isNPC) {
          const npcId = asset.id || "goblin";
          const res = await fetch(`/api/game/data?type=npc&id=${npcId}`);
          if (res.ok) {
            const data = await res.json();
            setNpcData(data.data);
            if (data.relatedItems) setRelatedItems(data.relatedItems);
          }
        }
      } catch (error) {
        console.error("Failed to fetch game data:", error);
      } finally {
        setIsLoadingGameData(false);
      }
    };

    fetchGameData();
  }, [asset?.id, asset?.category, asset?.type]);

  if (!isOpen || !asset) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    toast({
      variant: "default",
      title: "Download Started",
      description: `Downloading ${asset.name}...`,
      duration: 2000,
    });

    try {
      // Determine format and URL
      let downloadUrl: string;
      let filename: string;

      if (asset.source === "LOCAL") {
        // Download from local API
        downloadUrl = `/api/assets/${asset.id}/download?format=glb`;
        filename = `${asset.name}.glb`;
      } else if (asset.source === "CDN" && "modelPath" in asset) {
        // Download from CDN
        const cdnUrl =
          process.env.NEXT_PUBLIC_CDN_URL || "http://localhost:8080";
        downloadUrl = `${cdnUrl}${asset.modelPath}`;
        filename = `${asset.name}.glb`;
      } else if (asset.modelUrl) {
        // Direct URL
        downloadUrl = asset.modelUrl;
        filename = `${asset.name}.glb`;
      } else {
        throw new Error("No download URL available for this asset");
      }

      // Fetch the file
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        variant: "success",
        title: "Download Complete",
        description: `${asset.name} has been downloaded`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description:
          error instanceof Error ? error.message : "Failed to download asset",
        duration: 5000,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    toast({
      variant: "default",
      title: "Exporting",
      description: `Exporting ${asset.name} to game manifests...`,
      duration: 2000,
    });

    try {
      const response = await fetch("/api/manifest/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: asset.id,
          category: asset.category,
          metadata: asset,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Export failed");
      }

      toast({
        variant: "success",
        title: "Export Complete",
        description: `${asset.name} has been exported to game manifests`,
        duration: 5000,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description:
          error instanceof Error ? error.message : "Failed to export asset",
        duration: 5000,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDuplicate = async () => {
    setIsDuplicating(true);

    try {
      const response = await fetch(`/api/assets/${asset.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Duplicate failed");
      }

      toast({
        variant: "success",
        title: "Asset Duplicated",
        description: `Created "${result.asset.name}"`,
        duration: 3000,
      });

      // Notify parent to refresh asset list
      onAssetDuplicated?.({ id: result.asset.id, name: result.asset.name });
    } catch (error) {
      console.error("Duplicate failed:", error);
      toast({
        variant: "destructive",
        title: "Duplicate Failed",
        description:
          error instanceof Error ? error.message : "Failed to duplicate asset",
        duration: 5000,
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Delete failed");
      }

      toast({
        variant: "success",
        title: "Asset Deleted",
        description: `${asset.name} has been deleted`,
        duration: 3000,
      });

      // Notify parent and close panel
      onAssetDeleted?.(asset.id);
      onClose();
    } catch (error) {
      console.error("Delete failed:", error);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description:
          error instanceof Error ? error.message : "Failed to delete asset",
        duration: 5000,
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Content that's shared between viewport overlay and standalone modes
  const content = (
    <div className={isViewportOverlay ? "p-4" : "flex-1 overflow-y-auto p-4"}>
      {/* Asset Header */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded bg-glass-bg flex items-center justify-center">
            <svg
              className="w-6 h-6 text-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold">{asset.name}</h3>
            <p className="text-sm text-muted-foreground">{asset.category}</p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {asset.hasVRM && (
            <Badge
              variant="secondary"
              className="text-xs bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
            >
              VRM
            </Badge>
          )}
          {asset.hasHandRigging && (
            <Badge
              variant="secondary"
              className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/30"
            >
              Hand Bones
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs">
            {asset.rarity || "Common"}
          </Badge>
          <Badge
            variant={asset.source === "CDN" ? "default" : "outline"}
            className="text-xs"
          >
            {asset.source === "CDN" ? "CDN Asset" : asset.source}
          </Badge>
          <Badge variant="outline" className="text-xs">
            3D Model
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="information" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="information">Information</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="information" className="mt-4 space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{asset.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Category</span>
              <span className="font-medium">{asset.category}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Source</span>
              <span className="font-medium">{asset.source}</span>
            </div>
            {asset.description && (
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-1">
                  Description
                </p>
                <p className="text-sm">{asset.description}</p>
              </div>
            )}
          </div>

          {/* Resource Game Data */}
          {isLoadingGameData && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading game data...
              </span>
            </div>
          )}

          {resourceData && (
            <div className="mt-4 pt-4 border-t border-glass-border space-y-3">
              <div className="flex items-center gap-2">
                <TreeDeciduous className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold">
                  Harvesting Requirements
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 p-2 rounded bg-glass-bg/50">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Level Required
                    </p>
                    <p className="font-semibold">
                      {resourceData.levelRequired}{" "}
                      <span className="text-xs text-muted-foreground capitalize">
                        {resourceData.harvestSkill}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded bg-glass-bg/50">
                  <Axe className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Tool Required
                    </p>
                    <p className="font-semibold">
                      {toolData?.name || resourceData.toolRequired}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded bg-glass-bg/50">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Harvest Time
                    </p>
                    <p className="font-semibold">
                      {(resourceData.baseCycleTicks * 0.6).toFixed(1)}s
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2 rounded bg-glass-bg/50">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Deplete Chance
                    </p>
                    <p className="font-semibold">
                      {(resourceData.depleteChance * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Harvest Yields */}
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Package className="w-3 h-3" /> Harvest Yields
                </p>
                <div className="space-y-1">
                  {resourceData.harvestYield.map((yield_item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded bg-glass-bg/50 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="w-3 h-3 text-amber-400" />
                        <span>{yield_item.itemName}</span>
                        <span className="text-xs text-muted-foreground">
                          ×{yield_item.quantity}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] text-green-400"
                        >
                          +{yield_item.xpAmount} XP
                        </Badge>
                        {yield_item.chance < 1 && (
                          <span className="text-xs text-muted-foreground">
                            {(yield_item.chance * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Respawn Time */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>
                  Respawns in {(resourceData.respawnTicks * 0.6).toFixed(0)}s
                </span>
              </div>
            </div>
          )}

          {/* NPC/Mob Game Data */}
          {npcData && (
            <div className="mt-4 pt-4 border-t border-glass-border space-y-3">
              {/* Combat Stats */}
              {npcData.stats && (
                <>
                  <div className="flex items-center gap-2">
                    <Sword className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-semibold">Combat Stats</span>
                    {npcData.combat?.aggressive && (
                      <Badge
                        variant="destructive"
                        className="text-[10px] ml-auto"
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Aggressive
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="flex flex-col items-center p-2 rounded bg-glass-bg/50">
                      <Skull className="w-4 h-4 text-purple-400 mb-1" />
                      <p className="text-xs text-muted-foreground">Level</p>
                      <p className="font-bold text-lg">{npcData.stats.level}</p>
                    </div>

                    <div className="flex flex-col items-center p-2 rounded bg-glass-bg/50">
                      <Heart className="w-4 h-4 text-red-400 mb-1" />
                      <p className="text-xs text-muted-foreground">Health</p>
                      <p className="font-bold text-lg">
                        {npcData.stats.health}
                      </p>
                    </div>

                    <div className="flex flex-col items-center p-2 rounded bg-glass-bg/50">
                      <Sword className="w-4 h-4 text-orange-400 mb-1" />
                      <p className="text-xs text-muted-foreground">Attack</p>
                      <p className="font-bold text-lg">
                        {npcData.stats.attack}
                      </p>
                    </div>

                    <div className="flex flex-col items-center p-2 rounded bg-glass-bg/50">
                      <Zap className="w-4 h-4 text-amber-400 mb-1" />
                      <p className="text-xs text-muted-foreground">Strength</p>
                      <p className="font-bold text-lg">
                        {npcData.stats.strength}
                      </p>
                    </div>

                    <div className="flex flex-col items-center p-2 rounded bg-glass-bg/50">
                      <Shield className="w-4 h-4 text-blue-400 mb-1" />
                      <p className="text-xs text-muted-foreground">Defense</p>
                      <p className="font-bold text-lg">
                        {npcData.stats.defense}
                      </p>
                    </div>

                    {npcData.combat?.attackSpeedTicks && (
                      <div className="flex flex-col items-center p-2 rounded bg-glass-bg/50">
                        <Clock className="w-4 h-4 text-cyan-400 mb-1" />
                        <p className="text-xs text-muted-foreground">
                          Atk Speed
                        </p>
                        <p className="font-bold text-lg">
                          {(npcData.combat.attackSpeedTicks * 0.6).toFixed(1)}s
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Combat behavior */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {npcData.combat?.retaliates && (
                      <Badge variant="outline" className="text-orange-400">
                        Retaliates
                      </Badge>
                    )}
                    {npcData.combat?.aggroRange && (
                      <Badge variant="outline" className="text-red-400">
                        Aggro Range: {npcData.combat.aggroRange}m
                      </Badge>
                    )}
                    {npcData.combat?.combatRange && (
                      <Badge variant="outline" className="text-blue-400">
                        Combat Range: {npcData.combat.combatRange}m
                      </Badge>
                    )}
                  </div>
                </>
              )}

              {/* Drop Table */}
              {npcData.drops && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Package className="w-3 h-3" /> Drop Table
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto themed-scrollbar">
                    {/* Default drop (bones) */}
                    {npcData.drops.defaultDrop?.enabled && (
                      <div className="flex items-center justify-between p-2 rounded bg-glass-bg/50 text-sm">
                        <div className="flex items-center gap-2">
                          <Package className="w-3 h-3 text-gray-400" />
                          <span className="capitalize">
                            {npcData.drops.defaultDrop.itemId.replace("_", " ")}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          Always
                        </Badge>
                      </div>
                    )}

                    {/* Always drops */}
                    {npcData.drops.always?.map((drop, idx) => (
                      <DropTableRow key={`always-${idx}`} drop={drop} />
                    ))}

                    {/* Common drops */}
                    {npcData.drops.common?.map((drop, idx) => (
                      <DropTableRow key={`common-${idx}`} drop={drop} />
                    ))}

                    {/* Uncommon drops */}
                    {npcData.drops.uncommon?.map((drop, idx) => (
                      <DropTableRow key={`uncommon-${idx}`} drop={drop} />
                    ))}

                    {/* Rare drops */}
                    {npcData.drops.rare?.map((drop, idx) => (
                      <DropTableRow key={`rare-${idx}`} drop={drop} />
                    ))}

                    {/* Very rare drops */}
                    {npcData.drops.veryRare?.map((drop, idx) => (
                      <DropTableRow key={`veryRare-${idx}`} drop={drop} />
                    ))}
                  </div>
                </div>
              )}

              {/* Respawn time */}
              {npcData.combat?.respawnTicks && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>
                    Respawns in {(npcData.combat.respawnTicks * 0.6).toFixed(0)}
                    s
                  </span>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="metadata" className="mt-4 space-y-3">
          <div className="space-y-2">
            {asset.source === "CDN" && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-semibold">
                    IS BASE MODEL
                  </span>
                  <span className="font-medium">Yes</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-semibold">
                    IS VARIANT
                  </span>
                  <span className="font-medium">No</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-semibold">
                    IS RIGGED
                  </span>
                  <span className="font-medium">Yes</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-semibold">
                    HAS VRM
                  </span>
                  <span className="font-medium">
                    {asset.hasVRM ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-semibold">
                    HAND RIGGING
                  </span>
                  <span className="font-medium">
                    {asset.hasHandRigging ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-semibold">
                    GAME AVATAR ID
                  </span>
                  <span className="font-medium font-mono text-xs">
                    {asset.id}
                  </span>
                </div>
              </>
            )}
            {asset.source === "LOCAL" && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-semibold">
                    Status
                  </span>
                  <span className="font-medium">{asset.status}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground font-semibold">
                    Created
                  </span>
                  <span className="font-medium">
                    {new Date(asset.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="actions" className="mt-4 space-y-2">
          {/* VRM Animation Testing - shown when asset has VRM */}
          {asset.hasVRM && (
            <Link href={`/studio/retarget?asset=${asset.id}`} className="block">
              <SpectacularButton className="w-full" variant="default">
                <Play className="w-4 h-4 mr-2" />
                Test Animations (VRM)
              </SpectacularButton>
            </Link>
          )}

          <SpectacularButton
            className="w-full"
            variant={asset.hasVRM ? "outline" : "default"}
            onClick={handleDownload}
            disabled={isDownloading}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download Model
              </>
            )}
          </SpectacularButton>
          <SpectacularButton
            className="w-full"
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Export to Game
              </>
            )}
          </SpectacularButton>
          <SpectacularButton
            className="w-full"
            variant="outline"
            onClick={handleDuplicate}
            disabled={isDuplicating}
          >
            {isDuplicating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Duplicating...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Duplicate
              </>
            )}
          </SpectacularButton>

          {showDeleteConfirm ? (
            <div className="flex gap-2">
              <SpectacularButton
                className="flex-1"
                variant="outline"
                onClick={handleCancelDelete}
                disabled={isDeleting}
              >
                Cancel
              </SpectacularButton>
              <SpectacularButton
                className="flex-1"
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Confirm Delete"
                )}
              </SpectacularButton>
            </div>
          ) : (
            <SpectacularButton
              className="w-full"
              variant="destructive"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </SpectacularButton>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  // When used as viewport overlay, render just the content
  if (isViewportOverlay) {
    return content;
  }

  // Standalone sidebar mode
  return (
    <aside className="w-80 h-full bg-glass-bg/30 border-l border-glass-border flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-glass-border">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-cyan-400"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M20 6h-3V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM9 4h6v2H9V4z" />
          </svg>
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Properties
          </h2>
        </div>
        <SpectacularButton
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="w-8 h-8 p-0"
        >
          <X className="w-4 h-4" />
        </SpectacularButton>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">{content}</div>
    </aside>
  );
}
