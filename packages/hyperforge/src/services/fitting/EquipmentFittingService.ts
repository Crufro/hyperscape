/**
 * Equipment Fitting Service
 *
 * Delegates to ArmorFittingService for all fitting operations.
 * This provides a simpler interface for common equipment fitting tasks.
 */

import * as THREE from "three";
import type { SkinnedMesh, Skeleton, Mesh } from "three";

import { logger } from "@/lib/utils";
import {
  ArmorFittingService,
  FittingConfig as ArmorFittingConfig,
} from "./ArmorFittingService";
import { MeshFittingService } from "./MeshFittingService";

const log = logger.child("EquipmentFittingService");

export interface FittingConfig {
  method?:
    | "boundingBox"
    | "collision"
    | "smooth"
    | "iterative"
    | "hull"
    | "shrinkwrap";
  margin?: number;
  smoothingIterations?: number;
  preserveDetails?: boolean;
  targetOffset?: number;
  iterations?: number;
  rigidity?: number;
}

/**
 * Equipment Fitting Service
 * Wrapper around ArmorFittingService for convenient equipment fitting
 */
export class EquipmentFittingService {
  private armorService: ArmorFittingService;
  private meshService: MeshFittingService;

  constructor() {
    this.armorService = new ArmorFittingService();
    this.meshService = new MeshFittingService();
  }

  /**
   * Fit equipment to character
   */
  fitEquipmentToCharacter(
    equipmentMesh: THREE.Group | THREE.Scene,
    characterMesh: SkinnedMesh,
    skeleton: Skeleton,
    config: FittingConfig = {},
  ): SkinnedMesh | null {
    log.info("Fitting equipment to character");

    // Find the first mesh in the equipment group
    let foundMesh: Mesh | null = null;
    equipmentMesh.traverse((child) => {
      if (child instanceof THREE.Mesh && !foundMesh) {
        foundMesh = child;
      }
    });

    if (!foundMesh) {
      log.error("No mesh found in equipment");
      return null;
    }

    // Compute body regions from character
    const bodyRegions = this.armorService.computeBodyRegions(
      characterMesh,
      skeleton,
    );

    // Use Spine2 (torso) as default target region
    const targetRegion = bodyRegions.get("Spine2");

    if (targetRegion) {
      this.armorService.fitArmorToBoundingBox(
        foundMesh,
        targetRegion,
        config.margin ?? 0.02,
      );
    }

    // Perform shrinkwrap fitting
    const fittingConfig: ArmorFittingConfig = {
      method: config.method || "shrinkwrap",
      margin: config.margin ?? 0.02,
      smoothingIterations: config.smoothingIterations ?? 3,
      preserveDetails: config.preserveDetails ?? true,
      targetOffset: config.targetOffset ?? 0.02,
      iterations: config.iterations ?? 10,
    };

    // Use MeshFittingService for shrinkwrap
    this.meshService.fitArmorToBody(
      foundMesh,
      characterMesh as unknown as Mesh,
      {
        iterations: fittingConfig.iterations,
        targetOffset: fittingConfig.targetOffset,
        rigidity: config.rigidity ?? 0.7,
        smoothingPasses: fittingConfig.smoothingIterations,
      },
    );

    // Bind armor to skeleton (createSkinnedMesh is done via bindArmorToSkeleton)
    const skinnedMesh = this.armorService.bindArmorToSkeleton(
      foundMesh,
      characterMesh,
      {
        searchRadius: 0.05,
        applyGeometryTransform: true,
      },
    );

    if (skinnedMesh) {
      log.info("Equipment fitting complete");
    }

    return skinnedMesh;
  }

  /**
   * Equip armor to character (RuneScape-style)
   * Uses bindArmorToSkeleton for runtime attachment
   */
  equipArmorToCharacter(
    loadedArmor: THREE.Group | THREE.Scene,
    characterMesh: SkinnedMesh,
    options: {
      autoMatch?: boolean;
      boneNameMapping?: Record<string, string>;
      parentToCharacter?: boolean;
    } = {},
  ): SkinnedMesh | null {
    log.info("Equipping armor to character");

    // Find mesh in armor
    let armorMesh: Mesh | null = null;
    loadedArmor.traverse((child) => {
      if (child instanceof THREE.Mesh && !armorMesh) {
        armorMesh = child;
      }
    });

    if (!armorMesh) {
      log.error("No mesh found in armor");
      return null;
    }

    // Use the armor service to bind to skeleton
    const skinnedArmor = this.armorService.bindArmorToSkeleton(
      armorMesh,
      characterMesh,
      {
        searchRadius: 0.05,
        applyGeometryTransform: true,
      },
    );

    // Optionally parent to character
    if (options.parentToCharacter && skinnedArmor) {
      characterMesh.parent?.add(skinnedArmor);
    }

    return skinnedArmor;
  }

  /**
   * Export fitted equipment as GLB
   */
  async exportFittedEquipment(
    skinnedMesh: SkinnedMesh,
    options: {
      method?: "minimal" | "full" | "static";
    } = {},
  ): Promise<ArrayBuffer> {
    return this.armorService.exportFittedArmor(skinnedMesh, {
      method: options.method || "full",
    });
  }
}
