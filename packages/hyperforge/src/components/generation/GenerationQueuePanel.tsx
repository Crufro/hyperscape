"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Layers,
  Loader2,
  X,
  CheckCircle2,
  Clock,
  Eye,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { useGenerationStore } from "@/stores/generation-store";
import { SpectacularButton } from "@/components/ui/spectacular-button";
import { Badge } from "@/components/ui/badge";

interface GenerationQueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GenerationQueuePanel({
  isOpen,
  onClose,
}: GenerationQueuePanelProps) {
  const {
    progress,
    currentGeneration,
    generatedAssets,
    batchQueue,
    removeBatchJob,
    removeGeneratedAsset,
    clearGeneratedAssets,
  } = useGenerationStore();

  const [showCompleted, setShowCompleted] = useState(true);
  const [showQueue, setShowQueue] = useState(true);

  // Count active jobs
  const activeJobs = batchQueue.filter((j) => j.status === "processing").length;
  const pendingJobs = batchQueue.filter((j) => j.status === "pending").length;
  const totalQueued = activeJobs + pendingJobs;

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="fixed inset-y-0 right-0 w-80 bg-glass-bg/95 backdrop-blur-xl border-l border-glass-border shadow-2xl z-50 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Generation Queue"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-glass-border">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold">Generation Queue</h2>
            {totalQueued > 0 && (
              <Badge
                variant="secondary"
                className="bg-cyan-500/20 text-cyan-300"
              >
                {totalQueued}
              </Badge>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-glass-bg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Active Generation */}
          {(progress.status === "generating" || currentGeneration) && (
            <div className="p-4 border-b border-glass-border">
              <div className="flex items-center gap-2 mb-3">
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                <span className="text-sm font-medium">
                  Currently Generating
                </span>
              </div>

              <div className="bg-glass-bg rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {currentGeneration?.prompt?.slice(0, 40)}...
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {progress.stage || "Processing"}
                  </Badge>
                </div>

                {/* Progress Bar */}
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{progress.currentStep || "Generating..."}</span>
                  <span>{progress.progress}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Pending Queue */}
          {batchQueue.length > 0 && (
            <div className="border-b border-glass-border">
              <button
                onClick={() => setShowQueue(!showQueue)}
                className="w-full flex items-center justify-between p-4 hover:bg-glass-bg/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium">
                    Pending ({pendingJobs})
                  </span>
                </div>
                {showQueue ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showQueue && (
                <div className="px-4 pb-4 space-y-2">
                  {batchQueue
                    .filter(
                      (j) =>
                        j.status === "pending" || j.status === "processing",
                    )
                    .map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center gap-3 p-2 bg-glass-bg rounded-lg group"
                      >
                        <div className="w-8 h-8 rounded bg-amber-500/20 flex items-center justify-center">
                          {job.status === "processing" ? (
                            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">
                            {job.baseConfig.prompt?.slice(0, 30) ||
                              job.category}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {job.variations} variation
                            {job.variations !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => removeBatchJob(job.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                          title="Remove from queue"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Completed Generations */}
          <div>
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full flex items-center justify-between p-4 hover:bg-glass-bg/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium">
                  Completed ({generatedAssets.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {generatedAssets.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearGeneratedAssets();
                    }}
                    className="text-xs text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    Clear
                  </button>
                )}
                {showCompleted ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {showCompleted && (
              <div className="px-4 pb-4 space-y-2">
                {generatedAssets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No completed generations yet</p>
                  </div>
                ) : (
                  generatedAssets.slice(0, 10).map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center gap-3 p-2 bg-glass-bg rounded-lg group hover:bg-glass-bg/80 transition-colors"
                    >
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded bg-zinc-800 overflow-hidden flex-shrink-0">
                        {asset.thumbnailUrl ? (
                          <Image
                            src={asset.thumbnailUrl}
                            alt={asset.id}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          {(asset.metadata.name as string) || asset.category}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(asset.createdAt).toLocaleTimeString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <Link
                          href={`/?asset=${asset.id}`}
                          className="p-1 hover:bg-cyan-500/20 rounded"
                          title="View asset"
                        >
                          <Eye className="w-3 h-3 text-cyan-400" />
                        </Link>
                        <button
                          onClick={() => removeGeneratedAsset(asset.id)}
                          className="p-1 hover:bg-red-500/20 rounded"
                          title="Remove"
                        >
                          <Trash2 className="w-3 h-3 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-glass-border">
          <Link href="/generate">
            <SpectacularButton className="w-full" variant="default">
              <Sparkles className="w-4 h-4 mr-2" />
              Generate New Asset
            </SpectacularButton>
          </Link>
        </div>
      </div>
    </>
  );
}
