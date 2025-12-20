"use client";

import { StudioPageLayout } from "@/components/layout/StudioPageLayout";
import { ImageAssetsViewer } from "@/components/images/ImageAssetsViewer";

export default function ImageAssetsPage() {
  return (
    <StudioPageLayout
      title="Image Assets"
      description="Browse and manage generated images"
      showVault={false}
    >
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-glass-border bg-glass-bg/30">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Image Assets</h1>
            <p className="text-muted-foreground">
              Browse generated concept art, sprites, textures, and icons.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <ImageAssetsViewer />
          </div>
        </div>
      </div>
    </StudioPageLayout>
  );
}
