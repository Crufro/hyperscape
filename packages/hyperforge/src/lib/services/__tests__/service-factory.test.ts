/**
 * Service Factory Tests
 *
 * Tests for the service factory singleton pattern and service initialization.
 * Verifies that all services are properly instantiated and accessible.
 *
 * Note: WebGLRenderer is mocked because it requires browser DOM APIs.
 * This is infrastructure mocking, not business logic mocking.
 */

import { describe, it, expect, beforeAll, vi } from "vitest";

// Mock WebGLRenderer before importing services that use it
const { MockWebGLRenderer } = vi.hoisted(() => {
  const mockToDataURL = vi
    .fn()
    .mockReturnValue("data:image/png;base64,mockImageData");
  const mockRender = vi.fn();
  const mockSetSize = vi.fn();
  const mockSetClearColor = vi.fn();
  const mockDispose = vi.fn();

  class MockWebGLRenderer {
    domElement = { toDataURL: mockToDataURL };
    shadowMap = { enabled: false, type: 2 };

    setSize(...args: number[]) {
      return mockSetSize(...args);
    }
    setClearColor(...args: (number | string)[]) {
      return mockSetClearColor(...args);
    }
    render(...args: unknown[]) {
      return mockRender(...args);
    }
    dispose() {
      return mockDispose();
    }
  }

  return { MockWebGLRenderer };
});

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return {
    ...actual,
    WebGLRenderer: MockWebGLRenderer,
  };
});

import * as THREE from "three";
import { ServiceFactory, getServiceFactory } from "../service-factory";

// Import service types for type checking
import { VRMConverter } from "@/services/vrm/VRMConverter";
import { ArmorFittingService } from "@/services/fitting/ArmorFittingService";
import { MeshFittingService } from "@/services/fitting/MeshFittingService";
import { WeaponFittingService } from "@/services/fitting/WeaponFittingService";
import { AssetNormalizationService } from "@/services/processing/AssetNormalizationService";
import { HandRiggingService } from "@/services/hand-rigging/HandRiggingService";
import { SpriteGenerationService } from "@/services/generation/SpriteGenerationService";

describe("ServiceFactory", () => {
  describe("singleton pattern", () => {
    it("getInstance returns same instance", () => {
      const instance1 = ServiceFactory.getInstance();
      const instance2 = ServiceFactory.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("getServiceFactory returns singleton", () => {
      const factory = getServiceFactory();
      expect(factory).toBe(ServiceFactory.getInstance());
    });

    it("multiple calls to getServiceFactory return same instance", () => {
      const factory1 = getServiceFactory();
      const factory2 = getServiceFactory();
      const factory3 = getServiceFactory();
      expect(factory1).toBe(factory2);
      expect(factory2).toBe(factory3);
    });

    it("factory instance is of ServiceFactory type", () => {
      const factory = getServiceFactory();
      expect(factory).toBeInstanceOf(ServiceFactory);
    });
  });

  describe("service getters", () => {
    let factory: ServiceFactory;

    beforeAll(() => {
      factory = getServiceFactory();
    });

    it("returns VRMConverter", () => {
      const converter = factory.getVRMConverter();
      expect(converter).toBeDefined();
      expect(converter).toBeInstanceOf(VRMConverter);
    });

    it("returns same VRMConverter instance on multiple calls", () => {
      const converter1 = factory.getVRMConverter();
      const converter2 = factory.getVRMConverter();
      expect(converter1).toBe(converter2);
    });

    it("returns ArmorFittingService", () => {
      const service = factory.getArmorFittingService();
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ArmorFittingService);
    });

    it("returns same ArmorFittingService instance on multiple calls", () => {
      const service1 = factory.getArmorFittingService();
      const service2 = factory.getArmorFittingService();
      expect(service1).toBe(service2);
    });

    it("returns MeshFittingService", () => {
      const service = factory.getMeshFittingService();
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(MeshFittingService);
    });

    it("returns same MeshFittingService instance on multiple calls", () => {
      const service1 = factory.getMeshFittingService();
      const service2 = factory.getMeshFittingService();
      expect(service1).toBe(service2);
    });

    it("returns WeaponFittingService", () => {
      const service = factory.getWeaponFittingService();
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(WeaponFittingService);
    });

    it("returns same WeaponFittingService instance on multiple calls", () => {
      const service1 = factory.getWeaponFittingService();
      const service2 = factory.getWeaponFittingService();
      expect(service1).toBe(service2);
    });

    it("returns NormalizationService", () => {
      const service = factory.getNormalizationService();
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(AssetNormalizationService);
    });

    it("returns same NormalizationService instance on multiple calls", () => {
      const service1 = factory.getNormalizationService();
      const service2 = factory.getNormalizationService();
      expect(service1).toBe(service2);
    });

    it("returns SpriteGenerationService", () => {
      const service = factory.getSpriteGenerationService();
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(SpriteGenerationService);
    });

    it("returns same SpriteGenerationService instance on multiple calls", () => {
      const service1 = factory.getSpriteGenerationService();
      const service2 = factory.getSpriteGenerationService();
      expect(service1).toBe(service2);
    });

    it("returns HandRiggingService or null if dependencies unavailable", () => {
      const service = factory.getHandRiggingService();
      // HandRiggingService may be null if dependencies are missing
      if (service !== null) {
        expect(service).toBeInstanceOf(HandRiggingService);
      } else {
        expect(service).toBeNull();
      }
    });

    it("returns same HandRiggingService instance on multiple calls", () => {
      const service1 = factory.getHandRiggingService();
      const service2 = factory.getHandRiggingService();
      expect(service1).toBe(service2);
    });
  });

  describe("createAnimationRetargeter (deprecated)", () => {
    let factory: ServiceFactory;

    beforeAll(() => {
      factory = getServiceFactory();
    });

    it("creates AnimationRetargeter with valid skeletons", async () => {
      // Create minimal Three.js skeleton structures for testing
      const sourceBones = [
        new THREE.Bone(),
        new THREE.Bone(),
        new THREE.Bone(),
      ];
      sourceBones[0].name = "root";
      sourceBones[1].name = "spine";
      sourceBones[2].name = "head";
      sourceBones[0].add(sourceBones[1]);
      sourceBones[1].add(sourceBones[2]);

      const targetBones = [
        new THREE.Bone(),
        new THREE.Bone(),
        new THREE.Bone(),
      ];
      targetBones[0].name = "root";
      targetBones[1].name = "spine";
      targetBones[2].name = "head";
      targetBones[0].add(targetBones[1]);
      targetBones[1].add(targetBones[2]);

      const sourceSkeleton = new THREE.Skeleton(sourceBones);
      const targetSkeleton = new THREE.Skeleton(targetBones);

      // Create a simple animation clip
      const times = [0, 1];
      const values = [0, 0, 0, 0, 0, 0];
      const track = new THREE.VectorKeyframeTrack(
        "root.position",
        times,
        values,
      );
      const clip = new THREE.AnimationClip("test", 1, [track]);

      const retargeter = await factory.createAnimationRetargeter(
        [clip],
        sourceSkeleton,
        targetSkeleton,
      );

      expect(retargeter).toBeDefined();
    });

    it("creates AnimationRetargeter with empty animation array", async () => {
      const sourceBones = [new THREE.Bone()];
      sourceBones[0].name = "root";
      const targetBones = [new THREE.Bone()];
      targetBones[0].name = "root";

      const sourceSkeleton = new THREE.Skeleton(sourceBones);
      const targetSkeleton = new THREE.Skeleton(targetBones);

      const retargeter = await factory.createAnimationRetargeter(
        [],
        sourceSkeleton,
        targetSkeleton,
      );

      expect(retargeter).toBeDefined();
    });
  });

  describe("service initialization", () => {
    it("all core services are initialized on factory creation", () => {
      const factory = getServiceFactory();

      // All core services should be available immediately
      expect(factory.getVRMConverter()).toBeDefined();
      expect(factory.getArmorFittingService()).toBeDefined();
      expect(factory.getMeshFittingService()).toBeDefined();
      expect(factory.getWeaponFittingService()).toBeDefined();
      expect(factory.getNormalizationService()).toBeDefined();
      expect(factory.getSpriteGenerationService()).toBeDefined();
      // HandRiggingService may be null but should be accessible
      const handService = factory.getHandRiggingService();
      expect(handService === null || handService !== undefined).toBe(true);
    });

    it("services are reused across factory instances", () => {
      const factory1 = ServiceFactory.getInstance();
      const factory2 = getServiceFactory();

      // Same factory instance means same service instances
      expect(factory1.getVRMConverter()).toBe(factory2.getVRMConverter());
      expect(factory1.getArmorFittingService()).toBe(
        factory2.getArmorFittingService(),
      );
      expect(factory1.getMeshFittingService()).toBe(
        factory2.getMeshFittingService(),
      );
    });
  });
});
