/**
 * Armor Fitting API Route
 * Performs hull-based or shrinkwrap armor fitting to avatar body
 * 
 * NOTE: Three.js imports are dynamic to avoid "document is not defined" 
 * errors during Next.js build (Three.js requires DOM APIs)
 */

import { NextRequest, NextResponse } from "next/server";
// Type-only imports don't cause runtime issues
import type { SkinnedMesh, Skeleton, Mesh, BufferGeometry } from "three";
import { logger } from "@/lib/utils";

const log = logger.child("API:armor-fit");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { avatarUrl, armorUrl, config = {} } = body;

    if (!avatarUrl || !armorUrl) {
      return NextResponse.json(
        { error: "Both avatarUrl and armorUrl required" },
        { status: 400 },
      );
    }

    // Dynamic imports to avoid "document is not defined" during build
    const THREE = await import("three");
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    const { getServiceFactory } = await import("@/lib/services");

    const loader = new GLTFLoader();
    const factory = getServiceFactory();
    const armorFittingService = factory.getArmorFittingService();
    const meshFittingService = factory.getMeshFittingService();

    log.info("Loading models", { avatarUrl, armorUrl });

    // Load both models
    const [avatarGltf, armorGltf] = await Promise.all([
      loader.loadAsync(avatarUrl),
      loader.loadAsync(armorUrl),
    ]);

    // Find skinned mesh in avatar
    let foundAvatarMesh: SkinnedMesh | null = null;
    let foundAvatarSkeleton: Skeleton | null = null;
    avatarGltf.scene.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh && !foundAvatarMesh) {
        foundAvatarMesh = child;
        foundAvatarSkeleton = child.skeleton;
      }
    });

    if (!foundAvatarMesh || !foundAvatarSkeleton) {
      return NextResponse.json(
        { error: "No skinned mesh found in avatar" },
        { status: 400 },
      );
    }

    // Re-assign to const for TypeScript narrowing
    const avatarMesh = foundAvatarMesh;
    const avatarSkeleton = foundAvatarSkeleton;

    // Find mesh in armor
    let foundArmorMesh: Mesh | null = null;
    armorGltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && !foundArmorMesh) {
        foundArmorMesh = child;
      }
    });

    if (!foundArmorMesh) {
      return NextResponse.json(
        { error: "No mesh found in armor model" },
        { status: 400 },
      );
    }

    // Re-assign to a const for TypeScript narrowing
    const armorMesh = foundArmorMesh;

    log.info("Starting fitting process");

    // Compute body regions
    const bodyRegions = armorFittingService.computeBodyRegions(
      avatarMesh,
      avatarSkeleton,
    );

    log.info("Found body regions", { count: bodyRegions.size });

    // Perform fitting config
    const fittingConfig = {
      method: (config.method as string) || "hull",
      margin: (config.margin as number) || 0.02,
      targetOffset: (config.targetOffset as number) || 0.02,
      iterations: (config.iterations as number) || 10,
      rigidity: (config.rigidity as number) || 0.7,
      smoothingPasses: (config.smoothingPasses as number) || 3,
    };

    // Get target body region
    const equipmentSlot = (config.equipmentSlot as string) || "Spine2";
    const targetRegion = bodyRegions.get(equipmentSlot);

    if (targetRegion) {
      // Fit armor to body region bounding box
      armorFittingService.fitArmorToBoundingBox(
        armorMesh,
        targetRegion,
        fittingConfig.margin,
      );
    }

    // Perform shrinkwrap fit using MeshFittingService
    // Note: fitArmorToBody modifies the armor mesh in place, returns void
    meshFittingService.fitArmorToBody(armorMesh, avatarMesh as Mesh, {
      iterations: fittingConfig.iterations,
      targetOffset: fittingConfig.targetOffset,
      rigidity: fittingConfig.rigidity,
      smoothingPasses: fittingConfig.smoothingPasses,
    });

    log.info("Fitting complete");

    // Get vertex count from the modified armor mesh
    // Use the geometry from the mesh we already have reference to
    const geom = (foundArmorMesh as Mesh)
      .geometry as BufferGeometry;
    const vertexCount = geom?.attributes?.position?.count || 0;

    return NextResponse.json({
      success: true,
      message: "Armor fitting completed",
      stats: {
        bodyRegions: bodyRegions.size,
        vertexCount,
        method: fittingConfig.method,
        iterations: fittingConfig.iterations,
      },
    });
  } catch (error) {
    log.error("Armor fitting failed", { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Armor fitting failed",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "Armor Fitting API",
    description:
      "Fit armor meshes to avatar bodies using hull-based or shrinkwrap methods",
    usage: {
      method: "POST",
      body: {
        avatarUrl: "URL to avatar GLB/VRM",
        armorUrl: "URL to armor GLB",
        config: {
          equipmentSlot: "Spine2 | Head | Pelvis",
          method: "hull | shrinkwrap | collision",
          margin: "Gap between armor and body (default: 0.02)",
          hullIterations: "Number of fitting iterations (default: 5)",
        },
      },
    },
  });
}
