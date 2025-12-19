/**
 * Armor Export API Route
 * Exports fitted armor as GLB file
 */

import { NextRequest, NextResponse } from "next/server";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
// GLTFExporter used by ArmorFittingService internally
import { getServiceFactory } from "@/lib/services";
import { logger } from "@/lib/utils";

const log = logger.child("API:armor:export");

interface ExportRequest {
  avatarUrl: string;
  armorUrl: string;
  config?: {
    equipmentSlot?: string;
    method?: string;
    margin?: number;
    targetOffset?: number;
    iterations?: number;
    rigidity?: number;
    smoothingPasses?: number;
    includeTextures?: boolean;
    exportMethod?: "full" | "static" | "game" | "minimal";
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json();
    const { avatarUrl, armorUrl, config = {} } = body;

    if (!avatarUrl || !armorUrl) {
      return NextResponse.json(
        { error: "Both avatarUrl and armorUrl required" },
        { status: 400 },
      );
    }

    log.info({ avatarUrl, armorUrl }, "Starting armor export");

    const loader = new GLTFLoader();
    const factory = getServiceFactory();
    const armorFittingService = factory.getArmorFittingService();
    const meshFittingService = factory.getMeshFittingService();

    // Load both models
    const [avatarGltf, armorGltf] = await Promise.all([
      loader.loadAsync(avatarUrl),
      loader.loadAsync(armorUrl),
    ]);

    // Find skinned mesh in avatar
    let avatarMesh: THREE.SkinnedMesh | null = null;
    let avatarSkeleton: THREE.Skeleton | null = null;
    avatarGltf.scene.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh && !avatarMesh) {
        avatarMesh = child;
        avatarSkeleton = child.skeleton;
      }
    });

    if (!avatarMesh || !avatarSkeleton) {
      return NextResponse.json(
        { error: "No skinned mesh found in avatar" },
        { status: 400 },
      );
    }

    // Find mesh in armor
    let armorMesh: THREE.Mesh | null = null;
    armorGltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && !armorMesh) {
        armorMesh = child;
      }
    });

    if (!armorMesh) {
      return NextResponse.json(
        { error: "No mesh found in armor model" },
        { status: 400 },
      );
    }

    log.info("Models loaded, starting fitting");

    // Compute body regions
    const bodyRegions = armorFittingService.computeBodyRegions(
      avatarMesh,
      avatarSkeleton,
    );

    // Fitting config
    const fittingConfig = {
      method: config.method || "hull",
      margin: config.margin ?? 0.02,
      targetOffset: config.targetOffset ?? 0.02,
      iterations: config.iterations ?? 10,
      rigidity: config.rigidity ?? 0.7,
      smoothingPasses: config.smoothingPasses ?? 3,
    };

    // Get target body region
    const equipmentSlot = config.equipmentSlot || "Spine2";
    const targetRegion = bodyRegions.get(equipmentSlot);

    if (targetRegion) {
      armorFittingService.fitArmorToBoundingBox(
        armorMesh,
        targetRegion,
        fittingConfig.margin,
      );
    }

    // Perform shrinkwrap fit
    meshFittingService.fitArmorToBody(armorMesh, avatarMesh as THREE.Mesh, {
      iterations: fittingConfig.iterations,
      targetOffset: fittingConfig.targetOffset,
      rigidity: fittingConfig.rigidity,
      smoothingPasses: fittingConfig.smoothingPasses,
    });

    log.info("Fitting complete, binding to skeleton");

    // Bind armor to skeleton
    const skinnedArmor = armorFittingService.bindArmorToSkeleton(
      armorMesh,
      avatarMesh,
      {
        autoDetectMapping: true,
        boneNameMapping: {},
      },
    );

    if (!skinnedArmor) {
      return NextResponse.json(
        { error: "Failed to bind armor to skeleton" },
        { status: 500 },
      );
    }

    // Export based on method
    const exportMethod = config.exportMethod || "full";
    let glbData: ArrayBuffer;

    if (exportMethod === "game") {
      glbData = await armorFittingService.exportSkinnedArmorForGame(
        skinnedArmor,
        {},
      );
    } else if (exportMethod === "static") {
      glbData = await armorFittingService.exportArmorAsStaticMesh(skinnedArmor);
    } else {
      glbData = await armorFittingService.exportFittedArmor(skinnedArmor, {
        method: exportMethod === "skinned" ? "full" : exportMethod,
        includeTextures: config.includeTextures ?? true,
      });
    }

    log.info({ size: glbData.byteLength }, "Export complete");

    // Return GLB as binary
    return new NextResponse(glbData, {
      status: 200,
      headers: {
        "Content-Type": "model/gltf-binary",
        "Content-Disposition": `attachment; filename="fitted-armor.glb"`,
        "Content-Length": glbData.byteLength.toString(),
      },
    });
  } catch (error) {
    log.error({ error }, "Armor export failed");
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Export failed",
      },
      { status: 500 },
    );
  }
}
