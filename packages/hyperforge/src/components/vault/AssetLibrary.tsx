"use client";

import { useState, useCallback } from "react";
import { AssetListItem } from "./AssetListItem";
import { EmptyState } from "@/components/ui/empty-state";
import { AssetListSkeleton } from "@/components/ui/skeleton";
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
import { useAssetStore } from "@/stores/asset-store";
import { useToast } from "@/components/ui/toast";
import { logger } from "@/lib/utils";
import type { BaseAsset } from "@/types/asset";
import type { TextureVariant } from "@/components/generation/GenerationFormRouter";
import { Palette, X, Package, Download, Trash2, CheckSquare } from "lucide-react";

const log = logger.child("AssetLibrary");

interface AssetLibraryProps {
  onAssetSelect?: (asset: BaseAsset) => void;
  selectedAsset?: BaseAsset | null;
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
  const { toast } = useToast();

  // Multi-select state from asset store
  const selectedAssetIds = useAssetStore((state) => state.selectedAssetIds);
  const toggleAssetSelection = useAssetStore((state) => state.toggleAssetSelection);
  const clearSelection = useAssetStore((state) => state.clearSelection);
  const removeAssets = useAssetStore((state) => state.removeAssets);

  // Handle bulk export
  const handleBulkExport = useCallback(async () => {
    const ids = Array.from(selectedAssetIds);
    if (ids.length === 0) return;

    toast({
      title: "Exporting Assets",
      description: `Exporting ${ids.length} asset(s)...`,
      duration: 2000,
    });

    try {
      const response = await fetch("/api/bulk/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds: ids }),
      });

      if (response.ok) {
        toast({
          variant: "success",
          title: "Export Complete",
          description: `${ids.length} asset(s) exported successfully`,
          duration: 3000,
        });
      } else {
        throw new Error("Export failed");
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export selected assets",
        duration: 3000,
      });
    }
  }, [selectedAssetIds, toast]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedAssetIds);
    if (ids.length === 0) return;

    if (confirm(`Delete ${ids.length} selected asset(s)? This cannot be undone.`)) {
      removeAssets(ids);
      toast({
        variant: "success",
        title: "Assets Deleted",
        description: `${ids.length} asset(s) deleted`,
        duration: 3000,
      });
    }
  }, [selectedAssetIds, removeAssets, toast]);

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

  // Handle single asset export
  const handleExportAsset = useCallback(async (asset: LibraryAsset) => {
    toast({
      title: "Exporting Asset",
      description: `Exporting ${asset.name}...`,
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

      if (response.ok) {
        toast({
          variant: "success",
          title: "Export Complete",
          description: `${asset.name} exported to game manifests`,
          duration: 3000,
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }
    } catch (error) {
      log.error("Export failed", { error, assetId: asset.id });
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export asset",
        duration: 3000,
      });
    }
  }, [toast]);

  // Handle single asset delete
  const handleDeleteAsset = useCallback(async (asset: LibraryAsset) => {
    if (!confirm(`Delete "${asset.name}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        removeAssets([asset.id]);
        toast({
          variant: "success",
          title: "Asset Deleted",
          description: `${asset.name} has been deleted`,
          duration: 3000,
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || "Delete failed");
      }
    } catch (error) {
      log.error("Delete failed", { error, assetId: asset.id });
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete asset",
        duration: 3000,
      });
    }
  }, [removeAssets, toast]);

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
        log.info("Variants created", { result });
      }
    } catch (error) {
      log.error("Failed to create variants", { error });
    } finally {
      setIsCreatingVariants(false);
      setShowVariantModal(false);
      setSelectedAssetForVariant(null);
      setPendingVariants([]);
    }
  };

  if (loading) {
    return <AssetListSkeleton count={8} />;
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
              isMultiSelected={selectedAssetIds.has(asset.id)}
              isFavorite={isFavorite(asset.id)}
              isHidden={isHidden(asset.id)}
              thumbnailOverride={getThumbnailUrl(asset.id, undefined)}
              onSelect={(clickedAsset) =>
                onAssetSelect?.(
                  cdnAssetToAssetData(clickedAsset as CDNAssetInput),
                )
              }
              onMultiSelect={(a) => toggleAssetSelection(a.id)}
              onFavorite={(a) => toggleFavorite(a.id)}
              onCreateVariant={handleCreateVariant}
              onHide={handleHideAsset}
              onUnhide={handleUnhideAsset}
              onExport={handleExportAsset}
              onDelete={handleDeleteAsset}
            />
          ))}
        </div>
      </div>

      {/* Bulk Action Bar - shown when multiple assets selected */}
      {selectedAssetIds.size > 0 && (
        <div className="sticky bottom-0 p-3 bg-zinc-900/95 border-t border-glass-border backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-medium">
                {selectedAssetIds.size} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <SpectacularButton
                variant="outline"
                size="sm"
                onClick={handleBulkExport}
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </SpectacularButton>
              <SpectacularButton
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </SpectacularButton>
              <SpectacularButton
                variant="ghost"
                size="sm"
                onClick={clearSelection}
              >
                <X className="w-4 h-4" />
              </SpectacularButton>
            </div>
          </div>
        </div>
      )}

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
