"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { AssetSource, AssetRarity, AssetCategory } from "@/types/cdn";

interface AssetFiltersProps {
  onFiltersChange?: (filters: FilterState) => void;
}

export interface FilterState {
  source: AssetSource | "all";
  rarity: AssetRarity | "all";
  category: AssetCategory | "all";
  search: string;
}

const sourceOptions = [
  { value: "all", label: "All Sources" },
  { value: "CDN", label: "CDN Assets" },
  { value: "LOCAL", label: "Local Assets" },
  { value: "BASE", label: "Base Assets" },
];

const rarityOptions = [
  { value: "all", label: "All Rarities" },
  { value: "Common", label: "Common" },
  { value: "Uncommon", label: "Uncommon" },
  { value: "Rare", label: "Rare" },
  { value: "Epic", label: "Epic" },
  { value: "Legendary", label: "Legendary" },
];

export function AssetFilters({ onFiltersChange }: AssetFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    source: "all",
    rarity: "all",
    category: "all",
    search: "",
  });

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-2">
        <Label>Source</Label>
        <Select
          value={filters.source}
          onChange={(value) =>
            updateFilter("source", value as FilterState["source"])
          }
          options={sourceOptions}
        />
      </div>

      <div className="space-y-2">
        <Label>Rarity</Label>
        <Select
          value={filters.rarity}
          onChange={(value) =>
            updateFilter("rarity", value as FilterState["rarity"])
          }
          options={rarityOptions}
        />
      </div>

      <div className="space-y-2">
        <Label>Show Only</Label>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox id="favorites" />
            <Label htmlFor="favorites" className="text-sm font-normal">
              Favorites
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="recent" />
            <Label htmlFor="recent" className="text-sm font-normal">
              Recently Used
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
