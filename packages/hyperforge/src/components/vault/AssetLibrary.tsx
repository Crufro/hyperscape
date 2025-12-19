"use client";

import { useState } from "react";
import { AssetListItem } from "./AssetListItem";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Modal } from "@/components/ui/modal";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { VariantDefinitionPanel } from "@/components/generation/VariantDefinitionPanel";
import { useCDNAssets, type LibraryAsset } from "@/hooks/useCDNAssets";
import { useFavorites } from "@/hooks/useFavorites";
import { useThumbnailOverrides } from "@/hooks/useThumbnailOverrides";
import { useHiddenAssets } from "@/hooks/useHiddenAssets";
import {
  cdnAssetToAssetData,
  type CDNAssetInput,
} from "@/lib/utils/asset-converter";
import { useVariantStore } from "@/stores/variant-store";
import type { AssetData } from "@/types/asset";
import type { TextureVariant } from "@/components/generation/GenerationFormRouter";
import { Palette, X, Package } from "lucide-react";

interface AssetLibraryProps {
  onAssetSelect?: (asset: AssetData) => void;
  selectedAsset?: AssetData | null;
  searchQuery?: string;
  categoryFilter?: string;
  onAssetDeleted?: (assetId: string) => void;
}

export function AssetLibrary({
  onAssetSelect,
  selectedAsset,
  searchQuery = "",
  categoryFilter = "all",
  onAssetDeleted: _onAssetDeleted,
}: AssetLibraryProps) {
  const { assets, loading, error } = useCDNAssets();
  const { setBaseModel } = useVariantStore();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { getThumbnailUrl } = useThumbnailOverrides();
  const {
    isHidden,
    hideAsset,
    unhideAsset,
    hiddenCount: _hiddenCount,
  } = useHiddenAssets();

  // Filter assets based on search, category, and hidden status
  const filteredAssets = assets.filter((asset) => {
    // Hidden filter - always exclude hidden assets (unless showing hidden category)
    if (categoryFilter !== "hidden" && isHidden(asset.id)) {
      return false;
    }

    // Hidden category filter - only show hidden assets
    if (categoryFilter === "hidden") {
      return isHidden(asset.id);
    }

    // Favorites filter
    if (categoryFilter === "favorites") {
      if (!isFavorite(asset.id)) return false;
    }

    // Search filter - check name, type, category
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        asset.name.toLowerCase().includes(query) ||
        asset.type?.toLowerCase().includes(query) ||
        asset.category?.toLowerCase().includes(query) ||
        asset.rarity?.toLowerCase().includes(query) ||
        asset.equipSlot?.toLowerCase().includes(query) ||
        asset.weaponType?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Category filter (skip for "all" and "favorites" which are handled above)
    if (categoryFilter !== "all" && categoryFilter !== "favorites") {
      // Check both category and type fields
      const assetCategory = asset.category?.toLowerCase();
      const assetType = asset.type?.toLowerCase();
      const filterValue = categoryFilter.toLowerCase();

      if (assetCategory !== filterValue && assetType !== filterValue) {
        return false;
      }
    }

    return true;
  });

  // Handle hide asset
  const handleHideAsset = (asset: LibraryAsset) => {
    hideAsset(asset.id);
  };

  // Handle unhide asset
  const handleUnhideAsset = (asset: LibraryAsset) => {
    unhideAsset(asset.id);
  };

  // Variant creation modal state
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedAssetForVariant, setSelectedAssetForVariant] =
    useState<LibraryAsset | null>(null);
  const [pendingVariants, setPendingVariants] = useState<TextureVariant[]>([]);
  const [isCreatingVariants, setIsCreatingVariants] = useState(false);

  const handleCreateVariant = (asset: LibraryAsset) => {
    setSelectedAssetForVariant(asset);
    setBaseModel(asset.id, asset.modelPath || "", asset.name);
    setPendingVariants([]);
    setShowVariantModal(true);
  };

  const handleSubmitVariants = async () => {
    if (!selectedAssetForVariant || pendingVariants.length === 0) return;

    setIsCreatingVariants(true);

    try {
      const response = await fetch("/api/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch",
          baseModelId: selectedAssetForVariant.id,
          baseModelUrl: selectedAssetForVariant.modelPath,
          variants: pendingVariants,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Variants created:", result);
      }
    } catch (error) {
      console.error("Failed to create variants:", error);
    } finally {
      setIsCreatingVariants(false);
      setShowVariantModal(false);
      setSelectedAssetForVariant(null);
      setPendingVariants([]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-destructive">
        Error loading assets: {error.message}
      </div>
    );
  }

  if (!assets || assets.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No Assets"
        description="No assets found in CDN"
      />
    );
  }

  if (filteredAssets.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No Results"
        description={
          searchQuery
            ? `No assets match "${searchQuery}"`
            : "No assets in this category"
        }
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {filteredAssets.map((asset) => (
            <AssetListItem
              key={asset.id}
              asset={asset}
              isSelected={selectedAsset?.id === asset.id}
              isFavorite={isFavorite(asset.id)}
              isHidden={isHidden(asset.id)}
              thumbnailOverride={getThumbnailUrl(asset.id, undefined)}
              onSelect={(clickedAsset) =>
                onAssetSelect?.(
                  cdnAssetToAssetData(clickedAsset as CDNAssetInput),
                )
              }
              onFavorite={(a) => toggleFavorite(a.id)}
              onCreateVariant={handleCreateVariant}
              onHide={handleHideAsset}
              onUnhide={handleUnhideAsset}
            />
          ))}
        </div>
      </div>

      {/* Variant Creation Modal */}
      <Modal
        isOpen={showVariantModal}
        onClose={() => setShowVariantModal(false)}
        title="Create Texture Variants"
      >
        <div className="space-y-4">
          {selectedAssetForVariant && (
            <p className="text-sm text-muted-foreground">
              Create texture variants for{" "}
              <span className="font-medium text-foreground">
                {selectedAssetForVariant.name}
              </span>
              . Each variant uses the same base mesh with different textures.
            </p>
          )}

          <VariantDefinitionPanel
            variants={pendingVariants}
            onVariantsChange={setPendingVariants}
          />

          <div className="flex gap-2 pt-4 border-t border-glass-border">
            <SpectacularButton
              variant="outline"
              onClick={() => setShowVariantModal(false)}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </SpectacularButton>
            <SpectacularButton
              onClick={handleSubmitVariants}
              disabled={pendingVariants.length === 0 || isCreatingVariants}
              className="flex-1"
            >
              <Palette className="w-4 h-4 mr-2" />
              {isCreatingVariants
                ? "Creating..."
                : `Create ${pendingVariants.length} Variant${pendingVariants.length !== 1 ? "s" : ""}`}
            </SpectacularButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
