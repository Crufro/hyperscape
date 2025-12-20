"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse rounded-md bg-white/10", className)} />
  );
}

interface AssetListSkeletonProps {
  count?: number;
}

export function AssetListSkeleton({ count = 6 }: AssetListSkeletonProps) {
  return (
    <div className="p-2 space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-2 rounded-lg bg-white/5"
        >
          {/* Thumbnail skeleton */}
          <Skeleton className="w-10 h-10 rounded-md flex-shrink-0" />

          {/* Content skeleton */}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>

          {/* Action skeleton */}
          <Skeleton className="w-6 h-6 rounded" />
        </div>
      ))}
    </div>
  );
}
