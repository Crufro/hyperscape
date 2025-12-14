/**
 * Service Factory
 * Initializes and provides access to all specialized services
 */

import { VRMConverter } from "@/services/vrm/VRMConverter";
import { ArmorFittingService } from "@/services/fitting/ArmorFittingService";
import { WeaponFittingService } from "@/services/fitting/WeaponFittingService";
import { AssetNormalizationService } from "@/services/processing/AssetNormalizationService";
import { HandRiggingService } from "@/services/hand-rigging/HandRiggingService";
import { AnimationRetargeter } from "@/services/retargeting/AnimationRetargeter";
import { SpriteGenerationService } from "@/services/generation/SpriteGenerationService";

/**
 * Service Factory
 * Singleton pattern for service initialization
 */
export class ServiceFactory {
  private static instance: ServiceFactory;

  private vrmConverter: VRMConverter;
  private armorFittingService: ArmorFittingService;
  private weaponFittingService: WeaponFittingService;
  private normalizationService: AssetNormalizationService;
  private handRiggingService: HandRiggingService | null;
  private animationRetargeter: AnimationRetargeter;
  private spriteGenerationService: SpriteGenerationService;

  private constructor() {
    // Initialize services
    this.vrmConverter = new VRMConverter();
    this.armorFittingService = new ArmorFittingService();
    this.weaponFittingService = new WeaponFittingService();
    this.normalizationService = new AssetNormalizationService();

    // Hand rigging may not be available if dependencies are missing
    try {
      this.handRiggingService = new HandRiggingService();
    } catch {
      console.warn(
        "HandRiggingService not available - dependencies may be missing",
      );
      this.handRiggingService = null;
    }

    this.animationRetargeter = new AnimationRetargeter();
    this.spriteGenerationService = new SpriteGenerationService();
  }

  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  getVRMConverter(): VRMConverter {
    return this.vrmConverter;
  }

  getArmorFittingService(): ArmorFittingService {
    return this.armorFittingService;
  }

  getWeaponFittingService(): WeaponFittingService {
    return this.weaponFittingService;
  }

  getNormalizationService(): AssetNormalizationService {
    return this.normalizationService;
  }

  getHandRiggingService(): HandRiggingService | null {
    return this.handRiggingService;
  }

  getAnimationRetargeter(): AnimationRetargeter {
    return this.animationRetargeter;
  }

  getSpriteGenerationService(): SpriteGenerationService {
    return this.spriteGenerationService;
  }
}

/**
 * Convenience function to get service factory instance
 */
export function getServiceFactory(): ServiceFactory {
  return ServiceFactory.getInstance();
}
