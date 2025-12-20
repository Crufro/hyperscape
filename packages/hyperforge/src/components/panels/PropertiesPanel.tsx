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
  Globe,
  RefreshCw,
  Store,
  ShoppingCart,
  Box,
  Triangle,
  Hexagon,
  Layers,
  ExternalLink,
  MapPin,
  CheckCircle2,
  Circle,
  CloudUpload,
  Palette,
  Sparkles,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { useToast } from "@/components/ui/toast";
import { cn, logger } from "@/lib/utils";
import { getCDNBaseUrl } from "@/lib/cdn/url-resolver";
import type { AssetData } from "@/types/asset";
import type { ModelInfo } from "@/components/viewer/ModelViewer";

const log = logger.child("PropertiesPanel");

// Game client URL for testing
const GAME_CLIENT_URL =
  process.env.NEXT_PUBLIC_GAME_URL || "http://localhost:3333";

// Spawn location presets for testing
const SPAWN_LOCATIONS = [
  {
    id: "near_player",
    name: "Near Player",
    position: { x: 2, y: 0, z: 2 },
    area: "central_haven",
  },
  {
    id: "town_center",
    name: "Town Center",
    position: { x: 0, y: 0, z: 0 },
    area: "central_haven",
  },
  {
    id: "bank_area",
    name: "Bank Area",
    position: { x: 5, y: 0, z: -5 },
    area: "central_haven",
  },
  {
    id: "shop_area",
    name: "Shop Area",
    position: { x: -5, y: 0, z: -5 },
    area: "central_haven",
  },
  {
    id: "training_area",
    name: "Training Area",
    position: { x: 10, y: 0, z: 10 },
    area: "central_haven",
  },
  {
    id: "forest_edge",
    name: "Forest Edge",
    position: { x: 15, y: 0, z: -10 },
    area: "central_haven",
  },
] as const;

// Sync status types
type SyncStatus = "in_game" | "exported" | "draft" | "syncing" | "error";

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

interface DropSource {
  npcId: string;
  npcName: string;
  npcLevel: number;
  dropRarity: string;
  chance: number;
  minQuantity: number;
  maxQuantity: number;
}

interface ItemStoreInfo {
  storeId: string;
  storeName: string;
  price: number;
  stock: number | "unlimited";
  buybackRate?: number;
}

interface MeshStats {
  vertices: number;
  triangles: number;
  polycount: number;
  topology?: "triangle" | "quad" | "mixed";
  fileSize?: number;
  textureResolution?: number;
  hasPBR?: boolean;
  meshCount?: number;
}

// Material preset for display
interface MaterialPreset {
  id: string;
  name: string;
  displayName: string;
  category: string;
  tier: number;
  color: string;
  stylePrompt: string;
  description?: string;
}

// Game style from prompts file
interface GameStyleInfo {
  id: string;
  name: string;
  base: string;
  enhanced?: string;
  generation?: string;
}

// Categories that support material variants (weapons, armor, tools)
const MATERIAL_SUPPORTED_CATEGORIES = [
  "weapon",
  "armor",
  "tool",
  "item",
  "equipment",
  "melee",
  "ranged",
  "shield",
];

interface PropertiesPanelProps {
  asset: AssetData | null;
  isOpen: boolean;
  onClose: () => void;
  onAssetDeleted?: (assetId: string) => void;
  onAssetDuplicated?: (newAsset: { id: string; name: string }) => void;
  /** When true, renders without container styling (used inside viewport overlay) */
  isViewportOverlay?: boolean;
  /** Model mesh stats from 3D viewer */
  modelInfo?: ModelInfo | null;
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
  modelInfo,
}: PropertiesPanelProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAddingToWorld, setIsAddingToWorld] = useState(false);

  // New: Test in Game functionality
  const [isTestingInGame, setIsTestingInGame] = useState(false);
  const [selectedSpawnLocation, setSelectedSpawnLocation] = useState<
    (typeof SPAWN_LOCATIONS)[number]["id"]
  >(SPAWN_LOCATIONS[0].id);
  const [showSpawnPicker, setShowSpawnPicker] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("draft");

  // Game data states
  const [resourceData, setResourceData] = useState<ResourceGameData | null>(
    null,
  );
  const [npcData, setNpcData] = useState<NPCGameData | null>(null);
  const [toolData, setToolData] = useState<ItemGameData | null>(null);
  const [_relatedItems, setRelatedItems] = useState<ItemGameData[]>([]);
  const [dropSources, setDropSources] = useState<DropSource[]>([]);
  const [storeInfo, setStoreInfo] = useState<ItemStoreInfo[]>([]);
  const [isLoadingGameData, setIsLoadingGameData] = useState(false);

  // Mesh statistics state
  const [meshStats, setMeshStats] = useState<MeshStats | null>(null);
  const [isLoadingMeshStats, setIsLoadingMeshStats] = useState(false);

  // Game style and material presets state
  const [materialPresets, setMaterialPresets] = useState<MaterialPreset[]>([]);
  const [gameStyles, setGameStyles] = useState<Record<string, GameStyleInfo>>(
    {},
  );
  const [isLoadingPresets, setIsLoadingPresets] = useState(false);

  // Fetch game data when asset changes
  useEffect(() => {
    if (!asset) return;

    const fetchGameData = async () => {
      setIsLoadingGameData(true);
      setResourceData(null);
      setNpcData(null);
      setToolData(null);
      setRelatedItems([]);
      setDropSources([]);
      setStoreInfo([]);

      try {
        // Determine what type of game data to fetch based on asset properties
        // Note: Only look up game data for assets that exist in the game manifests
        // CDN avatars are not in game manifests, so exclude them
        const isAvatar =
          asset.category === "avatar" ||
          asset.type === "avatar" ||
          asset.id?.includes("avatar");
        const isResource =
          asset.category === "resource" ||
          asset.type === "tree" ||
          asset.type === "fishing_spot" ||
          asset.id?.includes("tree");
        const isNPC =
          !isAvatar && // Exclude avatars - they're CDN assets, not game NPCs
          (asset.category === "npc" ||
            asset.category === "mob" ||
            asset.type === "mob" ||
            asset.id?.includes("goblin"));
        const isItem =
          asset.category === "weapon" ||
          asset.category === "armor" ||
          asset.category === "tool" ||
          asset.category === "item" ||
          asset.type === "weapon" ||
          asset.type === "armor" ||
          asset.type === "tool";

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
        } else if (isItem) {
          // Fetch item data to see which monsters drop it
          const itemId = asset.id;
          if (itemId) {
            const res = await fetch(`/api/game/data?type=item&id=${itemId}`);
            if (res.ok) {
              const data = await res.json();
              if (data.dropSources) setDropSources(data.dropSources);
            }

            // Fetch store availability for this item
            const storeRes = await fetch(`/api/game/stores?itemId=${itemId}`);
            if (storeRes.ok) {
              const storeData = await storeRes.json();
              if (storeData.stores && storeData.stores.length > 0) {
                setStoreInfo(storeData.stores);
              }
            }
          }
        }
      } catch (error) {
        log.error("Failed to fetch game data:", error);
      } finally {
        setIsLoadingGameData(false);
      }
    };

    fetchGameData();
  }, [asset?.id, asset?.category, asset?.type]);

  // Update mesh statistics from modelInfo (from 3D viewer) or fetch from API
  useEffect(() => {
    // If we have modelInfo from the viewer, use it directly (more accurate)
    if (modelInfo) {
      setMeshStats({
        vertices: modelInfo.vertices,
        triangles: modelInfo.triangles,
        polycount: modelInfo.triangles, // Polycount = triangle count for GLB
        topology:
          modelInfo.meshType === "triangles"
            ? "triangle"
            : modelInfo.meshType === "quads"
              ? "quad"
              : "mixed",
        meshCount: modelInfo.meshCount,
        hasPBR: modelInfo.materials > 0, // Assume PBR if materials exist
      });
      setIsLoadingMeshStats(false);
      return;
    }

    if (!asset?.modelUrl) {
      setMeshStats(null);
      return;
    }

    const fetchMeshStats = async () => {
      setIsLoadingMeshStats(true);
      setMeshStats(null);

      try {
        // Resolve the model URL properly
        // If it's already a full URL, use it; otherwise prepend CDN base
        let resolvedUrl = asset.modelUrl!;
        if (!resolvedUrl.startsWith("http")) {
          // Handle asset:// protocol
          if (resolvedUrl.startsWith("asset://")) {
            resolvedUrl = resolvedUrl.replace(
              "asset://",
              `${getCDNBaseUrl()}/`,
            );
          } else if (resolvedUrl.startsWith("/")) {
            // Absolute path - use window.location.origin for local assets
            resolvedUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${resolvedUrl}`;
          } else {
            // Relative path - prepend CDN URL
            resolvedUrl = `${getCDNBaseUrl()}/${resolvedUrl}`;
          }
        }

        // Try to get mesh stats from API
        const response = await fetch(
          `/api/assets/mesh-stats?url=${encodeURIComponent(resolvedUrl)}`,
        );
        if (response.ok) {
          const data = await response.json();
          setMeshStats(data);
        } else {
          // If API fails, try to extract from asset metadata/generation params
          const genParams = (
            asset as { generationParams?: Record<string, unknown> }
          ).generationParams;
          if (genParams?.targetPolycount || genParams?.topology) {
            setMeshStats({
              vertices: 0,
              triangles: 0,
              polycount: (genParams.targetPolycount as number) || 0,
              topology: genParams.topology as "triangle" | "quad" | undefined,
              hasPBR: genParams.enablePBR as boolean | undefined,
            });
          }
        }
      } catch (error) {
        log.debug("Failed to fetch mesh stats:", error);
      } finally {
        setIsLoadingMeshStats(false);
      }
    };

    fetchMeshStats();
  }, [asset?.modelUrl, asset?.id, modelInfo]);

  // Check sync status - is asset in game manifests?
  useEffect(() => {
    if (!asset) return;

    const checkSyncStatus = async () => {
      try {
        // Check if asset exists in game manifests
        const response = await fetch(
          `/api/assets/sync-status?assetId=${asset.id}`,
        );
        if (response.ok) {
          const data = await response.json();
          setSyncStatus(data.status || "draft");
        } else {
          // Default to draft if we can't check
          setSyncStatus(asset.source === "CDN" ? "in_game" : "draft");
        }
      } catch {
        // CDN assets are always in game, others default to draft
        setSyncStatus(asset.source === "CDN" ? "in_game" : "draft");
      }
    };

    checkSyncStatus();
  }, [asset?.id, asset?.source]);

  // Load material presets and game styles for item assets
  useEffect(() => {
    if (!asset) return;

    // Check if this asset category supports materials
    const supportsMaterials = MATERIAL_SUPPORTED_CATEGORIES.some(
      (cat) =>
        asset.category?.toLowerCase().includes(cat) ||
        asset.type?.toLowerCase().includes(cat),
    );

    if (!supportsMaterials && Object.keys(gameStyles).length > 0) {
      // Already loaded game styles, no need for materials
      return;
    }

    const loadPresets = async () => {
      setIsLoadingPresets(true);
      try {
        // Load material presets and game styles in parallel
        const [materialsRes, stylesRes] = await Promise.all([
          fetch("/prompts/material-presets.json"),
          fetch("/prompts/game-style-prompts.json"),
        ]);

        if (materialsRes.ok) {
          const materials = await materialsRes.json();
          setMaterialPresets(materials);
        }

        if (stylesRes.ok) {
          const stylesData = await stylesRes.json();
          // Combine default and custom styles into a flat map
          const allStyles: Record<string, GameStyleInfo> = {};
          if (stylesData.default) {
            Object.entries(stylesData.default).forEach(([id, style]) => {
              allStyles[id] = { id, ...(style as Omit<GameStyleInfo, "id">) };
            });
          }
          if (stylesData.custom) {
            Object.entries(stylesData.custom).forEach(([id, style]) => {
              allStyles[id] = { id, ...(style as Omit<GameStyleInfo, "id">) };
            });
          }
          setGameStyles(allStyles);
        }
      } catch (error) {
        log.debug("Failed to load presets:", error);
      } finally {
        setIsLoadingPresets(false);
      }
    };

    loadPresets();
  }, [asset?.category, asset?.type]);

  if (!isOpen || !asset) return null;

  // Get selected spawn location
  const spawnLocation =
    SPAWN_LOCATIONS.find((l) => l.id === selectedSpawnLocation) ||
    SPAWN_LOCATIONS[0];

  // Handle Test in Game - one-click export, spawn, and open game
  const handleTestInGame = async () => {
    setIsTestingInGame(true);
    setSyncStatus("syncing");

    toast({
      variant: "default",
      title: "🎮 Preparing Test",
      description: `Exporting ${asset.name} to game server...`,
      duration: 2000,
    });

    try {
      // Use the unified test-in-game API which handles everything
      const response = await fetch("/api/test-in-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: asset.id,
          assetName: asset.name,
          category: asset.category,
          source: asset.source,
          hasVRM: asset.hasVRM,
          spawnPosition: spawnLocation.position,
          spawnArea: spawnLocation.area,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Test failed");
      }

      setSyncStatus("in_game");

      toast({
        variant: "default",
        title: "🎮 Ready to Play!",
        description: `${asset.name} spawned at ${spawnLocation.name}`,
        duration: 3000,
      });

      // Small delay to let server reload, then open game
      setTimeout(() => {
        window.open(result.gameUrl || GAME_CLIENT_URL, "_blank");
      }, 500);
    } catch (error) {
      log.error("Test in game failed:", error);
      setSyncStatus("error");
      toast({
        variant: "destructive",
        title: "Test Failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not spawn asset in game",
        duration: 4000,
      });
    } finally {
      setIsTestingInGame(false);
    }
  };

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
      log.error("Download failed:", error);
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
      log.error("Export failed:", error);
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
      log.error("Duplicate failed:", error);
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
      log.error("Delete failed:", error);
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

  const handleAddToWorld = async () => {
    setIsAddingToWorld(true);

    try {
      // Step 1: Export asset to game server (if local)
      if (asset.source === "LOCAL") {
        toast({
          variant: "default",
          title: "Exporting Asset",
          description: "Copying files to game server...",
          duration: 2000,
        });

        const exportResponse = await fetch("/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetId: asset.id,
            targetType:
              asset.category === "npc" || asset.category === "mob"
                ? "npc"
                : asset.category === "resource"
                  ? "resource"
                  : "item",
            isDraft: false,
            manifestEntry: {
              id: asset.id,
              name: asset.name,
              type: asset.type || asset.category,
              description: asset.description,
              rarity: asset.rarity,
            },
          }),
        });

        if (!exportResponse.ok) {
          const error = await exportResponse.json();
          throw new Error(error.error || "Export failed");
        }
      }

      // Step 2: Add entity to world.json
      toast({
        variant: "default",
        title: "Adding to World",
        description: "Creating world entity...",
        duration: 2000,
      });

      // Determine model path based on source
      const modelPath =
        asset.source === "CDN" && "modelPath" in asset
          ? `asset://world${asset.modelPath}`
          : `asset://models/${asset.id}/${asset.id}.glb`;

      const entityResponse = await fetch("/api/world/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `${asset.id}_${Date.now().toString(36).slice(-4)}`,
          name: asset.name,
          type:
            asset.category === "npc" || asset.category === "mob"
              ? "npc"
              : asset.category === "resource"
                ? "resource"
                : "app",
          blueprint: modelPath,
          position: { x: 0, y: 0, z: 0 }, // Default spawn position
          data: {
            assetId: asset.id,
            category: asset.category,
            spawnArea: "central_haven", // Default area
          },
        }),
      });

      if (!entityResponse.ok) {
        const error = await entityResponse.json();
        throw new Error(error.error || "Failed to add entity");
      }

      // Step 3: Trigger server hot reload
      toast({
        variant: "default",
        title: "Reloading Server",
        description: "Triggering hot reload...",
        duration: 2000,
      });

      const reloadResponse = await fetch("/api/server/reload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const reloadResult = await reloadResponse.json();

      if (reloadResponse.ok && reloadResult.success) {
        toast({
          variant: "success",
          title: "Added to World!",
          description: `${asset.name} is now in the game world. Server reloaded.`,
          duration: 5000,
        });
      } else {
        // Entity added but reload failed (maybe server not running)
        toast({
          variant: "default",
          title: "Added to World",
          description: `${asset.name} added to world.json. Restart server to see changes.`,
          duration: 5000,
        });
      }
    } catch (error) {
      log.error("Add to world failed:", error);
      toast({
        variant: "destructive",
        title: "Failed to Add to World",
        description: error instanceof Error ? error.message : "Unknown error",
        duration: 5000,
      });
    } finally {
      setIsAddingToWorld(false);
    }
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
          {/* Sync Status Badge */}
          <Badge
            variant="secondary"
            className={cn(
              "text-xs flex items-center gap-1",
              syncStatus === "in_game" &&
                "bg-green-500/20 text-green-300 border-green-500/30",
              syncStatus === "exported" &&
                "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
              syncStatus === "draft" &&
                "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
              syncStatus === "syncing" &&
                "bg-blue-500/20 text-blue-300 border-blue-500/30",
              syncStatus === "error" &&
                "bg-red-500/20 text-red-300 border-red-500/30",
            )}
          >
            {syncStatus === "in_game" && <CheckCircle2 className="w-3 h-3" />}
            {syncStatus === "exported" && <CloudUpload className="w-3 h-3" />}
            {syncStatus === "draft" && <Circle className="w-3 h-3" />}
            {syncStatus === "syncing" && (
              <Loader2 className="w-3 h-3 animate-spin" />
            )}
            {syncStatus === "error" && <AlertTriangle className="w-3 h-3" />}
            {syncStatus === "in_game"
              ? "In Game"
              : syncStatus === "exported"
                ? "Exported"
                : syncStatus === "draft"
                  ? "Draft"
                  : syncStatus === "syncing"
                    ? "Syncing..."
                    : "Error"}
          </Badge>

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

          {/* Mesh Statistics */}
          {isLoadingMeshStats && (
            <div className="flex items-center py-2">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400 mr-2" />
              <span className="text-xs text-muted-foreground">
                Loading mesh stats...
              </span>
            </div>
          )}

          {meshStats && (
            <div className="mt-4 pt-4 border-t border-glass-border space-y-3">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold">Mesh Statistics</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                {meshStats.triangles > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded bg-glass-bg/50">
                    <Triangle className="w-4 h-4 text-blue-400" />
                    <div>
                      <p className="text-xs text-muted-foreground">Triangles</p>
                      <p className="font-semibold">
                        {meshStats.triangles.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {meshStats.vertices > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded bg-glass-bg/50">
                    <Hexagon className="w-4 h-4 text-purple-400" />
                    <div>
                      <p className="text-xs text-muted-foreground">Vertices</p>
                      <p className="font-semibold">
                        {meshStats.vertices.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {meshStats.polycount > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded bg-glass-bg/50">
                    <Layers className="w-4 h-4 text-green-400" />
                    <div>
                      <p className="text-xs text-muted-foreground">Polycount</p>
                      <p className="font-semibold">
                        {meshStats.polycount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {meshStats.meshCount && meshStats.meshCount > 0 && (
                  <div className="flex items-center gap-2 p-2 rounded bg-glass-bg/50">
                    <Package className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="text-xs text-muted-foreground">Meshes</p>
                      <p className="font-semibold">{meshStats.meshCount}</p>
                    </div>
                  </div>
                )}

                {meshStats.topology && (
                  <div className="flex items-center gap-2 p-2 rounded bg-glass-bg/50">
                    <Triangle className="w-4 h-4 text-orange-400" />
                    <div>
                      <p className="text-xs text-muted-foreground">Topology</p>
                      <p className="font-semibold capitalize">
                        {meshStats.topology}
                      </p>
                    </div>
                  </div>
                )}

                {meshStats.textureResolution && (
                  <div className="flex items-center gap-2 p-2 rounded bg-glass-bg/50">
                    <Layers className="w-4 h-4 text-pink-400" />
                    <div>
                      <p className="text-xs text-muted-foreground">Texture</p>
                      <p className="font-semibold">
                        {meshStats.textureResolution}px
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Material info */}
              <div className="flex flex-wrap gap-2 text-xs">
                {meshStats.hasPBR && (
                  <Badge variant="outline" className="text-cyan-400">
                    PBR Materials
                  </Badge>
                )}
                {meshStats.fileSize && (
                  <Badge variant="outline" className="text-muted-foreground">
                    {meshStats.fileSize < 1024 * 1024
                      ? `${(meshStats.fileSize / 1024).toFixed(0)} KB`
                      : `${(meshStats.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Generation Style & Materials Section */}
          {(() => {
            // Extract generation params from local assets
            const genParams = (
              asset as { generationParams?: Record<string, unknown> }
            ).generationParams;
            const assetGameStyle =
              (genParams?.gameStyle as string) ||
              (genParams?.style as string) ||
              null;
            const assetMaterialId =
              (genParams?.materialPresetId as string) ||
              (genParams?.material as string) ||
              null;
            const assetMaterial = assetMaterialId
              ? materialPresets.find((m) => m.id === assetMaterialId)
              : null;
            const gameStyleInfo = assetGameStyle
              ? gameStyles[assetGameStyle]
              : null;

            // Check if this asset supports materials
            const supportsMaterials = MATERIAL_SUPPORTED_CATEGORIES.some(
              (cat) =>
                asset.category?.toLowerCase().includes(cat) ||
                asset.type?.toLowerCase().includes(cat),
            );

            // Show section if we have style info, material info, or the asset supports materials
            if (
              !gameStyleInfo &&
              !assetMaterial &&
              !supportsMaterials &&
              !isLoadingPresets
            ) {
              return null;
            }

            return (
              <div className="mt-4 pt-4 border-t border-glass-border space-y-3">
                {/* Game Style Info */}
                {(gameStyleInfo || assetGameStyle) && (
                  <>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-semibold">
                        Generation Style
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-glass-bg/50 border border-glass-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {gameStyleInfo?.name || assetGameStyle}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] text-amber-400"
                        >
                          {assetGameStyle}
                        </Badge>
                      </div>
                      {gameStyleInfo?.base && (
                        <p className="text-xs text-muted-foreground">
                          {gameStyleInfo.base}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* Current Material Info */}
                {assetMaterial && (
                  <>
                    <div className="flex items-center gap-2 mt-3">
                      <Palette className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-semibold">
                        Material Used
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-glass-bg/50 border border-glass-border">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-md border border-glass-border"
                          style={{ backgroundColor: assetMaterial.color }}
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium">
                            {assetMaterial.displayName}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            Tier {assetMaterial.tier} •{" "}
                            {assetMaterial.category}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Available Materials for this item type */}
                {supportsMaterials && materialPresets.length > 0 && (
                  <>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-semibold">
                          Available Materials
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] text-muted-foreground"
                      >
                        {materialPresets.length} materials
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use Regenerate to create variants with different
                      materials
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {materialPresets.slice(0, 8).map((material) => (
                        <div
                          key={material.id}
                          className="flex flex-col items-center p-2 rounded-lg bg-glass-bg/30 border border-glass-border hover:border-purple-500/50 transition-colors cursor-default"
                          title={`${material.displayName} - ${material.description || material.stylePrompt}`}
                        >
                          <div
                            className="w-6 h-6 rounded-md border border-glass-border mb-1"
                            style={{ backgroundColor: material.color }}
                          />
                          <span className="text-[10px] text-center truncate w-full">
                            {material.displayName}
                          </span>
                        </div>
                      ))}
                    </div>
                    {materialPresets.length > 8 && (
                      <p className="text-[10px] text-muted-foreground text-center">
                        +{materialPresets.length - 8} more materials
                      </p>
                    )}
                  </>
                )}

                {isLoadingPresets && (
                  <div className="flex items-center py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400 mr-2" />
                    <span className="text-xs text-muted-foreground">
                      Loading style info...
                    </span>
                  </div>
                )}
              </div>
            );
          })()}

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

          {/* Item Drop Sources */}
          {dropSources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-glass-border space-y-3">
              <div className="flex items-center gap-2">
                <Skull className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold">Dropped By</span>
                <Badge variant="outline" className="text-[10px] ml-auto">
                  {dropSources.length} source
                  {dropSources.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto themed-scrollbar">
                {dropSources.map((source, idx) => {
                  const quantityText =
                    source.minQuantity === source.maxQuantity
                      ? `×${source.minQuantity}`
                      : `×${source.minQuantity}-${source.maxQuantity}`;

                  const chanceText =
                    source.chance >= 1
                      ? "Always"
                      : source.chance >= 0.1
                        ? `${(source.chance * 100).toFixed(0)}%`
                        : source.chance >= 0.01
                          ? `${(source.chance * 100).toFixed(1)}%`
                          : `1/${Math.round(1 / source.chance)}`;

                  return (
                    <div
                      key={`${source.npcId}-${idx}`}
                      className="flex items-center justify-between p-2 rounded bg-glass-bg/50 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Skull className="w-3 h-3 text-purple-400" />
                        <div>
                          <span className="font-medium">{source.npcName}</span>
                          <span className="text-xs text-muted-foreground ml-1">
                            (Lv. {source.npcLevel})
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {quantityText}
                        </span>
                        <Badge
                          variant={
                            source.dropRarity === "always"
                              ? "default"
                              : "outline"
                          }
                          className={cn(
                            "text-[10px]",
                            source.dropRarity === "always" &&
                              "bg-green-500/20 text-green-400",
                            source.dropRarity === "common" && "text-gray-400",
                            source.dropRarity === "uncommon" &&
                              "text-green-400",
                            source.dropRarity === "rare" && "text-blue-400",
                            source.dropRarity === "very_rare" &&
                              "text-purple-400",
                          )}
                        >
                          {chanceText}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              {dropSources.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  This item is not dropped by any monsters
                </p>
              )}
            </div>
          )}

          {/* Store Availability */}
          {storeInfo.length > 0 && (
            <div className="mt-4 pt-4 border-t border-glass-border space-y-3">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-green-400" />
                <span className="text-sm font-semibold">
                  Available in Stores
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] ml-auto text-green-400"
                >
                  {storeInfo.length} store{storeInfo.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto themed-scrollbar">
                {storeInfo.map((store) => (
                  <div
                    key={store.storeId}
                    className="p-2 rounded bg-glass-bg/50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-3 h-3 text-green-400" />
                        <span className="text-sm font-medium">
                          {store.storeName}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-amber-400 flex items-center gap-1">
                          <Coins className="w-3 h-3" />
                          {store.price.toLocaleString()} gp
                        </span>
                        <span
                          className={cn(
                            "flex items-center gap-1",
                            store.stock === "unlimited"
                              ? "text-green-400"
                              : typeof store.stock === "number" &&
                                  store.stock > 10
                                ? "text-blue-400"
                                : "text-orange-400",
                          )}
                        >
                          <Package className="w-3 h-3" />
                          {store.stock === "unlimited"
                            ? "Unlimited stock"
                            : `${store.stock} in stock`}
                        </span>
                      </div>
                      {store.buybackRate && (
                        <span className="text-muted-foreground">
                          Buyback: {Math.round(store.buybackRate * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
                    {asset.createdAt
                      ? new Date(asset.createdAt).toLocaleDateString()
                      : "Unknown"}
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

          {/* Test in Game - One-click export, spawn, and open game */}
          <div className="space-y-2 p-3 rounded-lg bg-gradient-to-br from-green-500/10 via-cyan-500/5 to-transparent border border-green-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-green-300 flex items-center gap-1.5 uppercase tracking-wide">
                <Play className="w-3 h-3" />
                Quick Test
              </span>
              <button
                onClick={() => setShowSpawnPicker(!showSpawnPicker)}
                className={cn(
                  "text-xs px-2 py-1 rounded-md flex items-center gap-1 transition-all",
                  showSpawnPicker
                    ? "bg-green-500/20 text-green-300"
                    : "text-muted-foreground hover:text-foreground hover:bg-glass-bg",
                )}
                title="Choose spawn location"
              >
                <MapPin className="w-3 h-3" />
                {spawnLocation.name}
              </button>
            </div>

            {showSpawnPicker && (
              <div className="grid grid-cols-2 gap-1.5 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                {SPAWN_LOCATIONS.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => {
                      setSelectedSpawnLocation(loc.id);
                      setShowSpawnPicker(false);
                    }}
                    className={cn(
                      "text-xs px-2 py-1.5 rounded-md border transition-all text-left",
                      selectedSpawnLocation === loc.id
                        ? "bg-green-500/20 border-green-500/50 text-green-300"
                        : "bg-glass-bg/50 border-glass-border hover:border-green-500/30 hover:bg-glass-bg",
                    )}
                  >
                    <span className="flex items-center gap-1">
                      {selectedSpawnLocation === loc.id && (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      {loc.name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <SpectacularButton
              className="w-full"
              variant="default"
              onClick={handleTestInGame}
              disabled={isTestingInGame || syncStatus === "syncing"}
            >
              {isTestingInGame ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Spawning...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Test in Game
                </>
              )}
            </SpectacularButton>
            <p className="text-[10px] text-muted-foreground/70 text-center">
              Export → Spawn → Open Game
            </p>
          </div>

          {/* Add to World - exports, adds to world.json, and reloads server */}
          <SpectacularButton
            className="w-full"
            variant="primary"
            onClick={handleAddToWorld}
            disabled={isAddingToWorld}
          >
            {isAddingToWorld ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Adding to World...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 mr-2" />
                Add to World
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
