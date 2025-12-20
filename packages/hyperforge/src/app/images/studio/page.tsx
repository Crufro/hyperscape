"use client";

import { Palette, Grid3X3, Layers } from "lucide-react";
import { StudioPageLayout } from "@/components/layout/StudioPageLayout";
import { ImageStudioPanel } from "@/components/modules/ImageStudioPanel";
import { ImageAssetsViewer } from "@/components/images/ImageAssetsViewer";

export default function ImageStudioPage() {
  return (
    <StudioPageLayout
      title="Image Studio"
      description="Generate concept art, sprites, and textures with AI"
      showVault={false}
    >
      <div className="h-full flex">
        {/* Main Content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Image Studio</h1>
              <p className="text-muted-foreground">
                Generate concept art for 3D modeling, sprites for 2D games, and
                seamless textures for materials.
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-6 rounded-xl border border-glass-border bg-glass-bg/30 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4">
                  <Palette className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Concept Art</h3>
                <p className="text-sm text-muted-foreground">
                  Generate AI concept art for weapons, armor, characters, and
                  props to use as 3D modeling reference.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-glass-border bg-glass-bg/30 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4">
                  <Grid3X3 className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Sprites</h3>
                <p className="text-sm text-muted-foreground">
                  Create pixel art and 2D sprites for characters, items, tiles,
                  and UI elements.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-glass-border bg-glass-bg/30 backdrop-blur-sm">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4">
                  <Layers className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Textures</h3>
                <p className="text-sm text-muted-foreground">
                  Generate seamless tileable textures for ground, walls, metal,
                  wood, and more.
                </p>
              </div>
            </div>

            {/* Image Studio Panel */}
            <div className="rounded-xl border border-glass-border bg-glass-bg/30 backdrop-blur-sm overflow-hidden mb-8">
              <ImageStudioPanel />
            </div>

            {/* Image Assets Viewer */}
            <ImageAssetsViewer />
          </div>
        </div>
      </div>
    </StudioPageLayout>
  );
}
