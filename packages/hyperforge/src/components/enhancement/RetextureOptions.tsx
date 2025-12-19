"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { NeonInput } from "@/components/ui/neon-input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { useToast } from "@/components/ui/toast";
import { ProgressTracker } from "../generation/ProgressTracker";
import { Palette, CheckCircle, ExternalLink, Box } from "lucide-react";
import type { AssetData } from "@/types/asset";
import { logger } from "@/lib/utils";
import { cn } from "@/lib/utils";

const log = logger.child("RetextureOptions");

interface RetextureResult {
  assetId: string;
  name: string;
  modelUrl: string;
  thumbnailUrl?: string;
}

interface RetextureOptionsProps {
  asset: AssetData;
  onVariantCreated?: (variant: RetextureResult) => void;
}

export function RetextureOptions({
  asset,
  onVariantCreated,
}: RetextureOptionsProps) {
  const { toast } = useToast();
  const [textPrompt, setTextPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [styleType, setStyleType] = useState<"text" | "image">("text");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [variants, setVariants] = useState<RetextureResult[]>([]);
  const [result, setResult] = useState<RetextureResult | null>(null);

  // Load variants from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`variants-${asset.id}`);
    if (stored) {
      try {
        setVariants(JSON.parse(stored));
      } catch {
        // Ignore parse errors
      }
    }
  }, [asset.id]);

  // Save variant when created
  const saveVariant = useCallback(
    (variant: RetextureResult) => {
      setVariants((prev) => {
        const updated = [...prev, variant];
        localStorage.setItem(`variants-${asset.id}`, JSON.stringify(updated));
        return updated;
      });
    },
    [asset.id],
  );

  const handleRetexture = async () => {
    setIsProcessing(true);
    setProgress(0);
    setResult(null);

    // Start progress animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 95));
    }, 1000);

    try {
      // For CDN assets, include model URL directly since they're not in the database
      const isCDNAsset = asset.source === "CDN";

      const response = await fetch("/api/enhancement/retexture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: asset.id,
          styleType,
          textPrompt: styleType === "text" ? textPrompt : undefined,
          imageUrl: styleType === "image" ? imageUrl : undefined,
          // Include asset info for CDN assets that aren't in the database
          ...(isCDNAsset && {
            modelUrl: asset.modelUrl,
            assetName: asset.name,
            assetType: asset.type || "object",
            assetCategory: asset.category,
          }),
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Retexture failed");
      }

      const data = await response.json();
      setProgress(100);

      const newVariant: RetextureResult = {
        assetId: data.assetId,
        name: data.name,
        modelUrl: data.modelUrl,
        thumbnailUrl: data.thumbnailUrl,
      };

      setResult(newVariant);
      saveVariant(newVariant);
      onVariantCreated?.(newVariant);

      // Show success toast after state updates
      setTimeout(() => {
        toast({
          variant: "success",
          title: "Retexture Complete",
          description: `Created variant: ${data.name}`,
          duration: 5000,
        });
        setIsProcessing(false);
      }, 100);
    } catch (error) {
      clearInterval(progressInterval);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log.error(
        {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
        "Retexture error",
      );
      setIsProcessing(false);
      setProgress(0);

      // Show error toast after state updates
      setTimeout(() => {
        toast({
          variant: "destructive",
          title: "Retexture Failed",
          description: errorMessage || "Retexture operation failed",
          duration: 5000,
        });
      }, 100);
    }
  };

  const styleOptions = [
    { value: "text", label: "Text Prompt" },
    { value: "image", label: "Reference Image" },
  ];

  return (
    <div className="space-y-6 p-4">
      {/* Create New Variant Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold">Create Texture Variant</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Generate new textures for{" "}
          <span className="text-foreground font-medium">{asset.name}</span>{" "}
          while keeping the same 3D model.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Style Type</Label>
            <Select
              value={styleType}
              onChange={(value) => setStyleType(value as "text" | "image")}
              options={styleOptions}
            />
          </div>

          {styleType === "text" ? (
            <div className="space-y-2">
              <Label>Style Prompt</Label>
              <NeonInput
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                placeholder="e.g., 'Rustic wooden texture with metal accents'"
              />
              <p className="text-xs text-muted-foreground">
                Describe the texture style you want to apply
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Reference Image URL</Label>
              <NeonInput
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground">
                Provide an image URL to match its style
              </p>
            </div>
          )}

          {isProcessing && (
            <ProgressTracker
              progress={progress}
              currentStep="Retexturing model... This may take 1-2 minutes"
            />
          )}

          {result && !isProcessing && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-400">
                  Variant Created!
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {result.name}
                </p>
              </div>
              <a
                href={result.modelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded hover:bg-white/10 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </a>
            </div>
          )}

          <SpectacularButton
            onClick={handleRetexture}
            disabled={isProcessing || (!textPrompt && !imageUrl)}
            className="w-full"
          >
            {isProcessing ? "Processing..." : "Create Variant"}
          </SpectacularButton>
        </div>
      </div>

      {/* Existing Variants Section */}
      {variants.length > 0 && (
        <div className="border-t border-glass-border pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Texture Variants ({variants.length})
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {variants.map((variant) => (
              <a
                key={variant.assetId}
                href={variant.modelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "group relative rounded-lg overflow-hidden border border-glass-border",
                  "hover:border-purple-500/50 transition-colors cursor-pointer",
                  "bg-glass-bg/30",
                )}
              >
                {variant.thumbnailUrl ? (
                  <div className="aspect-square relative">
                    <Image
                      src={variant.thumbnailUrl}
                      alt={variant.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="aspect-square flex items-center justify-center bg-glass-bg">
                    <Box className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="p-2">
                  <p
                    className="text-xs font-medium truncate"
                    title={variant.name}
                  >
                    {variant.name}
                  </p>
                </div>
                <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/10 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Base Model Info */}
      <div className="border-t border-glass-border pt-4">
        <p className="text-xs text-muted-foreground">
          Base model: <span className="text-foreground">{asset.name}</span>
          {asset.source && (
            <span className="ml-2 px-1.5 py-0.5 rounded bg-glass-bg text-[10px] uppercase">
              {asset.source}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
