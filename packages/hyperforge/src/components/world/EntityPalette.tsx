"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  Search,
  Box,
  User,
  Sword,
  TreeDeciduous,
  Gem,
  ChevronDown,
  ChevronRight,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssetData } from "@/types/asset";

interface EntityPaletteProps {
  assets: AssetData[];
  onAssetDrag: (asset: AssetData) => void;
}

type CategoryFilter =
  | "all"
  | "npc"
  | "prop"
  | "item"
  | "resource"
  | "weapon"
  | "armor";

const categoryConfig: Record<
  CategoryFilter,
  { label: string; icon: typeof Box; color: string }
> = {
  all: { label: "All Assets", icon: Box, color: "text-muted-foreground" },
  npc: { label: "NPCs", icon: User, color: "text-green-400" },
  prop: { label: "Props", icon: Box, color: "text-blue-400" },
  item: { label: "Items", icon: Gem, color: "text-amber-400" },
  resource: {
    label: "Resources",
    icon: TreeDeciduous,
    color: "text-emerald-400",
  },
  weapon: { label: "Weapons", icon: Sword, color: "text-red-400" },
  armor: { label: "Armor", icon: User, color: "text-purple-400" },
};

export function EntityPalette({ assets, onAssetDrag }: EntityPaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["npc", "prop"]),
  );

  // Filter and group assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      // Search filter
      const matchesSearch = asset.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      // Category filter
      if (categoryFilter === "all") return matchesSearch;

      const assetCategory =
        asset.category?.toLowerCase() || asset.type?.toLowerCase() || "";
      return (
        matchesSearch &&
        (assetCategory === categoryFilter ||
          assetCategory.includes(categoryFilter))
      );
    });
  }, [assets, searchQuery, categoryFilter]);

  // Group by category
  const groupedAssets = useMemo(() => {
    const groups: Record<string, AssetData[]> = {};

    filteredAssets.forEach((asset) => {
      const category =
        asset.category?.toLowerCase() || asset.type?.toLowerCase() || "other";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(asset);
    });

    return groups;
  }, [filteredAssets]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, asset: AssetData) => {
    e.dataTransfer.setData("application/json", JSON.stringify(asset));
    e.dataTransfer.effectAllowed = "copy";
    onAssetDrag(asset);
  };

  const getCategoryIcon = (category: string) => {
    const config = categoryConfig[category as CategoryFilter];
    if (config) return config.icon;

    if (category.includes("npc") || category.includes("mob")) return User;
    if (category.includes("weapon")) return Sword;
    if (category.includes("resource") || category.includes("tree"))
      return TreeDeciduous;
    if (category.includes("item")) return Gem;
    return Box;
  };

  const getCategoryColor = (category: string) => {
    const config = categoryConfig[category as CategoryFilter];
    if (config) return config.color;

    if (category.includes("npc") || category.includes("mob"))
      return "text-green-400";
    if (category.includes("weapon")) return "text-red-400";
    if (category.includes("resource")) return "text-emerald-400";
    if (category.includes("item")) return "text-amber-400";
    return "text-blue-400";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-glass-border">
        <h3 className="text-sm font-semibold mb-3">Asset Palette</h3>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-glass-bg border border-glass-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-1">
          {Object.entries(categoryConfig).map(
            ([key, { label, icon: Icon, color }]) => (
              <button
                key={key}
                onClick={() => setCategoryFilter(key as CategoryFilter)}
                className={cn(
                  "px-2 py-1 text-xs rounded-md flex items-center gap-1 transition-colors",
                  categoryFilter === key
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "bg-glass-bg border border-glass-border hover:border-cyan-500/30",
                )}
              >
                <Icon
                  className={cn(
                    "w-3 h-3",
                    categoryFilter === key ? "text-cyan-400" : color,
                  )}
                />
                {key !== "all" && label}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Asset List */}
      <div className="flex-1 overflow-y-auto p-2">
        {Object.keys(groupedAssets).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No assets found
          </div>
        ) : (
          Object.entries(groupedAssets).map(([category, categoryAssets]) => {
            const Icon = getCategoryIcon(category);
            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category} className="mb-2">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-glass-bg transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  )}
                  <Icon className={cn("w-4 h-4", getCategoryColor(category))} />
                  <span className="text-xs font-medium capitalize">
                    {category}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {categoryAssets.length}
                  </span>
                </button>

                {/* Assets */}
                {isExpanded && (
                  <div className="mt-1 ml-5 space-y-1">
                    {categoryAssets.map((asset) => (
                      <div
                        key={asset.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, asset)}
                        className="flex items-center gap-2 p-2 rounded-lg bg-glass-bg/50 border border-glass-border hover:border-cyan-500/30 cursor-grab active:cursor-grabbing group transition-colors"
                      >
                        {/* Drag Handle */}
                        <GripVertical className="w-3 h-3 text-muted-foreground/50 group-hover:text-muted-foreground" />

                        {/* Thumbnail */}
                        <div className="w-8 h-8 rounded bg-zinc-800 overflow-hidden flex-shrink-0">
                          {asset.thumbnailUrl ? (
                            <Image
                              src={asset.thumbnailUrl}
                              alt={asset.name}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                              draggable={false}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Icon
                                className={cn(
                                  "w-4 h-4",
                                  getCategoryColor(category),
                                )}
                              />
                            </div>
                          )}
                        </div>

                        {/* Name */}
                        <span className="text-xs truncate flex-1">
                          {asset.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-glass-border text-xs text-muted-foreground">
        Drag assets to place in world
      </div>
    </div>
  );
}
