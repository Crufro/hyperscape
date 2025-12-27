/**
 * ZoneVisualsSystem
 *
 * Client-side system for zone visual indicators and warnings.
 * - Adds dark ground planes for PvP/wilderness zones
 * - Shows chat warnings when entering/leaving dangerous zones
 *
 * @see ZoneDetectionSystem for zone logic
 */

import THREE from "../../extras/three/three";
import { SystemBase } from "../shared";
import type { World } from "../../types";
import { ZoneDetectionSystem } from "../shared/death/ZoneDetectionSystem";
import { Chat } from "../shared/presentation/Chat";
import { ALL_WORLD_AREAS } from "../../data/world-areas";
import type { WorldArea } from "../../types/core/core";

// Zone visual colors
const ZONE_COLORS = {
  PVP: 0x331111, // Dark red tint for PvP zones
  WILDERNESS: 0x222222, // Dark grey for wilderness
  SAFE: 0x113311, // Dark green for safe zones (not rendered)
} as const;

/**
 * Zone visual mesh handle
 */
interface ZoneVisualHandle {
  mesh: THREE.Mesh;
  area: WorldArea;
}

export class ZoneVisualsSystem extends SystemBase {
  private zoneVisuals: Map<string, ZoneVisualHandle> = new Map();
  private lastZoneType: "safe" | "pvp" | "wilderness" | null = null;
  private lastZoneName: string | null = null;
  private checkInterval = 0.5; // Check position every 0.5 seconds
  private timeSinceLastCheck = 0;

  constructor(world: World) {
    super(world, {
      name: "zone-visuals",
      dependencies: {
        required: ["stage", "zone-detection"],
        optional: ["chat"],
      },
      autoCleanup: true,
    });
  }

  async init(): Promise<void> {
    // Create zone visual meshes for all PvP areas
    this.createZoneMeshes();
  }

  start(): void {
    // Initialize player zone state
    this.updatePlayerZoneState();
  }

  /**
   * Create visual ground meshes for dangerous zones
   */
  private createZoneMeshes(): void {
    for (const area of Object.values(ALL_WORLD_AREAS) as WorldArea[]) {
      // Only create visuals for non-safe zones
      if (area.safeZone) continue;

      // Create ground mesh for the zone
      const width = area.bounds.maxX - area.bounds.minX;
      const height = area.bounds.maxZ - area.bounds.minZ;
      const centerX = (area.bounds.minX + area.bounds.maxX) / 2;
      const centerZ = (area.bounds.minZ + area.bounds.maxZ) / 2;

      const geometry = new THREE.PlaneGeometry(width, height);
      const color = area.pvpEnabled ? ZONE_COLORS.PVP : ZONE_COLORS.WILDERNESS;

      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.95,
        metalness: 0,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2; // Lay flat
      mesh.position.set(centerX, 0.02, centerZ); // Slightly above ground
      mesh.receiveShadow = true;
      mesh.name = `zone-visual-${area.id}`;

      // Prevent click-to-move targeting this mesh
      mesh.userData.ignoreClickMove = true;
      mesh.userData.zoneId = area.id;
      mesh.userData.zoneName = area.name;

      // Add to scene
      this.world.stage?.scene.add(mesh);

      this.zoneVisuals.set(area.id, { mesh, area });
      this.logger.info(`Created zone visual for ${area.name}`);
    }
  }

  /**
   * Check player position and update zone warnings
   */
  update(dt: number): void {
    this.timeSinceLastCheck += dt;
    if (this.timeSinceLastCheck < this.checkInterval) return;
    this.timeSinceLastCheck = 0;

    this.updatePlayerZoneState();
  }

  /**
   * Update player's zone state and show warnings
   */
  private updatePlayerZoneState(): void {
    const player = this.world.entities?.player;
    if (!player) return;

    const position = player.position;
    if (!position) return;

    const zoneSystem =
      this.world.getSystem<ZoneDetectionSystem>("zone-detection");
    if (!zoneSystem) return;

    const zoneProps = zoneSystem.getZoneProperties({
      x: position.x,
      z: position.z,
    });

    // Determine current zone type
    let currentType: "safe" | "pvp" | "wilderness";
    if (zoneProps.isPvPEnabled) {
      currentType = "pvp";
    } else if (zoneProps.isSafe) {
      currentType = "safe";
    } else {
      currentType = "wilderness";
    }

    // Check for zone transition
    if (this.lastZoneType !== null && this.lastZoneType !== currentType) {
      this.showZoneTransitionWarning(
        this.lastZoneType,
        currentType,
        zoneProps.name,
      );
    }

    this.lastZoneType = currentType;
    this.lastZoneName = zoneProps.name;
  }

  /**
   * Show zone transition warning in chat
   */
  private showZoneTransitionWarning(
    from: "safe" | "pvp" | "wilderness",
    to: "safe" | "pvp" | "wilderness",
    zoneName: string,
  ): void {
    const chat = this.world.getSystem<Chat>("chat");
    if (!chat) return;

    let message = "";

    if (to === "pvp") {
      // Entering PvP zone - RED warning
      message = `[WARNING] Entering ${zoneName} - PvP enabled! Other players can attack you here.`;
    } else if (to === "wilderness") {
      // Entering wilderness - YELLOW warning
      message = `[CAUTION] Entering ${zoneName} - Dangerous area!`;
    } else if (from === "pvp" && to === "safe") {
      // Leaving PvP zone - GREEN message
      message = `[SAFE] You have left the PvP zone and entered a safe area.`;
    } else if (from === "wilderness" && to === "safe") {
      // Leaving wilderness - GREEN message
      message = `[SAFE] You have returned to a safe area.`;
    }

    if (message) {
      chat.add({
        id: `zone-warning-${Date.now()}`,
        from: "System",
        fromId: "system",
        body: message,
        text: message,
        timestamp: Date.now(),
        createdAt: new Date().toISOString(),
      });
    }
  }

  /**
   * Cleanup zone meshes
   */
  destroy(): void {
    for (const [, handle] of this.zoneVisuals) {
      handle.mesh.geometry.dispose();
      (handle.mesh.material as THREE.Material).dispose();
      this.world.stage?.scene.remove(handle.mesh);
    }
    this.zoneVisuals.clear();
  }
}
