"use client";

import { AssetListItem } from "./AssetListItem";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useCDNAssets } from "@/hooks/useCDNAssets";
import { cdnAssetToAssetData } from "@/lib/utils/asset-converter";
import type { CDNAsset } from "@/lib-core/cdn/types";
import type { AssetData } from "@/types/asset";

interface AssetLibraryProps {
  onAssetSelect?: (asset: AssetData) => void;
}

export function AssetLibrary({ onAssetSelect }: AssetLibraryProps) {
  const { assets, loading, error } = useCDNAssets();

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
      <EmptyState title="No Assets" description="No assets found in CDN" />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {assets.map((asset) => (
            <AssetListItem
              key={asset.id}
              asset={asset}
              onSelect={(cdnAsset) =>
                onAssetSelect?.(cdnAssetToAssetData(cdnAsset))
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
