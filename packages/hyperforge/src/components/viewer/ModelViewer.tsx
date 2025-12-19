"use client";

import { logger } from "@/lib/utils";
import { useGLTF, Center, Html } from "@react-three/drei";
import { Suspense, useMemo, useEffect, useState } from "react";
import * as THREE from "three";

const log = logger.child("ModelViewer");

interface ModelViewerProps {
  modelUrl?: string;
  onModelLoad?: (info: ModelInfo) => void;
}

export interface ModelInfo {
  vertices: number;
  triangles: number;
  /** @deprecated Use triangles instead */
  faces: number;
  materials: number;
  animations: number;
  hasRig: boolean;
  /** Mesh topology type - GLB/GLTF always uses triangles */
  meshType: "triangles" | "quads" | "mixed";
  /** Number of meshes in the model */
  meshCount: number;
  /** Estimated file complexity based on vertex/triangle count */
  complexity: "low" | "medium" | "high" | "very_high";
}

/**
 * Placeholder box shown when no model is loaded
 */
function PlaceholderBox() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#444" wireframe />
    </mesh>
  );
}

/**
 * Loading indicator while model is being fetched
 */
function LoadingIndicator() {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 text-white">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Loading model...</span>
      </div>
    </Html>
  );
}

/**
 * Error display when model fails to load
 */
function ErrorDisplay({ error }: { error: string }) {
  return (
    <Html center>
      <div className="bg-red-500/80 text-white px-4 py-2 rounded-md text-sm max-w-xs text-center">
        Failed to load model: {error}
      </div>
    </Html>
  );
}

/**
 * The actual model component that loads and displays GLB/GLTF
 */
function LoadedModel({
  modelUrl,
  onModelLoad,
}: {
  modelUrl: string;
  onModelLoad?: (info: ModelInfo) => void;
}) {
  const gltf = useGLTF(modelUrl);
  const [error, _setError] = useState<string | null>(null);

  // Calculate model info
  const modelInfo = useMemo(() => {
    let vertices = 0;
    let triangles = 0;
    let meshCount = 0;
    const materials = new Set<THREE.Material>();
    let hasRig = false;

    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshCount++;
        const geometry = child.geometry;
        if (geometry.attributes.position) {
          vertices += geometry.attributes.position.count;
        }
        // GLB/GLTF always uses triangles - count triangles from index or position
        if (geometry.index) {
          triangles += geometry.index.count / 3;
        } else if (geometry.attributes.position) {
          // Non-indexed geometry: every 3 vertices form a triangle
          triangles += geometry.attributes.position.count / 3;
        }
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => materials.add(m));
        } else if (child.material) {
          materials.add(child.material);
        }
      }
      if (child instanceof THREE.SkinnedMesh) {
        hasRig = true;
      }
    });

    // Determine complexity based on triangle count
    // Based on POLYCOUNT_PRESETS from meshy constants
    const triCount = Math.floor(triangles);
    let complexity: "low" | "medium" | "high" | "very_high" = "low";
    if (triCount > 30000) {
      complexity = "very_high";
    } else if (triCount > 10000) {
      complexity = "high";
    } else if (triCount > 2000) {
      complexity = "medium";
    }

    return {
      vertices,
      triangles: Math.floor(triangles),
      faces: Math.floor(triangles), // Deprecated alias
      materials: materials.size,
      animations: gltf.animations?.length || 0,
      hasRig,
      meshType: "triangles" as const, // GLB/GLTF always uses triangles
      meshCount,
      complexity,
    };
  }, [gltf, modelUrl]);

  // Notify parent of model info
  useEffect(() => {
    onModelLoad?.(modelInfo);
  }, [modelInfo, onModelLoad]);

  // Auto-scale and center the model
  const scaledScene = useMemo(() => {
    const scene = gltf.scene.clone();

    // Calculate bounding box
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Calculate scale to fit in unit cube
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 2 / maxDim : 1;

    scene.scale.setScalar(scale);

    // Center the model
    scene.position.sub(center.multiplyScalar(scale));

    return scene;
  }, [gltf]);

  // Cleanup cloned scene on unmount
  useEffect(() => {
    return () => {
      scaledScene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else if (child.material) {
            child.material.dispose();
          }
        }
      });
    };
  }, [scaledScene]);

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <Center>
      <primitive object={scaledScene} />
    </Center>
  );
}

/**
 * Check if a URL points to a valid 3D model file
 */
function isValidModelUrl(url: string): boolean {
  if (!url || url.trim() === "") return false;

  const lowerUrl = url.toLowerCase();

  // Must end with a valid 3D model extension
  const validExtensions = [".glb", ".gltf"];
  const hasValidExtension = validExtensions.some((ext) =>
    lowerUrl.endsWith(ext),
  );

  // Check for audio/video/image extensions that should NOT be loaded
  const invalidExtensions = [
    ".mp3",
    ".wav",
    ".ogg",
    ".mp4",
    ".webm",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
  ];
  const hasInvalidExtension = invalidExtensions.some((ext) =>
    lowerUrl.endsWith(ext),
  );

  if (hasInvalidExtension) {
    log.warn("Rejecting non-3D asset URL:", url);
    return false;
  }

  return hasValidExtension;
}

/**
 * Main ModelViewer component
 * Loads and displays GLB/GLTF models from URLs
 */
export function ModelViewer({ modelUrl, onModelLoad }: ModelViewerProps) {
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reset error when URL changes
  useEffect(() => {
    setLoadError(null);
  }, [modelUrl]);

  // Show placeholder if no URL or invalid URL (just base CDN URL with no path)
  if (!modelUrl || modelUrl.trim() === "") {
    return <PlaceholderBox />;
  }

  // Validate that the URL is a valid 3D model file
  if (!isValidModelUrl(modelUrl)) {
    log.warn("Invalid model URL (not a 3D model):", modelUrl);
    return <PlaceholderBox />;
  }

  // Check if URL is just a base URL without a file path (e.g., "http://localhost:8080/")
  try {
    const url = new URL(modelUrl);
    if (url.pathname === "/" || url.pathname === "") {
      log.warn("Invalid model URL (no path):", modelUrl);
      return <PlaceholderBox />;
    }
  } catch {
    // If URL parsing fails, let it try to load anyway
  }

  // Handle loading errors
  if (loadError) {
    return (
      <>
        <PlaceholderBox />
        <ErrorDisplay error={loadError} />
      </>
    );
  }

  return (
    <Suspense fallback={<LoadingIndicator />}>
      <LoadedModel modelUrl={modelUrl} onModelLoad={onModelLoad} />
    </Suspense>
  );
}

// Preload function for optimizing load times
ModelViewer.preload = (url: string) => {
  useGLTF.preload(url);
};
