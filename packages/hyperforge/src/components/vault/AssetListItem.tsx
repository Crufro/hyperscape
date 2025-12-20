"use client";

import { useState, useEffect, memo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Box,
  User,
  Swords,
  Shield,
  Wrench,
  TreeDeciduous,
  Coins,
  Store,
  Package,
  MoreVertical,
  Palette,
  Download,
  Copy,
  EyeOff,
  Eye,
  Square,
  CheckSquare,
  Sparkles,
  Upload,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type LibraryAsset } from "@/hooks/useCDNAssets";
import { cn } from "@/lib/utils";

interface ItemStoreInfo {
  storeId: string;
  storeName: string;
  price: number;
  stock: number | "unlimited";
  buybackRate?: number;
}

// Use LibraryAsset from the hook which properly extends CDNAsset
type AssetWithSource = LibraryAsset & {
  hasHandRigging?: boolean;
};

interface AssetListItemProps {
  asset: AssetWithSource;
  isSelected?: boolean;
  /** Whether the asset is selected for multi-select operations */
  isMultiSelected?: boolean;
  isFavorite?: boolean;
  /** Whether the asset is currently hidden */
  isHidden?: boolean;
  /** Optional thumbnail override URL (e.g., from generated sprites) */
  thumbnailOverride?: string;
  onSelect?: (asset: AssetWithSource) => void;
  /** Callback for multi-select toggle (Cmd/Ctrl+Click) */
  onMultiSelect?: (asset: AssetWithSource) => void;
  onFavorite?: (asset: AssetWithSource) => void;
  onCreateVariant?: (asset: AssetWithSource) => void;
  /** Callback to hide the asset from the list */
  onHide?: (asset: AssetWithSource) => void;
  /** Callback to unhide (restore) the asset */
  onUnhide?: (asset: AssetWithSource) => void;
  /** Callback to open enhancement panel (retexture/regenerate) */
  onEnhance?: (asset: AssetWithSource) => void;
  /** Callback to export asset to game */
  onExport?: (asset: AssetWithSource) => void;
  /** Callback to delete local asset */
  onDelete?: (asset: AssetWithSource) => void;
}

// Rarity colors
const rarityColors: Record<string, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  very_rare: "text-purple-400",
  epic: "text-purple-500",
  legendary: "text-orange-400",
  always: "text-yellow-400",
};

// Category icons
function getCategoryIcon(category: string, type?: string) {
  if (type === "avatar" || category === "avatar") return User;
  if (category === "weapon" || type === "weapon") return Swords;
  if (category === "armor" || type === "armor") return Shield;
  if (category === "tool" || type === "tool") return Wrench;
  if (category === "resource" || type === "tree" || type === "fishing_spot")
    return TreeDeciduous;
  if (category === "currency" || type === "currency") return Coins;
  if (category === "npc") return User;
  return Box;
}

export const AssetListItem = memo(function AssetListItem({
  asset,
  isSelected,
  isMultiSelected = false,
  isFavorite = false,
  isHidden = false,
  thumbnailOverride,
  onSelect,
  onMultiSelect,
  onFavorite,
  onCreateVariant,
  onHide,
  onUnhide,
  onEnhance,
  onExport,
  onDelete,
}: AssetListItemProps) {
  const [storeInfo, setStoreInfo] = useState<ItemStoreInfo[] | null>(null);
  const [showStoreInfo, setShowStoreInfo] = useState(false);

  // Use thumbnail override if available, otherwise fall back to asset's thumbnail
  const displayThumbnailUrl = thumbnailOverride || asset.thumbnailUrl;
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [thumbnailError, setThumbnailError] = useState(false);

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showContextMenu) {
        setShowContextMenu(false);
        setContextMenuPosition(null);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [showContextMenu]);

  const isLocal = asset.source === "LOCAL";
  const hasVRM =
    asset.hasVRM ||
    asset.vrmPath?.endsWith(".vrm") ||
    asset.modelPath?.endsWith(".vrm");
  const CategoryIcon = getCategoryIcon(asset.category, asset.type);

  // Check if this is an item that could be in stores
  const isGameItem =
    asset.category === "item" ||
    asset.type === "weapon" ||
    asset.type === "armor" ||
    asset.type === "tool";

  // Fetch store info when item is selected and has a value
  useEffect(() => {
    if (isSelected && isGameItem && asset.value && asset.value > 0) {
      fetch(`/api/game/stores?itemId=${asset.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.stores && data.stores.length > 0) {
            setStoreInfo(data.stores);
          } else {
            setStoreInfo(null);
          }
        })
        .catch(() => setStoreInfo(null));
    }
  }, [isSelected, asset.id, asset.value, isGameItem]);

  // Determine icon background color based on category
  const iconBgClass = hasVRM
    ? "bg-cyan-500/20"
    : isLocal
      ? "bg-purple-500/20"
      : asset.category === "weapon"
        ? "bg-red-500/20"
        : asset.category === "armor"
          ? "bg-blue-500/20"
          : asset.category === "tool"
            ? "bg-amber-500/20"
            : asset.category === "npc"
              ? "bg-green-500/20"
              : "bg-glass-bg";

  const iconColorClass = hasVRM
    ? "text-cyan-400"
    : isLocal
      ? "text-purple-400"
      : asset.category === "weapon"
        ? "text-red-400"
        : asset.category === "armor"
          ? "text-blue-400"
          : asset.category === "tool"
            ? "text-amber-400"
            : asset.category === "npc"
              ? "text-green-400"
              : "text-muted-foreground";

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "w-full flex items-center gap-3 p-3 mb-1 rounded-lg cursor-pointer relative",
        "transition-all duration-200 hover:bg-glass-bg/50",
        isMultiSelected
          ? "bg-cyan-500/10 border border-cyan-500/30"
          : isSelected
            ? "bg-neon-blue/10 border border-neon-blue/20"
            : "border border-transparent",
      )}
      onContextMenu={handleContextMenu}
      onClick={(e) => {
        // Cmd/Ctrl+Click for multi-select
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          onMultiSelect?.(asset);
        } else {
          onSelect?.(asset);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(asset);
        }
      }}
    >
      {/* Multi-select checkbox - 44px touch target */}
      {onMultiSelect && (
        <button
          type="button"
          className="w-11 h-11 min-w-[44px] min-h-[44px] flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-glass-bg transition-colors -m-2"
          onClick={(e) => {
            e.stopPropagation();
            onMultiSelect(asset);
          }}
          title="Toggle selection"
        >
          {isMultiSelected ? (
            <CheckSquare className="w-5 h-5 text-cyan-400" />
          ) : (
            <Square className="w-5 h-5 text-muted-foreground/50" />
          )}
        </button>
      )}

      {/* Thumbnail or Icon */}
      <div
        className={cn(
          "w-10 h-10 rounded flex items-center justify-center flex-shrink-0 overflow-hidden",
          iconBgClass,
        )}
      >
        {displayThumbnailUrl && !thumbnailError ? (
          <Image
            src={displayThumbnailUrl}
            alt={asset.name}
            width={40}
            height={40}
            className="w-full h-full object-cover"
            unoptimized // Allow external URLs without optimization
            onError={() => setThumbnailError(true)}
          />
        ) : (
          <CategoryIcon className={cn("w-4 h-4", iconColorClass)} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        {/* Title row - allow full width for name */}
        <p className="text-sm font-medium truncate mb-1" title={asset.name}>
          {asset.name}
        </p>
        {/* Badges row - limited to 3 most important badges */}
        <div className="flex items-center gap-1.5">
          {/* Source Badge - always show */}
          {isLocal ? (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 bg-purple-500/20 text-purple-300 border-purple-500/30 flex-shrink-0"
            >
              LOCAL
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 flex-shrink-0"
            >
              CDN
            </Badge>
          )}
          {/* Rarity Badge - show if not common */}
          {asset.rarity && asset.rarity !== "common" && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 capitalize flex-shrink-0",
                rarityColors[asset.rarity] || "",
              )}
            >
              {asset.rarity.replace("_", " ")}
            </Badge>
          )}
          {/* Type/Category indicator - compact */}
          <span className="text-[10px] text-muted-foreground capitalize truncate">
            {asset.type?.replace("_", " ") || asset.category}
            {asset.levelRequired &&
              asset.levelRequired > 1 &&
              ` · Lv.${asset.levelRequired}`}
          </span>
        </div>
      </div>

      {/* Value & Store indicator */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {asset.value && asset.value > 0 && (
          <div className="text-[10px] text-amber-400 flex items-center gap-0.5">
            <Coins className="w-3 h-3" />
            {asset.value >= 1000
              ? `${(asset.value / 1000).toFixed(0)}k`
              : asset.value}
          </div>
        )}

        {/* Store indicator - shows when item is in stores */}
        {storeInfo && storeInfo.length > 0 && (
          <button
            type="button"
            className="relative p-1 rounded hover:bg-glass-bg transition-colors group"
            onClick={(e) => {
              e.stopPropagation();
              setShowStoreInfo(!showStoreInfo);
            }}
            title={`Sold in ${storeInfo.length} store(s)`}
          >
            <Store className="w-3 h-3 text-green-400" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 text-[8px] text-white rounded-full flex items-center justify-center">
              {storeInfo.length}
            </span>
          </button>
        )}
      </div>

      {/* Favorite - 44px touch target */}
      <button
        type="button"
        className="w-11 h-11 min-w-[44px] min-h-[44px] p-0 flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-glass-bg transition-colors -m-2"
        onClick={(e) => {
          e.stopPropagation();
          onFavorite?.(asset);
        }}
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Star
          className={cn(
            "w-5 h-5 transition-colors",
            isFavorite
              ? "text-yellow-400 fill-yellow-400"
              : "text-muted-foreground hover:text-yellow-400",
          )}
        />
      </button>

      {/* Context Menu Button - 44px touch target */}
      <div className="relative">
        <button
          type="button"
          className="w-11 h-11 min-w-[44px] min-h-[44px] p-0 flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-glass-bg transition-colors -m-2"
          onClick={(e) => {
            e.stopPropagation();
            setShowContextMenu(!showContextMenu);
          }}
        >
          <MoreVertical className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Context Menu Dropdown with animation */}
        <AnimatePresence>
          {showContextMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-full mt-1 z-50 w-48 py-1 rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl origin-top-right"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Enhance (Retexture/Regenerate) */}
              {onEnhance && (
                <button
                  type="button"
                  className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-glass-bg transition-colors text-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowContextMenu(false);
                    onEnhance(asset);
                  }}
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Enhance Asset
                </button>
              )}

              {/* Create Texture Variant */}
              <button
                type="button"
                className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-glass-bg transition-colors text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowContextMenu(false);
                  onCreateVariant?.(asset);
                }}
              >
                <Palette className="w-4 h-4 text-purple-400" />
                Create Texture Variant
              </button>

              {/* Export to Game */}
              {onExport && (
                <button
                  type="button"
                  className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-glass-bg transition-colors text-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowContextMenu(false);
                    onExport(asset);
                  }}
                >
                  <Upload className="w-4 h-4 text-green-400" />
                  Export to Game
                </button>
              )}

              {/* Divider */}
              <div className="my-1 border-t border-glass-border" />

              {/* Download */}
              {asset.modelPath && (
                <a
                  href={asset.modelPath}
                  download
                  className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-glass-bg transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowContextMenu(false);
                  }}
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  Download Model
                </a>
              )}

              {/* Copy ID */}
              <button
                type="button"
                className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-glass-bg transition-colors text-left"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(asset.id);
                  setShowContextMenu(false);
                }}
              >
                <Copy className="w-4 h-4 text-muted-foreground" />
                Copy Asset ID
              </button>

              {/* Divider */}
              <div className="my-1 border-t border-glass-border" />

              {/* Hide/Unhide Asset */}
              {isHidden ? (
                <button
                  type="button"
                  className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-green-500/10 transition-colors text-left text-muted-foreground hover:text-green-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowContextMenu(false);
                    onUnhide?.(asset);
                  }}
                >
                  <Eye className="w-4 h-4" />
                  Unhide Asset
                </button>
              ) : (
                <button
                  type="button"
                  className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-red-500/10 transition-colors text-left text-muted-foreground hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowContextMenu(false);
                    onHide?.(asset);
                  }}
                >
                  <EyeOff className="w-4 h-4" />
                  Hide Asset
                </button>
              )}

              {/* Delete (local assets only) */}
              {onDelete && asset.source === "LOCAL" && (
                <>
                  <div className="my-1 border-t border-glass-border" />
                  <button
                    type="button"
                    className="w-full px-3 py-2 flex items-center gap-2 text-sm hover:bg-red-500/10 transition-colors text-left text-red-400 hover:text-red-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowContextMenu(false);
                      onDelete(asset);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Asset
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Store Info Popup */}
      {showStoreInfo && storeInfo && storeInfo.length > 0 && (
        <div
          className="absolute right-0 top-full mt-1 z-50 w-64 p-3 rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-glass-border">
            <Store className="w-4 h-4 text-green-400" />
            <span className="text-xs font-semibold">Available In Stores</span>
          </div>
          <div className="space-y-2">
            {storeInfo.map((store) => (
              <div
                key={store.storeId}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <Package className="w-3 h-3 text-muted-foreground" />
                  <span className="truncate">{store.storeName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 flex items-center gap-0.5">
                    <Coins className="w-3 h-3" />
                    {store.price}
                  </span>
                  <span
                    className={cn(
                      "text-[10px]",
                      store.stock === "unlimited"
                        ? "text-green-400"
                        : typeof store.stock === "number" && store.stock > 0
                          ? "text-blue-400"
                          : "text-red-400",
                    )}
                  >
                    {store.stock === "unlimited" ? "∞" : `×${store.stock}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {storeInfo[0]?.buybackRate && (
            <div className="mt-2 pt-2 border-t border-glass-border text-[10px] text-muted-foreground">
              Buyback: {Math.round((storeInfo[0].buybackRate || 0) * 100)}% of
              value
            </div>
          )}
        </div>
      )}

      {/* Right-click Context Menu (positioned at cursor) with animation */}
      <AnimatePresence>
        {showContextMenu && contextMenuPosition && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed z-[100] w-48 py-1 rounded-lg bg-black/95 border border-white/20 shadow-xl backdrop-blur-sm origin-top-left"
            style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Open/Select */}
            <button
              type="button"
              className="w-full px-4 py-2 flex items-center gap-2 text-sm hover:bg-white/10 transition-colors text-left"
              onClick={(e) => {
                e.stopPropagation();
                setShowContextMenu(false);
                setContextMenuPosition(null);
                onSelect?.(asset);
              }}
            >
              <Box className="w-4 h-4 text-cyan-400" />
              Open
            </button>

            {/* Create Texture Variant */}
            <button
              type="button"
              className="w-full px-4 py-2 flex items-center gap-2 text-sm hover:bg-white/10 transition-colors text-left"
              onClick={(e) => {
                e.stopPropagation();
                setShowContextMenu(false);
                setContextMenuPosition(null);
                onCreateVariant?.(asset);
              }}
            >
              <Palette className="w-4 h-4 text-purple-400" />
              Create Variant
            </button>

            {/* Download */}
            {asset.modelPath && (
              <a
                href={asset.modelPath}
                download
                className="w-full px-4 py-2 flex items-center gap-2 text-sm hover:bg-white/10 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowContextMenu(false);
                  setContextMenuPosition(null);
                }}
              >
                <Download className="w-4 h-4 text-green-400" />
                Export
              </a>
            )}

            {/* Copy ID */}
            <button
              type="button"
              className="w-full px-4 py-2 flex items-center gap-2 text-sm hover:bg-white/10 transition-colors text-left"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(asset.id);
                setShowContextMenu(false);
                setContextMenuPosition(null);
              }}
            >
              <Copy className="w-4 h-4 text-muted-foreground" />
              Copy ID
            </button>

            {/* Divider */}
            <div className="my-1 border-t border-white/10" />

            {/* Hide/Unhide */}
            {isHidden ? (
              <button
                type="button"
                className="w-full px-4 py-2 flex items-center gap-2 text-sm hover:bg-white/10 transition-colors text-left text-green-400"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowContextMenu(false);
                  setContextMenuPosition(null);
                  onUnhide?.(asset);
                }}
              >
                <Eye className="w-4 h-4" />
                Unhide
              </button>
            ) : (
              <button
                type="button"
                className="w-full px-4 py-2 flex items-center gap-2 text-sm hover:bg-white/10 transition-colors text-left text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowContextMenu(false);
                  setContextMenuPosition(null);
                  onHide?.(asset);
                }}
              >
                <EyeOff className="w-4 h-4" />
                Delete
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
