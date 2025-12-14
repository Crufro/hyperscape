"use client";

import {
  Star,
  Globe,
  Box,
  HardDrive,
  Sparkles,
  User,
  Swords,
  Shield,
  Wrench,
  TreeDeciduous,
  Coins,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CDNAsset } from "@/lib-core/cdn/types";
import { cn } from "@/lib/utils";

interface AssetWithSource extends CDNAsset {
  source?: "CDN" | "LOCAL";
  createdAt?: string;
  status?: string;
  hasHandRigging?: boolean;
}

interface AssetListItemProps {
  asset: AssetWithSource;
  isSelected?: boolean;
  onSelect?: (asset: AssetWithSource) => void;
  onFavorite?: (asset: AssetWithSource) => void;
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

export function AssetListItem({
  asset,
  isSelected,
  onSelect,
  onFavorite,
}: AssetListItemProps) {
  const isLocal = asset.source === "LOCAL";
  const hasVRM =
    asset.hasVRM ||
    asset.vrmPath?.endsWith(".vrm") ||
    asset.modelPath?.endsWith(".vrm");
  const CategoryIcon = getCategoryIcon(asset.category, asset.type);

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
        "w-full flex items-center gap-3 p-3 mb-1 rounded-lg cursor-pointer",
        "transition-all duration-200 hover:bg-glass-bg/50",
        isSelected
          ? "bg-neon-blue/10 border border-neon-blue/20"
          : "border border-transparent",
      )}
      onClick={() => onSelect?.(asset)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(asset);
        }
      }}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-8 h-8 rounded flex items-center justify-center flex-shrink-0",
          iconBgClass,
        )}
      >
        <CategoryIcon className={cn("w-4 h-4", iconColorClass)} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium truncate">{asset.name}</p>
          {/* Level/Requirements indicator */}
          {asset.levelRequired && asset.levelRequired > 1 && (
            <span className="text-[10px] text-muted-foreground">
              Lv.{asset.levelRequired}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* VRM Badge - highest priority */}
          {hasVRM && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
            >
              VRM
            </Badge>
          )}
          {/* Hand Rigging Badge */}
          {asset.hasHandRigging && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 bg-purple-500/20 text-purple-300 border-purple-500/30"
            >
              Hands
            </Badge>
          )}
          {/* Source Badge */}
          {isLocal ? (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 bg-purple-500/20 text-purple-300 border-purple-500/30"
            >
              LOCAL
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              CDN
            </Badge>
          )}
          {/* Rarity Badge */}
          {asset.rarity && asset.rarity !== "common" && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 capitalize",
                rarityColors[asset.rarity] || "",
              )}
            >
              {asset.rarity.replace("_", " ")}
            </Badge>
          )}
          {/* Type Badge */}
          {asset.type && !hasVRM && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 capitalize"
            >
              {asset.type.replace("_", " ")}
            </Badge>
          )}
          {/* Weapon Type */}
          {asset.weaponType && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {asset.weaponType}
            </Badge>
          )}
          {/* Equip Slot */}
          {asset.equipSlot && asset.equipSlot !== "weapon" && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 capitalize"
            >
              {asset.equipSlot}
            </Badge>
          )}
        </div>
      </div>

      {/* Value indicator */}
      {asset.value && asset.value > 0 && (
        <div className="text-[10px] text-amber-400 flex items-center gap-0.5 flex-shrink-0">
          <Coins className="w-3 h-3" />
          {asset.value >= 1000
            ? `${(asset.value / 1000).toFixed(0)}k`
            : asset.value}
        </div>
      )}

      {/* Favorite */}
      <button
        type="button"
        className="w-6 h-6 p-0 flex-shrink-0 flex items-center justify-center rounded hover:bg-glass-bg transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onFavorite?.(asset);
        }}
      >
        <Star className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}
