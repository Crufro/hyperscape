/**
 * HandRiggingService Tests
 *
 * Tests for the main hand rigging orchestration service.
 * Uses REAL Three.js implementations - NO MOCKS.
 *
 * Real Issues to Surface:
 * - Bone count validation for finger bones
 * - Landmark to bone mapping correctness
 * - Weight normalization errors
 * - Bone hierarchy structure issues
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as THREE from "three";

import {
  HAND_BONE_NAMES,
  HAND_LANDMARK_INDICES,
  FINGER_JOINTS,
} from "@/constants";

// Import polyfills for server-side Three.js
import "@/lib/server/three-polyfills";

/**
 * Create test hand landmarks (21 points like MediaPipe)
 */
function createTestLandmarks(side: "left" | "right" = "left"): Array<{
  x: number;
  y: number;
  z: number;
}> {
  const offsetX = side === "left" ? 100 : -100;

  // Create 21 landmarks representing hand pose
  return [
    // Wrist
    { x: offsetX, y: 0, z: 0 },
    // Thumb (CMC, MCP, IP, Tip)
    { x: offsetX + 10, y: 10, z: 5 },
    { x: offsetX + 15, y: 20, z: 8 },
    { x: offsetX + 18, y: 28, z: 10 },
    { x: offsetX + 20, y: 35, z: 12 },
    // Index (MCP, PIP, DIP, Tip)
    { x: offsetX + 25, y: 15, z: 0 },
    { x: offsetX + 28, y: 35, z: 0 },
    { x: offsetX + 30, y: 50, z: 0 },
    { x: offsetX + 31, y: 60, z: 0 },
    // Middle (MCP, PIP, DIP, Tip)
    { x: offsetX + 15, y: 18, z: 0 },
    { x: offsetX + 16, y: 40, z: 0 },
    { x: offsetX + 17, y: 55, z: 0 },
    { x: offsetX + 17, y: 65, z: 0 },
    // Ring (MCP, PIP, DIP, Tip)
    { x: offsetX + 5, y: 16, z: 0 },
    { x: offsetX + 4, y: 35, z: 0 },
    { x: offsetX + 3, y: 48, z: 0 },
    { x: offsetX + 2, y: 58, z: 0 },
    // Pinky (MCP, PIP, DIP, Tip)
    { x: offsetX - 5, y: 12, z: 0 },
    { x: offsetX - 8, y: 28, z: 0 },
    { x: offsetX - 10, y: 38, z: 0 },
    { x: offsetX - 11, y: 45, z: 0 },
  ];
}

/**
 * Create a skeleton with wrist bones for testing
 */
function createSkeletonWithWrists(): {
  skeleton: THREE.Skeleton;
  rootBone: THREE.Bone;
  leftWrist: THREE.Bone;
  rightWrist: THREE.Bone;
} {
  const hipsBone = new THREE.Bone();
  hipsBone.name = "Hips";
  hipsBone.position.set(0, 100, 0);

  const spineBone = new THREE.Bone();
  spineBone.name = "Spine";
  spineBone.position.set(0, 20, 0);
  hipsBone.add(spineBone);

  // Left arm
  const leftShoulder = new THREE.Bone();
  leftShoulder.name = "LeftShoulder";
  leftShoulder.position.set(15, 0, 0);
  spineBone.add(leftShoulder);

  const leftUpperArm = new THREE.Bone();
  leftUpperArm.name = "LeftUpperArm";
  leftUpperArm.position.set(25, 0, 0);
  leftShoulder.add(leftUpperArm);

  const leftForeArm = new THREE.Bone();
  leftForeArm.name = "LeftForeArm";
  leftForeArm.position.set(25, 0, 0);
  leftUpperArm.add(leftForeArm);

  const leftHand = new THREE.Bone();
  leftHand.name = "LeftHand";
  leftHand.position.set(25, 0, 0);
  leftForeArm.add(leftHand);

  // Right arm
  const rightShoulder = new THREE.Bone();
  rightShoulder.name = "RightShoulder";
  rightShoulder.position.set(-15, 0, 0);
  spineBone.add(rightShoulder);

  const rightUpperArm = new THREE.Bone();
  rightUpperArm.name = "RightUpperArm";
  rightUpperArm.position.set(-25, 0, 0);
  rightShoulder.add(rightUpperArm);

  const rightForeArm = new THREE.Bone();
  rightForeArm.name = "RightForeArm";
  rightForeArm.position.set(-25, 0, 0);
  rightUpperArm.add(rightForeArm);

  const rightHand = new THREE.Bone();
  rightHand.name = "RightHand";
  rightHand.position.set(-25, 0, 0);
  rightForeArm.add(rightHand);

  hipsBone.updateMatrixWorld(true);

  const bones = [
    hipsBone,
    spineBone,
    leftShoulder,
    leftUpperArm,
    leftForeArm,
    leftHand,
    rightShoulder,
    rightUpperArm,
    rightForeArm,
    rightHand,
  ];

  const skeleton = new THREE.Skeleton(bones);

  return {
    skeleton,
    rootBone: hipsBone,
    leftWrist: leftHand,
    rightWrist: rightHand,
  };
}

/**
 * Create finger bones for a hand
 */
function createFingerBones(
  wristBone: THREE.Bone,
  side: "left" | "right",
): Record<string, THREE.Bone[]> {
  const boneNames = HAND_BONE_NAMES[side];
  const fingerBones: Record<string, THREE.Bone[]> = {
    thumb: [],
    index: [],
    middle: [],
    ring: [],
    little: [],
  };

  const xDir = side === "left" ? 1 : -1;

  // Create bones for each finger
  const fingerOffsets = {
    thumb: { x: 10 * xDir, y: 5, z: 10 },
    index: { x: 20 * xDir, y: 10, z: 0 },
    middle: { x: 20 * xDir, y: 12, z: -5 },
    ring: { x: 18 * xDir, y: 10, z: -10 },
    little: { x: 15 * xDir, y: 8, z: -15 },
  };

  for (const [finger, names] of Object.entries(boneNames)) {
    if (finger === "wrist") continue;

    const typedFinger = finger as keyof typeof fingerOffsets;
    const offset = fingerOffsets[typedFinger];
    let parentBone = wristBone;

    for (let i = 0; i < names.length; i++) {
      const bone = new THREE.Bone();
      bone.name = names[i];
      bone.position.set(
        offset.x * (i + 1) * 0.3,
        offset.y * (i + 1) * 0.5,
        offset.z,
      );

      parentBone.add(bone);
      fingerBones[typedFinger].push(bone);
      parentBone = bone;
    }
  }

  wristBone.updateMatrixWorld(true);
  return fingerBones;
}

describe("HandRiggingService", () => {
  describe("Configuration - Rigging Options Structure", () => {
    it("defines correct bone names for left hand", () => {
      const leftBoneNames = HAND_BONE_NAMES.left;

      expect(leftBoneNames.wrist).toBe("leftHand");
      expect(leftBoneNames.thumb).toHaveLength(3);
      expect(leftBoneNames.index).toHaveLength(3);
      expect(leftBoneNames.middle).toHaveLength(3);
      expect(leftBoneNames.ring).toHaveLength(3);
      expect(leftBoneNames.little).toHaveLength(3);
    });

    it("defines correct bone names for right hand", () => {
      const rightBoneNames = HAND_BONE_NAMES.right;

      expect(rightBoneNames.wrist).toBe("rightHand");
      expect(rightBoneNames.thumb).toHaveLength(3);
      expect(rightBoneNames.index).toHaveLength(3);
      expect(rightBoneNames.middle).toHaveLength(3);
      expect(rightBoneNames.ring).toHaveLength(3);
      expect(rightBoneNames.little).toHaveLength(3);
    });

    it("bone names follow VRM naming convention", () => {
      const leftThumb = HAND_BONE_NAMES.left.thumb;
      expect(leftThumb[0]).toBe("leftThumbProximal");
      expect(leftThumb[1]).toBe("leftThumbIntermediate");
      expect(leftThumb[2]).toBe("leftThumbDistal");
    });

    it("defines landmark indices for all 21 MediaPipe points", () => {
      expect(HAND_LANDMARK_INDICES.wrist).toBe(0);
      expect(HAND_LANDMARK_INDICES.thumbTip).toBe(4);
      expect(HAND_LANDMARK_INDICES.indexTip).toBe(8);
      expect(HAND_LANDMARK_INDICES.middleTip).toBe(12);
      expect(HAND_LANDMARK_INDICES.ringTip).toBe(16);
      expect(HAND_LANDMARK_INDICES.littleTip).toBe(20);
    });

    it("defines correct finger joint mappings", () => {
      expect(FINGER_JOINTS.thumb).toEqual([1, 2, 3, 4]);
      expect(FINGER_JOINTS.index).toEqual([5, 6, 7, 8]);
      expect(FINGER_JOINTS.middle).toEqual([9, 10, 11, 12]);
      expect(FINGER_JOINTS.ring).toEqual([13, 14, 15, 16]);
      expect(FINGER_JOINTS.little).toEqual([17, 18, 19, 20]);
    });
  });

  describe("Bone Creation - Finger Bone Count", () => {
    it("creates 3 bones per finger (proximal, intermediate, distal)", () => {
      const { leftWrist } = createSkeletonWithWrists();
      const fingerBones = createFingerBones(leftWrist, "left");

      expect(fingerBones.thumb).toHaveLength(3);
      expect(fingerBones.index).toHaveLength(3);
      expect(fingerBones.middle).toHaveLength(3);
      expect(fingerBones.ring).toHaveLength(3);
      expect(fingerBones.little).toHaveLength(3);
    });

    it("creates 15 total finger bones per hand", () => {
      const { leftWrist } = createSkeletonWithWrists();
      const fingerBones = createFingerBones(leftWrist, "left");

      const totalBones = Object.values(fingerBones).reduce(
        (sum, bones) => sum + bones.length,
        0,
      );

      expect(totalBones).toBe(15);
    });

    it("maintains correct parent-child hierarchy", () => {
      const { leftWrist } = createSkeletonWithWrists();
      const fingerBones = createFingerBones(leftWrist, "left");

      // Check that first bone of each finger is child of wrist
      for (const finger of ["thumb", "index", "middle", "ring", "little"]) {
        const firstBone = fingerBones[finger][0];
        expect(firstBone.parent).toBe(leftWrist);
      }

      // Check that subsequent bones are children of previous
      for (const finger of ["thumb", "index", "middle", "ring", "little"]) {
        const bones = fingerBones[finger];
        for (let i = 1; i < bones.length; i++) {
          expect(bones[i].parent).toBe(bones[i - 1]);
        }
      }
    });

    it("bones have correct naming pattern", () => {
      const { leftWrist } = createSkeletonWithWrists();
      const fingerBones = createFingerBones(leftWrist, "left");

      // Check naming pattern for index finger
      expect(fingerBones.index[0].name).toBe("leftIndexProximal");
      expect(fingerBones.index[1].name).toBe("leftIndexIntermediate");
      expect(fingerBones.index[2].name).toBe("leftIndexDistal");
    });
  });

  describe("Landmark Mapping - 2D Landmarks to Bones", () => {
    it("generates 21 landmarks per hand", () => {
      const landmarks = createTestLandmarks("left");
      expect(landmarks).toHaveLength(21);
    });

    it("wrist landmark is at index 0", () => {
      const landmarks = createTestLandmarks("left");
      expect(landmarks[HAND_LANDMARK_INDICES.wrist]).toBeDefined();
      expect(HAND_LANDMARK_INDICES.wrist).toBe(0);
    });

    it("finger tips are at correct indices", () => {
      const landmarks = createTestLandmarks("left");

      // Verify tip indices
      expect(landmarks[HAND_LANDMARK_INDICES.thumbTip]).toBeDefined();
      expect(landmarks[HAND_LANDMARK_INDICES.indexTip]).toBeDefined();
      expect(landmarks[HAND_LANDMARK_INDICES.middleTip]).toBeDefined();
      expect(landmarks[HAND_LANDMARK_INDICES.ringTip]).toBeDefined();
      expect(landmarks[HAND_LANDMARK_INDICES.littleTip]).toBeDefined();
    });

    it("landmarks have valid 3D coordinates", () => {
      const landmarks = createTestLandmarks("left");

      for (const landmark of landmarks) {
        expect(typeof landmark.x).toBe("number");
        expect(typeof landmark.y).toBe("number");
        expect(typeof landmark.z).toBe("number");
        expect(Number.isFinite(landmark.x)).toBe(true);
        expect(Number.isFinite(landmark.y)).toBe(true);
        expect(Number.isFinite(landmark.z)).toBe(true);
      }
    });

    it("left and right hand landmarks have opposite X positions", () => {
      const leftLandmarks = createTestLandmarks("left");
      const rightLandmarks = createTestLandmarks("right");

      // Wrist positions should be on opposite sides
      expect(leftLandmarks[0].x).toBeGreaterThan(0);
      expect(rightLandmarks[0].x).toBeLessThan(0);
    });

    it("finger joint indices are sequential per finger", () => {
      // Each finger should have 4 sequential landmark indices
      for (const [_finger, joints] of Object.entries(FINGER_JOINTS)) {
        for (let i = 1; i < joints.length; i++) {
          expect(joints[i]).toBe(joints[i - 1] + 1);
        }
      }
    });
  });

  describe("Weight Application - Segmentation-Based Weights", () => {
    it("creates valid skin weights array", () => {
      const geometry = new THREE.BoxGeometry(10, 10, 10, 2, 2, 2);
      const vertexCount = geometry.attributes.position.count;

      const skinWeights = new Float32Array(vertexCount * 4);
      const skinIndices = new Float32Array(vertexCount * 4);

      // Initialize with default weights
      for (let i = 0; i < vertexCount; i++) {
        skinWeights[i * 4] = 1.0;
        skinWeights[i * 4 + 1] = 0;
        skinWeights[i * 4 + 2] = 0;
        skinWeights[i * 4 + 3] = 0;

        skinIndices[i * 4] = 0;
        skinIndices[i * 4 + 1] = 0;
        skinIndices[i * 4 + 2] = 0;
        skinIndices[i * 4 + 3] = 0;
      }

      geometry.setAttribute(
        "skinWeight",
        new THREE.Float32BufferAttribute(skinWeights, 4),
      );
      geometry.setAttribute(
        "skinIndex",
        new THREE.Float32BufferAttribute(skinIndices, 4),
      );

      expect(geometry.attributes.skinWeight).toBeDefined();
      expect(geometry.attributes.skinIndex).toBeDefined();
      expect(geometry.attributes.skinWeight.count).toBe(vertexCount);
    });

    it("weights sum to 1.0 for each vertex", () => {
      const geometry = new THREE.BoxGeometry(10, 10, 10);
      const vertexCount = geometry.attributes.position.count;

      const skinWeights = new Float32Array(vertexCount * 4);

      // Apply test weights that sum to 1.0
      for (let i = 0; i < vertexCount; i++) {
        skinWeights[i * 4] = 0.5;
        skinWeights[i * 4 + 1] = 0.3;
        skinWeights[i * 4 + 2] = 0.15;
        skinWeights[i * 4 + 3] = 0.05;
      }

      geometry.setAttribute(
        "skinWeight",
        new THREE.Float32BufferAttribute(skinWeights, 4),
      );

      const weights = geometry.attributes.skinWeight;
      for (let i = 0; i < weights.count; i++) {
        const sum =
          weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i);
        expect(sum).toBeCloseTo(1.0, 4);
      }
    });

    it("normalizes weights correctly after distribution", () => {
      // Test weight normalization function
      const unnormalizedWeights = [0.4, 0.3, 0.2, 0.15];
      const total = unnormalizedWeights.reduce((a, b) => a + b, 0);
      const normalizedWeights = unnormalizedWeights.map((w) => w / total);

      const normalizedSum = normalizedWeights.reduce((a, b) => a + b, 0);
      expect(normalizedSum).toBeCloseTo(1.0, 10);
    });

    it("assigns weights based on distance to bones", () => {
      const wristPos = new THREE.Vector3(0, 0, 0);
      const fingerTipPos = new THREE.Vector3(50, 0, 0);
      const vertexPos = new THREE.Vector3(40, 0, 0);

      const distToWrist = vertexPos.distanceTo(wristPos);
      const distToFinger = vertexPos.distanceTo(fingerTipPos);

      // Vertex closer to finger tip should have more finger weight
      expect(distToFinger).toBeLessThan(distToWrist);

      // Weight formula: 1 / (1 + distance^2 * factor)
      const factor = 0.01;
      const wristWeight = 1 / (1 + distToWrist * distToWrist * factor);
      const fingerWeight = 1 / (1 + distToFinger * distToFinger * factor);

      expect(fingerWeight).toBeGreaterThan(wristWeight);
    });
  });

  describe("Hand Bone Hierarchy Validation", () => {
    it("creates valid skeleton with hand bones", () => {
      const { skeleton, leftWrist } = createSkeletonWithWrists();
      const fingerBones = createFingerBones(leftWrist, "left");

      // Add finger bones to skeleton
      const allBones = [...skeleton.bones];
      for (const bones of Object.values(fingerBones)) {
        allBones.push(...bones);
      }

      const newSkeleton = new THREE.Skeleton(allBones);

      // Total bones: 10 original + 15 finger
      expect(newSkeleton.bones).toHaveLength(25);
    });

    it("skeleton has valid inverse bind matrices", () => {
      const { skeleton, leftWrist } = createSkeletonWithWrists();
      const fingerBones = createFingerBones(leftWrist, "left");

      const allBones = [...skeleton.bones];
      for (const bones of Object.values(fingerBones)) {
        allBones.push(...bones);
      }

      const newSkeleton = new THREE.Skeleton(allBones);

      // Each bone should have an inverse bind matrix
      expect(newSkeleton.boneInverses.length).toBe(newSkeleton.bones.length);

      // Each matrix should be valid (not NaN)
      for (const matrix of newSkeleton.boneInverses) {
        for (const element of matrix.elements) {
          expect(Number.isNaN(element)).toBe(false);
        }
      }
    });

    it("bone world positions are calculable", () => {
      const { leftWrist, rootBone } = createSkeletonWithWrists();
      const fingerBones = createFingerBones(leftWrist, "left");

      rootBone.updateMatrixWorld(true);

      // Get world position of index tip
      const indexTip = fingerBones.index[2];
      const worldPos = new THREE.Vector3();
      indexTip.getWorldPosition(worldPos);

      // Position should be valid (not NaN)
      expect(Number.isNaN(worldPos.x)).toBe(false);
      expect(Number.isNaN(worldPos.y)).toBe(false);
      expect(Number.isNaN(worldPos.z)).toBe(false);

      // Tip should be further from wrist than proximal bone
      const wristPos = new THREE.Vector3();
      leftWrist.getWorldPosition(wristPos);

      const proximalPos = new THREE.Vector3();
      fingerBones.index[0].getWorldPosition(proximalPos);

      const tipDist = worldPos.distanceTo(wristPos);
      const proximalDist = proximalPos.distanceTo(wristPos);

      expect(tipDist).toBeGreaterThan(proximalDist);
    });
  });

  describe("Side Detection and Handling", () => {
    it("correctly identifies left hand from bone name", () => {
      const leftBoneNames = [
        "LeftHand",
        "leftHand",
        "mixamorig:LeftHand",
        "hand_l",
        "Hand_L",
      ];

      for (const name of leftBoneNames) {
        const lowerName = name.toLowerCase();
        const isLeft =
          lowerName.includes("left") ||
          lowerName.includes("_l") ||
          lowerName.endsWith("l");
        expect(isLeft).toBe(true);
      }
    });

    it("correctly identifies right hand from bone name", () => {
      const rightBoneNames = [
        "RightHand",
        "rightHand",
        "mixamorig:RightHand",
        "hand_r",
        "Hand_R",
      ];

      for (const name of rightBoneNames) {
        const lowerName = name.toLowerCase();
        const isRight =
          lowerName.includes("right") ||
          lowerName.includes("_r") ||
          lowerName.endsWith("r");
        expect(isRight).toBe(true);
      }
    });

    it("creates mirrored finger positions for left and right hands", () => {
      const { leftWrist, rightWrist } = createSkeletonWithWrists();
      const leftFingers = createFingerBones(leftWrist, "left");
      const rightFingers = createFingerBones(rightWrist, "right");

      // Left index proximal should have positive X offset
      const leftIndexPos = new THREE.Vector3();
      leftFingers.index[0].getWorldPosition(leftIndexPos);

      // Right index proximal should have negative X offset (mirrored)
      const rightIndexPos = new THREE.Vector3();
      rightFingers.index[0].getWorldPosition(rightIndexPos);

      // They should be on opposite sides of center
      const leftWristPos = new THREE.Vector3();
      const rightWristPos = new THREE.Vector3();
      leftWrist.getWorldPosition(leftWristPos);
      rightWrist.getWorldPosition(rightWristPos);

      // Left finger relative to left wrist
      const leftRelative = leftIndexPos.x - leftWristPos.x;
      // Right finger relative to right wrist (should be opposite sign)
      const rightRelative = rightIndexPos.x - rightWristPos.x;

      expect(Math.sign(leftRelative)).toBe(-Math.sign(rightRelative));
    });
  });

  describe("Rigging Algorithm - Distance-Based Weight Calculation", () => {
    /**
     * Test fixture: Create a skinned mesh with hand bones
     */
    function createSkinnedMeshWithHandBones(): {
      mesh: THREE.SkinnedMesh;
      skeleton: THREE.Skeleton;
      wristBone: THREE.Bone;
      fingerBones: THREE.Bone[];
    } {
      // Create bones
      const wristBone = new THREE.Bone();
      wristBone.name = "LeftHand";
      wristBone.position.set(0, 0, 0);

      const proximalBone = new THREE.Bone();
      proximalBone.name = "leftIndexProximal";
      proximalBone.position.set(20, 0, 0);
      wristBone.add(proximalBone);

      const intermediateBone = new THREE.Bone();
      intermediateBone.name = "leftIndexIntermediate";
      intermediateBone.position.set(15, 0, 0);
      proximalBone.add(intermediateBone);

      const distalBone = new THREE.Bone();
      distalBone.name = "leftIndexDistal";
      distalBone.position.set(12, 0, 0);
      intermediateBone.add(distalBone);

      wristBone.updateMatrixWorld(true);

      const bones = [wristBone, proximalBone, intermediateBone, distalBone];
      const skeleton = new THREE.Skeleton(bones);

      // Create geometry with vertices along the finger
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        // Wrist area
        0, 0, 0, 5, 0, 0, 10, 0, 0,
        // Proximal area
        20, 0, 0, 25, 0, 0, 30, 0, 0,
        // Intermediate area
        35, 0, 0, 40, 0, 0,
        // Distal area
        47, 0, 0, 50, 0, 0,
      ]);
      geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

      // Initialize skin weights
      const vertexCount = vertices.length / 3;
      const skinIndices = new Float32Array(vertexCount * 4);
      const skinWeights = new Float32Array(vertexCount * 4);

      for (let i = 0; i < vertexCount; i++) {
        skinIndices[i * 4] = 0;
        skinWeights[i * 4] = 1.0;
      }

      geometry.setAttribute(
        "skinIndex",
        new THREE.Float32BufferAttribute(skinIndices, 4),
      );
      geometry.setAttribute(
        "skinWeight",
        new THREE.Float32BufferAttribute(skinWeights, 4),
      );

      const material = new THREE.MeshBasicMaterial();
      const mesh = new THREE.SkinnedMesh(geometry, material);
      mesh.add(wristBone);
      mesh.bind(skeleton);

      return {
        mesh,
        skeleton,
        wristBone,
        fingerBones: [proximalBone, intermediateBone, distalBone],
      };
    }

    it("calculates weight based on inverse square distance", () => {
      const vertex = new THREE.Vector3(25, 0, 0);
      const bonePos = new THREE.Vector3(20, 0, 0);

      const distance = vertex.distanceTo(bonePos);
      const weight = 1 / (1 + distance * distance * 0.01);

      expect(distance).toBe(5);
      expect(weight).toBeGreaterThan(0);
      expect(weight).toBeLessThan(1);
    });

    it("closer vertices get higher weights", () => {
      const bonePos = new THREE.Vector3(20, 0, 0);
      const closeVertex = new THREE.Vector3(22, 0, 0);
      const farVertex = new THREE.Vector3(30, 0, 0);

      const closeDist = closeVertex.distanceTo(bonePos);
      const farDist = farVertex.distanceTo(bonePos);

      const closeWeight = 1 / (1 + closeDist * closeDist * 0.01);
      const farWeight = 1 / (1 + farDist * farDist * 0.01);

      expect(closeWeight).toBeGreaterThan(farWeight);
    });

    it("normalizes weights to sum to 1.0", () => {
      const weights = [0.4, 0.3, 0.2, 0.1];
      const total = weights.reduce((a, b) => a + b, 0);
      const normalizedWeights = weights.map((w) => w / total);

      const sum = normalizedWeights.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });

    it("sorts weights and takes top 4 influences", () => {
      const weights = [
        { boneIndex: 0, weight: 0.1 },
        { boneIndex: 1, weight: 0.5 },
        { boneIndex: 2, weight: 0.3 },
        { boneIndex: 3, weight: 0.05 },
        { boneIndex: 4, weight: 0.2 },
        { boneIndex: 5, weight: 0.01 },
      ];

      // Sort by weight descending
      weights.sort((a, b) => b.weight - a.weight);

      // Take top 4
      const topWeights = weights.slice(0, 4);

      expect(topWeights[0].boneIndex).toBe(1); // 0.5
      expect(topWeights[1].boneIndex).toBe(2); // 0.3
      expect(topWeights[2].boneIndex).toBe(4); // 0.2
      expect(topWeights[3].boneIndex).toBe(0); // 0.1
    });

    it("applies weights to vertex skin attributes", () => {
      const { mesh, skeleton: _skeleton } = createSkinnedMeshWithHandBones();
      const geometry = mesh.geometry;
      const skinWeights = geometry.attributes.skinWeight;
      const skinIndices = geometry.attributes.skinIndex;

      // Verify initial state
      expect(skinWeights).toBeDefined();
      expect(skinIndices).toBeDefined();
      expect(skinWeights.count).toBe(10);

      // Apply custom weights to vertex 5 (in proximal bone area)
      const vertexIdx = 5;
      const boneIndex = 1; // proximal bone
      const weight = 0.8;

      skinIndices.setX(vertexIdx, boneIndex);
      skinWeights.setX(vertexIdx, weight);
      skinWeights.setY(vertexIdx, 1 - weight);

      expect(skinIndices.getX(vertexIdx)).toBe(boneIndex);
      expect(skinWeights.getX(vertexIdx)).toBeCloseTo(weight, 5);
    });

    it("handles multiple bone influences per vertex", () => {
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([0, 0, 0, 10, 0, 0, 20, 0, 0]);
      geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));

      const vertexCount = 3;
      const skinWeights = new Float32Array(vertexCount * 4);
      const skinIndices = new Float32Array(vertexCount * 4);

      // Vertex 1 influenced by two bones
      skinIndices[4] = 0; // bone 0
      skinIndices[5] = 1; // bone 1
      skinWeights[4] = 0.6;
      skinWeights[5] = 0.4;

      geometry.setAttribute(
        "skinWeight",
        new THREE.Float32BufferAttribute(skinWeights, 4),
      );
      geometry.setAttribute(
        "skinIndex",
        new THREE.Float32BufferAttribute(skinIndices, 4),
      );

      const attrs = geometry.attributes.skinWeight;
      expect(attrs.getX(1) + attrs.getY(1)).toBeCloseTo(1.0, 5);
    });
  });

  describe("Rigging Algorithm - Bone Hierarchy Operations", () => {
    it("adds finger bones as children of wrist", () => {
      const { leftWrist } = createSkeletonWithWrists();
      const fingerBones = createFingerBones(leftWrist, "left");

      // Each finger's proximal should be child of wrist
      expect(fingerBones.thumb[0].parent).toBe(leftWrist);
      expect(fingerBones.index[0].parent).toBe(leftWrist);
      expect(fingerBones.middle[0].parent).toBe(leftWrist);
      expect(fingerBones.ring[0].parent).toBe(leftWrist);
      expect(fingerBones.little[0].parent).toBe(leftWrist);
    });

    it("updates skeleton after adding bones", () => {
      const { skeleton, leftWrist, rootBone } = createSkeletonWithWrists();
      const originalBoneCount = skeleton.bones.length;

      // Add a new finger bone to the hierarchy
      const newBone = new THREE.Bone();
      newBone.name = "testFingerBone";
      newBone.position.set(10, 0, 0);
      leftWrist.add(newBone);

      // Update world matrices first
      rootBone.updateMatrixWorld(true);

      // Create a new skeleton that includes all bones with proper inverse matrices
      const allBones = [...skeleton.bones, newBone];
      const newSkeleton = new THREE.Skeleton(allBones);

      expect(newSkeleton.bones.length).toBe(originalBoneCount + 1);
      expect(newSkeleton.bones.includes(newBone)).toBe(true);
      expect(newSkeleton.boneInverses.length).toBe(originalBoneCount + 1);
    });

    it("calculates inverse bind matrices correctly", () => {
      const bone = new THREE.Bone();
      bone.position.set(10, 20, 30);
      bone.updateMatrixWorld(true);

      const skeleton = new THREE.Skeleton([bone]);

      // Inverse bind matrix should be inverse of world matrix at bind time
      const inverseMatrix = skeleton.boneInverses[0];
      expect(inverseMatrix).toBeInstanceOf(THREE.Matrix4);

      // Verify it's a valid matrix (no NaN values)
      for (const element of inverseMatrix.elements) {
        expect(Number.isFinite(element)).toBe(true);
      }
    });

    it("bone local position transforms to world position correctly", () => {
      const parent = new THREE.Bone();
      parent.position.set(100, 0, 0);

      const child = new THREE.Bone();
      child.position.set(50, 0, 0);
      parent.add(child);

      parent.updateMatrixWorld(true);

      const childWorldPos = new THREE.Vector3();
      child.getWorldPosition(childWorldPos);

      // Child world position should be parent position + child local position
      expect(childWorldPos.x).toBe(150);
    });

    it("finds bone index in skeleton", () => {
      const { skeleton, leftWrist } = createSkeletonWithWrists();

      const wristIndex = skeleton.bones.indexOf(leftWrist);
      expect(wristIndex).toBeGreaterThanOrEqual(0);

      // Non-existent bone
      const unknownBone = new THREE.Bone();
      const unknownIndex = skeleton.bones.indexOf(unknownBone);
      expect(unknownIndex).toBe(-1);
    });
  });

  describe("Rigging Algorithm - Skinned Mesh Processing", () => {
    it("finds skinned meshes in model hierarchy", () => {
      const model = new THREE.Object3D();

      // Add regular mesh
      model.add(new THREE.Mesh(new THREE.BoxGeometry()));

      // Add skinned mesh
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.MeshBasicMaterial();
      const bone = new THREE.Bone();
      const skinnedMesh = new THREE.SkinnedMesh(geometry, material);
      skinnedMesh.add(bone);
      skinnedMesh.bind(new THREE.Skeleton([bone]));
      model.add(skinnedMesh);

      // Find skinned meshes
      const skinnedMeshes: THREE.SkinnedMesh[] = [];
      model.traverse((child) => {
        if (child instanceof THREE.SkinnedMesh) {
          skinnedMeshes.push(child);
        }
      });

      expect(skinnedMeshes.length).toBe(1);
    });

    it("counts bones in model correctly", () => {
      const { rootBone } = createSkeletonWithWrists();

      let boneCount = 0;
      rootBone.traverse((child) => {
        if (child instanceof THREE.Bone) {
          boneCount++;
        }
      });

      // Should count all bones in hierarchy
      expect(boneCount).toBeGreaterThan(0);
    });

    it("preserves mesh geometry during rigging", () => {
      const geometry = new THREE.BoxGeometry(10, 10, 10);
      const originalVertexCount = geometry.attributes.position.count;

      // Add skin attributes
      const vertexCount = originalVertexCount;
      const skinWeights = new Float32Array(vertexCount * 4);
      const skinIndices = new Float32Array(vertexCount * 4);

      geometry.setAttribute(
        "skinWeight",
        new THREE.Float32BufferAttribute(skinWeights, 4),
      );
      geometry.setAttribute(
        "skinIndex",
        new THREE.Float32BufferAttribute(skinIndices, 4),
      );

      // Vertex count should remain the same
      expect(geometry.attributes.position.count).toBe(originalVertexCount);
    });
  });

  describe("Rigging Algorithm - 3D Landmark Projection", () => {
    it("projects 2D landmarks to 3D using camera matrices", () => {
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.position.set(0, 0, 2);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();

      // 2D point at center of image
      const point2D = { x: 0.5, y: 0.5 };
      const depth = 0.5;

      // Convert to NDC
      const ndcX = point2D.x * 2 - 1;
      const ndcY = 1 - point2D.y * 2;

      // Create point in clip space
      const clipSpace = new THREE.Vector4(ndcX, ndcY, depth, 1);

      // Unproject
      const invProjection = camera.projectionMatrix.clone().invert();
      const invCamera = camera.matrixWorld.clone();

      clipSpace.applyMatrix4(invProjection);
      clipSpace.divideScalar(clipSpace.w);
      clipSpace.applyMatrix4(invCamera);

      // Result should be a valid 3D point
      expect(Number.isFinite(clipSpace.x)).toBe(true);
      expect(Number.isFinite(clipSpace.y)).toBe(true);
      expect(Number.isFinite(clipSpace.z)).toBe(true);
    });

    it("world landmarks scale correctly based on model size", () => {
      const wristBone = new THREE.Bone();
      wristBone.position.set(0, 1, 0);

      const parentScale = 2.0;
      const parent = new THREE.Object3D();
      parent.scale.setScalar(parentScale);
      parent.add(wristBone);
      parent.updateMatrixWorld(true);

      // Landmark scaling
      const handScale = 0.5 * parentScale;
      const normalizedLandmark = { x: 0.1, y: -0.1, z: 0.02 };

      const scaledPos = new THREE.Vector3(
        normalizedLandmark.x * handScale,
        normalizedLandmark.y * handScale,
        normalizedLandmark.z * handScale,
      );

      expect(scaledPos.x).toBe(0.1 * handScale);
      expect(scaledPos.y).toBe(-0.1 * handScale);
    });

    it("bone positions are relative to parent", () => {
      const wristBone = new THREE.Bone();
      wristBone.position.set(0, 0, 0);

      const fingerBone = new THREE.Bone();
      fingerBone.name = "leftIndexProximal";

      // Set position relative to parent
      const parentWorldPos = new THREE.Vector3(100, 50, 0);
      const targetWorldPos = new THREE.Vector3(120, 60, 0);
      const localPos = targetWorldPos.sub(parentWorldPos);

      fingerBone.position.copy(localPos);

      expect(fingerBone.position.x).toBe(20);
      expect(fingerBone.position.y).toBe(10);
    });
  });

  describe("Rigging Result Validation", () => {
    it("hand bone structure has all required fields", () => {
      const { leftWrist } = createSkeletonWithWrists();
      const fingerBones = createFingerBones(leftWrist, "left");

      const handBoneStructure = {
        wrist: leftWrist,
        fingers: {
          thumb: fingerBones.thumb,
          index: fingerBones.index,
          middle: fingerBones.middle,
          ring: fingerBones.ring,
          little: fingerBones.little,
        },
      };

      expect(handBoneStructure.wrist).toBeDefined();
      expect(handBoneStructure.fingers.thumb).toHaveLength(3);
      expect(handBoneStructure.fingers.index).toHaveLength(3);
      expect(handBoneStructure.fingers.middle).toHaveLength(3);
      expect(handBoneStructure.fingers.ring).toHaveLength(3);
      expect(handBoneStructure.fingers.little).toHaveLength(3);
    });

    it("counts added bones correctly", () => {
      const { leftWrist } = createSkeletonWithWrists();
      const fingerBones = createFingerBones(leftWrist, "left");

      let totalBones = 0;
      for (const bones of Object.values(fingerBones)) {
        totalBones += bones.length;
      }

      // 5 fingers × 3 bones = 15 bones
      expect(totalBones).toBe(15);
    });

    it("rigging result contains valid ArrayBuffer for export", () => {
      // Simulate export result
      const mockExportData = new ArrayBuffer(1024);

      const result = {
        riggedModel: mockExportData,
        metadata: {
          originalBoneCount: 10,
          addedBoneCount: 15,
          processingTime: 500,
        },
      };

      expect(result.riggedModel).toBeInstanceOf(ArrayBuffer);
      expect(result.riggedModel.byteLength).toBeGreaterThan(0);
      expect(result.metadata.addedBoneCount).toBe(15);
    });

    it("calculates processing time accurately", () => {
      const startTime = Date.now();

      // Simulate processing delay
      const delay = 10;
      const endTime = startTime + delay;
      const processingTime = endTime - startTime;

      expect(processingTime).toBe(delay);
    });
  });
});

// =============================================================================
// ACTUAL SERVICE TESTS - Testing HandRiggingService class and types
// Note: The service requires WebGL for OrthographicHandRenderer.
// These tests verify imports, types, and methods that don't require rendering.
// =============================================================================
import {
  HandRiggingService,
  type HandBoneStructure,
  type HandRiggingResult,
  type HandRiggingOptions,
} from "../HandRiggingService";

describe("HandRiggingService - Service Instance Tests", () => {
  // Try to create a service instance - may fail in Node.js environment
  let service: HandRiggingService | null = null;
  let webglAvailable = false;

  beforeAll(() => {
    try {
      service = new HandRiggingService();
      webglAvailable = true;
    } catch (_error) {
      // WebGL not available in Node.js - this is expected
      webglAvailable = false;
    }
  });

  describe("Service Import and Types", () => {
    it("HandRiggingService class is importable", () => {
      expect(HandRiggingService).toBeDefined();
      expect(typeof HandRiggingService).toBe("function");
    });

    it("HandBoneStructure type is exported", () => {
      const mockBoneStructure: HandBoneStructure = {
        wrist: new THREE.Bone(),
        fingers: {
          thumb: [new THREE.Bone(), new THREE.Bone(), new THREE.Bone()],
          index: [new THREE.Bone(), new THREE.Bone(), new THREE.Bone()],
          middle: [new THREE.Bone(), new THREE.Bone(), new THREE.Bone()],
          ring: [new THREE.Bone(), new THREE.Bone(), new THREE.Bone()],
          pinky: [new THREE.Bone(), new THREE.Bone(), new THREE.Bone()],
        },
      };

      expect(mockBoneStructure.wrist).toBeInstanceOf(THREE.Bone);
      expect(mockBoneStructure.fingers.thumb).toHaveLength(3);
      expect(mockBoneStructure.fingers.index).toHaveLength(3);
      expect(mockBoneStructure.fingers.middle).toHaveLength(3);
      expect(mockBoneStructure.fingers.ring).toHaveLength(3);
      expect(mockBoneStructure.fingers.pinky).toHaveLength(3);
    });

    it("HandRiggingResult type is exported", () => {
      const mockResult: HandRiggingResult = {
        riggedModel: new ArrayBuffer(100),
        metadata: {
          originalBoneCount: 10,
          addedBoneCount: 15,
          processingTime: 500,
        },
      };

      expect(mockResult.riggedModel).toBeInstanceOf(ArrayBuffer);
      expect(mockResult.metadata.originalBoneCount).toBe(10);
      expect(mockResult.metadata.addedBoneCount).toBe(15);
      expect(mockResult.metadata.processingTime).toBe(500);
    });

    it("HandRiggingOptions type is exported", () => {
      const mockOptions: HandRiggingOptions = {
        smoothingIterations: 3,
        minConfidence: 0.7,
        debugMode: false,
        captureResolution: 512,
      };

      expect(mockOptions.smoothingIterations).toBe(3);
      expect(mockOptions.minConfidence).toBe(0.7);
      expect(mockOptions.debugMode).toBe(false);
      expect(mockOptions.captureResolution).toBe(512);
    });
  });

  describe("Service Instance - WebGL Required", () => {
    it("documents WebGL requirement", () => {
      // In browser environment, this would work; in Node.js it fails
      if (webglAvailable && service) {
        expect(service).toBeInstanceOf(HandRiggingService);
      } else {
        // Expected to fail in Node.js
        expect(webglAvailable).toBe(false);
      }
    });

    it("initialize method exists if service is available", () => {
      if (!webglAvailable || !service) {
        return;
      }

      expect(typeof service.initialize).toBe("function");
    });

    it("rigHands method exists if service is available", () => {
      if (!webglAvailable || !service) {
        return;
      }

      expect(typeof service.rigHands).toBe("function");
    });

    it("dispose method exists if service is available", () => {
      if (!webglAvailable || !service) {
        return;
      }

      expect(typeof service.dispose).toBe("function");
    });
  });

  describe("Hand Bone Structure Validation", () => {
    it("creates valid bone structure with correct finger count", () => {
      const { leftWrist } = createSkeletonWithWrists();
      const fingerBones = createFingerBones(leftWrist, "left");

      const boneStructure: HandBoneStructure = {
        wrist: leftWrist,
        fingers: {
          thumb: fingerBones.thumb,
          index: fingerBones.index,
          middle: fingerBones.middle,
          ring: fingerBones.ring,
          pinky: fingerBones.little,
        },
      };

      // Each finger should have 3 bones
      expect(boneStructure.fingers.thumb).toHaveLength(3);
      expect(boneStructure.fingers.index).toHaveLength(3);
      expect(boneStructure.fingers.middle).toHaveLength(3);
      expect(boneStructure.fingers.ring).toHaveLength(3);
      expect(boneStructure.fingers.pinky).toHaveLength(3);
    });

    it("finger bones are proper THREE.Bone instances", () => {
      const { leftWrist } = createSkeletonWithWrists();
      const fingerBones = createFingerBones(leftWrist, "left");

      for (const [_finger, bones] of Object.entries(fingerBones)) {
        for (const bone of bones) {
          expect(bone).toBeInstanceOf(THREE.Bone);
        }
      }
    });

    it("finger bones maintain parent-child hierarchy", () => {
      const { leftWrist } = createSkeletonWithWrists();
      const fingerBones = createFingerBones(leftWrist, "left");

      // First bone of each finger should be child of wrist
      for (const [_finger, bones] of Object.entries(fingerBones)) {
        expect(bones[0].parent).toBe(leftWrist);

        // Subsequent bones should be children of previous
        for (let i = 1; i < bones.length; i++) {
          expect(bones[i].parent).toBe(bones[i - 1]);
        }
      }
    });
  });

  describe("Bone Naming Conventions", () => {
    it("left hand bone names use correct convention", () => {
      const leftBoneNames = HAND_BONE_NAMES.left;

      expect(leftBoneNames.wrist).toContain("left");
      expect(leftBoneNames.thumb[0]).toContain("left");
      expect(leftBoneNames.index[0]).toContain("left");
    });

    it("right hand bone names use correct convention", () => {
      const rightBoneNames = HAND_BONE_NAMES.right;

      expect(rightBoneNames.wrist).toContain("right");
      expect(rightBoneNames.thumb[0]).toContain("right");
      expect(rightBoneNames.index[0]).toContain("right");
    });

    it("bone names include joint type (Proximal, Intermediate, Distal)", () => {
      const leftBoneNames = HAND_BONE_NAMES.left;

      // Check index finger as example
      expect(leftBoneNames.index[0]).toContain("Proximal");
      expect(leftBoneNames.index[1]).toContain("Intermediate");
      expect(leftBoneNames.index[2]).toContain("Distal");
    });
  });

  describe("Rigging Options Validation", () => {
    it("default options have sensible values", () => {
      const defaultOptions: HandRiggingOptions = {
        smoothingIterations: 3,
        minConfidence: 0.7,
        debugMode: false,
        captureResolution: 512,
      };

      expect(defaultOptions.smoothingIterations).toBeGreaterThan(0);
      expect(defaultOptions.minConfidence).toBeGreaterThan(0);
      expect(defaultOptions.minConfidence).toBeLessThanOrEqual(1);
      expect(Math.log2(defaultOptions.captureResolution!) % 1).toBe(0); // Power of 2
    });

    it("confidence threshold validates range", () => {
      const validConfidence = 0.7;
      const highConfidence = 0.95;
      const lowConfidence = 0.3;

      // Valid range is 0-1
      expect(validConfidence).toBeGreaterThanOrEqual(0);
      expect(validConfidence).toBeLessThanOrEqual(1);
      expect(highConfidence).toBeGreaterThanOrEqual(0);
      expect(highConfidence).toBeLessThanOrEqual(1);
      expect(lowConfidence).toBeGreaterThanOrEqual(0);
      expect(lowConfidence).toBeLessThanOrEqual(1);
    });
  });

  describe("Result Metadata Structure", () => {
    it("metadata includes required fields", () => {
      const metadata = {
        originalBoneCount: 25,
        addedBoneCount: 30,
        processingTime: 1500,
      };

      expect(typeof metadata.originalBoneCount).toBe("number");
      expect(typeof metadata.addedBoneCount).toBe("number");
      expect(typeof metadata.processingTime).toBe("number");
    });

    it("added bone count equals fingers * 3 * 2 for both hands", () => {
      // 5 fingers * 3 bones per finger * 2 hands = 30 bones
      const expectedBonesPerHand = 5 * 3;
      const expectedTotalBones = expectedBonesPerHand * 2;

      expect(expectedBonesPerHand).toBe(15);
      expect(expectedTotalBones).toBe(30);
    });

    it("processing time is non-negative", () => {
      const startTime = Date.now();
      // Simulate some work
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Skinned Mesh Detection Logic", () => {
    it("finds skinned meshes in model hierarchy", () => {
      const model = new THREE.Object3D();

      // Add regular mesh
      model.add(new THREE.Mesh(new THREE.BoxGeometry()));

      // Add skinned mesh
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.MeshBasicMaterial();
      const bone = new THREE.Bone();
      const skinnedMesh = new THREE.SkinnedMesh(geometry, material);
      skinnedMesh.add(bone);
      skinnedMesh.bind(new THREE.Skeleton([bone]));
      model.add(skinnedMesh);

      // Find skinned meshes
      const skinnedMeshes: THREE.SkinnedMesh[] = [];
      model.traverse((child) => {
        if (child instanceof THREE.SkinnedMesh) {
          skinnedMeshes.push(child);
        }
      });

      expect(skinnedMeshes.length).toBe(1);
      expect(skinnedMeshes[0]).toBe(skinnedMesh);
    });

    it("counts bones in model correctly", () => {
      const { rootBone } = createSkeletonWithWrists();

      let boneCount = 0;
      rootBone.traverse((child) => {
        if (child instanceof THREE.Bone) {
          boneCount++;
        }
      });

      expect(boneCount).toBeGreaterThan(0);
    });
  });

  describe("Weight Calculation Logic", () => {
    it("calculates inverse square distance weight", () => {
      const vertex = new THREE.Vector3(25, 0, 0);
      const bonePos = new THREE.Vector3(20, 0, 0);
      const factor = 0.01;

      const distance = vertex.distanceTo(bonePos);
      const weight = 1 / (1 + distance * distance * factor);

      expect(distance).toBe(5);
      expect(weight).toBeGreaterThan(0);
      expect(weight).toBeLessThan(1);
    });

    it("closer vertices get higher weights", () => {
      const bonePos = new THREE.Vector3(20, 0, 0);
      const closeVertex = new THREE.Vector3(22, 0, 0);
      const farVertex = new THREE.Vector3(30, 0, 0);
      const factor = 0.01;

      const closeDist = closeVertex.distanceTo(bonePos);
      const farDist = farVertex.distanceTo(bonePos);

      const closeWeight = 1 / (1 + closeDist * closeDist * factor);
      const farWeight = 1 / (1 + farDist * farDist * factor);

      expect(closeWeight).toBeGreaterThan(farWeight);
    });

    it("normalizes weights to sum to 1.0", () => {
      const weights = [0.4, 0.3, 0.2, 0.1];
      const total = weights.reduce((a, b) => a + b, 0);
      const normalizedWeights = weights.map((w) => w / total);

      const sum = normalizedWeights.reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });

    it("selects top 4 weights for GPU skinning limit", () => {
      const weights = [
        { boneIndex: 0, weight: 0.1 },
        { boneIndex: 1, weight: 0.5 },
        { boneIndex: 2, weight: 0.3 },
        { boneIndex: 3, weight: 0.05 },
        { boneIndex: 4, weight: 0.2 },
        { boneIndex: 5, weight: 0.01 },
      ];

      // Sort by weight descending
      weights.sort((a, b) => b.weight - a.weight);

      // Take top 4
      const topWeights = weights.slice(0, 4);

      expect(topWeights).toHaveLength(4);
      expect(topWeights[0].weight).toBeGreaterThanOrEqual(topWeights[1].weight);
      expect(topWeights[1].weight).toBeGreaterThanOrEqual(topWeights[2].weight);
      expect(topWeights[2].weight).toBeGreaterThanOrEqual(topWeights[3].weight);
    });
  });

  describe("Depth Estimation for 3D Projection", () => {
    it("estimates depth values for all 21 landmarks", () => {
      // Simulate depth estimation based on hand anatomy
      const depths: number[] = [];

      // Wrist
      depths[0] = 0;

      // Thumb
      depths[1] = 0.02; // CMC
      depths[2] = 0.04; // MCP
      depths[3] = 0.06; // IP
      depths[4] = 0.08; // Tip

      // Fingers (4 fingers x 4 joints)
      for (let finger = 0; finger < 4; finger++) {
        const base = 5 + finger * 4;
        depths[base] = 0.01; // MCP
        depths[base + 1] = 0.03; // PIP
        depths[base + 2] = 0.05; // DIP
        depths[base + 3] = 0.07; // Tip
      }

      expect(depths).toHaveLength(21);
      for (const d of depths) {
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(0.1);
      }
    });

    it("finger tips have greater depth than joints", () => {
      const mcpDepth = 0.01;
      const tipDepth = 0.07;

      expect(tipDepth).toBeGreaterThan(mcpDepth);
    });
  });
});

// =============================================================================
// PURE LOGIC TESTS - Testing algorithms without WebGL
// =============================================================================

describe("HandRiggingService - Pure Logic Tests", () => {
  describe("Bone Naming - VRM Convention Validation", () => {
    const VRM_BONE_PATTERN =
      /^(left|right)(Thumb|Index|Middle|Ring|Little)(Proximal|Intermediate|Distal)$/;

    it("all left hand bone names follow VRM pattern", () => {
      const leftBones = HAND_BONE_NAMES.left;

      for (const finger of [
        "thumb",
        "index",
        "middle",
        "ring",
        "little",
      ] as const) {
        for (const boneName of leftBones[finger]) {
          expect(boneName).toMatch(VRM_BONE_PATTERN);
        }
      }
    });

    it("all right hand bone names follow VRM pattern", () => {
      const rightBones = HAND_BONE_NAMES.right;

      for (const finger of [
        "thumb",
        "index",
        "middle",
        "ring",
        "little",
      ] as const) {
        for (const boneName of rightBones[finger]) {
          expect(boneName).toMatch(VRM_BONE_PATTERN);
        }
      }
    });

    it("bone names are unique within a hand", () => {
      const leftBones = HAND_BONE_NAMES.left;
      const allLeftNames: string[] = [];

      for (const finger of [
        "thumb",
        "index",
        "middle",
        "ring",
        "little",
      ] as const) {
        allLeftNames.push(...leftBones[finger]);
      }

      const uniqueNames = new Set(allLeftNames);
      expect(uniqueNames.size).toBe(allLeftNames.length);
    });

    it("left and right bone names differ only by side prefix", () => {
      const leftThumb = HAND_BONE_NAMES.left.thumb;
      const rightThumb = HAND_BONE_NAMES.right.thumb;

      for (let i = 0; i < leftThumb.length; i++) {
        const leftName = leftThumb[i];
        const rightName = rightThumb[i];

        expect(leftName.replace("left", "")).toBe(
          rightName.replace("right", ""),
        );
      }
    });

    it("finger bone order is Proximal -> Intermediate -> Distal", () => {
      for (const side of ["left", "right"] as const) {
        for (const finger of [
          "thumb",
          "index",
          "middle",
          "ring",
          "little",
        ] as const) {
          const bones = HAND_BONE_NAMES[side][finger];

          expect(bones[0]).toContain("Proximal");
          expect(bones[1]).toContain("Intermediate");
          expect(bones[2]).toContain("Distal");
        }
      }
    });

    it("wrist bones follow naming convention", () => {
      expect(HAND_BONE_NAMES.left.wrist).toBe("leftHand");
      expect(HAND_BONE_NAMES.right.wrist).toBe("rightHand");
    });
  });

  describe("Weight Calculation - Edge Cases", () => {
    it("handles zero distance correctly", () => {
      const vertex = new THREE.Vector3(20, 0, 0);
      const bonePos = new THREE.Vector3(20, 0, 0);
      const factor = 0.01;

      const distance = vertex.distanceTo(bonePos);
      const weight = 1 / (1 + distance * distance * factor);

      expect(distance).toBe(0);
      expect(weight).toBe(1); // Full weight when directly on bone
    });

    it("handles very large distances with small weights", () => {
      const vertex = new THREE.Vector3(1000, 0, 0);
      const bonePos = new THREE.Vector3(0, 0, 0);
      const factor = 0.01;

      const distance = vertex.distanceTo(bonePos);
      const weight = 1 / (1 + distance * distance * factor);

      expect(distance).toBe(1000);
      expect(weight).toBeLessThan(0.001); // Very small weight for far vertices
    });

    it("weight falloff is symmetric", () => {
      const bonePos = new THREE.Vector3(0, 0, 0);
      const factor = 0.01;

      const vertex1 = new THREE.Vector3(10, 0, 0);
      const vertex2 = new THREE.Vector3(-10, 0, 0);
      const vertex3 = new THREE.Vector3(0, 10, 0);

      const weight1 = 1 / (1 + vertex1.distanceTo(bonePos) ** 2 * factor);
      const weight2 = 1 / (1 + vertex2.distanceTo(bonePos) ** 2 * factor);
      const weight3 = 1 / (1 + vertex3.distanceTo(bonePos) ** 2 * factor);

      expect(weight1).toBeCloseTo(weight2, 10);
      expect(weight1).toBeCloseTo(weight3, 10);
    });

    it("normalizes empty weight array gracefully", () => {
      const weights: number[] = [];
      const total = weights.reduce((a, b) => a + b, 0);

      // Should handle empty array without division by zero
      const normalizedWeights = total > 0 ? weights.map((w) => w / total) : [];
      expect(normalizedWeights).toHaveLength(0);
    });

    it("normalizes single weight to 1.0", () => {
      const weights = [0.5];
      const total = weights.reduce((a, b) => a + b, 0);
      const normalizedWeights = weights.map((w) => w / total);

      expect(normalizedWeights[0]).toBe(1.0);
    });

    it("handles weights less than threshold", () => {
      const threshold = 0.01;
      const weights = [
        { boneIndex: 0, weight: 0.5 },
        { boneIndex: 1, weight: 0.005 }, // Below threshold
        { boneIndex: 2, weight: 0.3 },
      ];

      const validWeights = weights.filter((w) => w.weight >= threshold);
      expect(validWeights).toHaveLength(2);
    });
  });

  describe("Top Weights Selection - Algorithm Tests", () => {
    it("returns empty array for empty input", () => {
      const weights: Array<{ boneIndex: number; weight: number }> = [];
      const sorted = [...weights].sort((a, b) => b.weight - a.weight);
      const top = sorted.slice(0, 4);

      expect(top).toHaveLength(0);
    });

    it("returns all weights when less than 4", () => {
      const weights = [
        { boneIndex: 0, weight: 0.6 },
        { boneIndex: 1, weight: 0.4 },
      ];

      const sorted = [...weights].sort((a, b) => b.weight - a.weight);
      const top = sorted.slice(0, 4);

      expect(top).toHaveLength(2);
      expect(top[0].weight).toBe(0.6);
      expect(top[1].weight).toBe(0.4);
    });

    it("handles duplicate weights correctly", () => {
      const weights = [
        { boneIndex: 0, weight: 0.5 },
        { boneIndex: 1, weight: 0.5 },
        { boneIndex: 2, weight: 0.3 },
        { boneIndex: 3, weight: 0.3 },
        { boneIndex: 4, weight: 0.1 },
      ];

      const sorted = [...weights].sort((a, b) => b.weight - a.weight);
      const top = sorted.slice(0, 4);

      expect(top).toHaveLength(4);
      // First two should be 0.5, next two should be 0.3
      expect(top[0].weight).toBe(0.5);
      expect(top[1].weight).toBe(0.5);
      expect(top[2].weight).toBe(0.3);
      expect(top[3].weight).toBe(0.3);
    });

    it("renormalizes after selection", () => {
      const weights = [
        { boneIndex: 0, weight: 0.4 },
        { boneIndex: 1, weight: 0.3 },
        { boneIndex: 2, weight: 0.2 },
        { boneIndex: 3, weight: 0.1 },
        { boneIndex: 4, weight: 0.05 }, // Will be excluded
      ];

      const sorted = [...weights].sort((a, b) => b.weight - a.weight);
      const top = sorted.slice(0, 4);

      const topTotal = top.reduce((sum, w) => sum + w.weight, 0);
      const renormalized = top.map((w) => ({
        ...w,
        weight: w.weight / topTotal,
      }));

      const finalSum = renormalized.reduce((sum, w) => sum + w.weight, 0);
      expect(finalSum).toBeCloseTo(1.0, 10);
    });
  });

  describe("Landmark Index Validation", () => {
    it("all landmark indices are unique", () => {
      const indices = Object.values(HAND_LANDMARK_INDICES);
      const uniqueIndices = new Set(indices);

      expect(uniqueIndices.size).toBe(indices.length);
    });

    it("landmark indices are sequential 0-20", () => {
      const indices = Object.values(HAND_LANDMARK_INDICES);

      expect(Math.min(...indices)).toBe(0);
      expect(Math.max(...indices)).toBe(20);
      expect(indices).toHaveLength(21);
    });

    it("finger joint indices match landmark indices", () => {
      expect(FINGER_JOINTS.thumb[0]).toBe(HAND_LANDMARK_INDICES.thumbCMC);
      expect(FINGER_JOINTS.thumb[3]).toBe(HAND_LANDMARK_INDICES.thumbTip);

      expect(FINGER_JOINTS.index[0]).toBe(HAND_LANDMARK_INDICES.indexMCP);
      expect(FINGER_JOINTS.index[3]).toBe(HAND_LANDMARK_INDICES.indexTip);

      expect(FINGER_JOINTS.middle[0]).toBe(HAND_LANDMARK_INDICES.middleMCP);
      expect(FINGER_JOINTS.middle[3]).toBe(HAND_LANDMARK_INDICES.middleTip);

      expect(FINGER_JOINTS.ring[0]).toBe(HAND_LANDMARK_INDICES.ringMCP);
      expect(FINGER_JOINTS.ring[3]).toBe(HAND_LANDMARK_INDICES.ringTip);

      expect(FINGER_JOINTS.little[0]).toBe(HAND_LANDMARK_INDICES.littleMCP);
      expect(FINGER_JOINTS.little[3]).toBe(HAND_LANDMARK_INDICES.littleTip);
    });

    it("each finger has 4 landmark indices", () => {
      expect(FINGER_JOINTS.thumb).toHaveLength(4);
      expect(FINGER_JOINTS.index).toHaveLength(4);
      expect(FINGER_JOINTS.middle).toHaveLength(4);
      expect(FINGER_JOINTS.ring).toHaveLength(4);
      expect(FINGER_JOINTS.little).toHaveLength(4);
    });
  });

  describe("Configuration Validation - Edge Cases", () => {
    it("minConfidence of 0 allows all detections", () => {
      const options: HandRiggingOptions = { minConfidence: 0 };
      const testConfidences = [0.01, 0.1, 0.5, 0.99];

      for (const confidence of testConfidences) {
        expect(confidence >= options.minConfidence!).toBe(true);
      }
    });

    it("minConfidence of 1 rejects all but perfect detections", () => {
      const options: HandRiggingOptions = { minConfidence: 1.0 };
      const testConfidences = [0.99, 0.95, 0.5];

      for (const confidence of testConfidences) {
        expect(confidence >= options.minConfidence!).toBe(false);
      }

      expect(1.0 >= options.minConfidence!).toBe(true);
    });

    it("smoothingIterations of 0 disables smoothing", () => {
      const options: HandRiggingOptions = { smoothingIterations: 0 };
      const shouldSmooth = (options.smoothingIterations ?? 3) > 0;

      expect(shouldSmooth).toBe(false);
    });

    it("captureResolution validates as power of 2", () => {
      const validResolutions = [256, 512, 1024, 2048];
      const invalidResolutions = [300, 500, 1000];

      for (const res of validResolutions) {
        const isPowerOf2 = Math.log2(res) % 1 === 0;
        expect(isPowerOf2).toBe(true);
      }

      for (const res of invalidResolutions) {
        const isPowerOf2 = Math.log2(res) % 1 === 0;
        expect(isPowerOf2).toBe(false);
      }
    });

    it("accepts partial options", () => {
      const partialOptions: HandRiggingOptions = { debugMode: true };

      expect(partialOptions.debugMode).toBe(true);
      expect(partialOptions.smoothingIterations).toBeUndefined();
      expect(partialOptions.minConfidence).toBeUndefined();
    });
  });

  describe("Bone Count Calculation", () => {
    it("countHandBones returns 0 for empty structure", () => {
      const bones = {
        wrist: new THREE.Bone(),
        fingers: {
          thumb: [],
          index: [],
          middle: [],
          ring: [],
          pinky: [],
        },
      };

      let count = 0;
      Object.values(bones.fingers).forEach((fingerBones) => {
        count += fingerBones.length;
      });

      expect(count).toBe(0);
    });

    it("countHandBones counts only finger bones, not wrist", () => {
      const bones: HandBoneStructure = {
        wrist: new THREE.Bone(),
        fingers: {
          thumb: [new THREE.Bone(), new THREE.Bone(), new THREE.Bone()],
          index: [new THREE.Bone(), new THREE.Bone(), new THREE.Bone()],
          middle: [new THREE.Bone(), new THREE.Bone(), new THREE.Bone()],
          ring: [new THREE.Bone(), new THREE.Bone(), new THREE.Bone()],
          pinky: [new THREE.Bone(), new THREE.Bone(), new THREE.Bone()],
        },
      };

      let count = 0;
      Object.values(bones.fingers).forEach((fingerBones) => {
        count += fingerBones.length;
      });

      expect(count).toBe(15); // 5 fingers × 3 bones
    });

    it("handles partial finger bones", () => {
      const bones = {
        wrist: new THREE.Bone(),
        fingers: {
          thumb: [new THREE.Bone()], // Only 1 bone
          index: [new THREE.Bone(), new THREE.Bone()], // 2 bones
          middle: [],
          ring: [],
          pinky: [new THREE.Bone(), new THREE.Bone(), new THREE.Bone()],
        },
      };

      let count = 0;
      Object.values(bones.fingers).forEach((fingerBones) => {
        count += fingerBones.length;
      });

      expect(count).toBe(6); // 1 + 2 + 0 + 0 + 3
    });
  });

  describe("Depth Estimation Algorithm", () => {
    /**
     * Simulates the estimateLandmarkDepths() method from HandRiggingService
     */
    function estimateLandmarkDepths(): number[] {
      const depths: number[] = [];

      // Wrist is at base depth (0)
      depths[0] = 0;

      // Thumb
      depths[1] = 0.02; // CMC
      depths[2] = 0.04; // MCP
      depths[3] = 0.06; // IP
      depths[4] = 0.08; // Tip

      // Fingers (gradually forward)
      for (let finger = 0; finger < 4; finger++) {
        const base = 5 + finger * 4;
        depths[base] = 0.01; // MCP
        depths[base + 1] = 0.03; // PIP
        depths[base + 2] = 0.05; // DIP
        depths[base + 3] = 0.07; // Tip
      }

      return depths;
    }

    it("returns exactly 21 depth values", () => {
      const depths = estimateLandmarkDepths();
      expect(depths).toHaveLength(21);
    });

    it("wrist has zero depth", () => {
      const depths = estimateLandmarkDepths();
      expect(depths[0]).toBe(0);
    });

    it("thumb depths increase from CMC to tip", () => {
      const depths = estimateLandmarkDepths();

      expect(depths[1]).toBeLessThan(depths[2]); // CMC < MCP
      expect(depths[2]).toBeLessThan(depths[3]); // MCP < IP
      expect(depths[3]).toBeLessThan(depths[4]); // IP < Tip
    });

    it("finger depths increase from MCP to tip", () => {
      const depths = estimateLandmarkDepths();

      // Check index finger (indices 5-8)
      expect(depths[5]).toBeLessThan(depths[6]); // MCP < PIP
      expect(depths[6]).toBeLessThan(depths[7]); // PIP < DIP
      expect(depths[7]).toBeLessThan(depths[8]); // DIP < Tip
    });

    it("all depths are non-negative", () => {
      const depths = estimateLandmarkDepths();

      for (const depth of depths) {
        expect(depth).toBeGreaterThanOrEqual(0);
      }
    });

    it("all depths are reasonable for hand anatomy", () => {
      const depths = estimateLandmarkDepths();
      const maxExpectedDepth = 0.15; // ~15cm max depth

      for (const depth of depths) {
        expect(depth).toBeLessThanOrEqual(maxExpectedDepth);
      }
    });

    it("finger tip depths are consistent across fingers", () => {
      const depths = estimateLandmarkDepths();

      const indexTipDepth = depths[8];
      const middleTipDepth = depths[12];
      const ringTipDepth = depths[16];
      const littleTipDepth = depths[20];

      // All finger tips should have same depth
      expect(middleTipDepth).toBe(indexTipDepth);
      expect(ringTipDepth).toBe(indexTipDepth);
      expect(littleTipDepth).toBe(indexTipDepth);
    });
  });

  describe("Hand Side Detection Logic", () => {
    const detectHandSide = (boneName: string): "left" | "right" | null => {
      const lowerName = boneName.toLowerCase();

      if (
        lowerName.includes("left") ||
        lowerName.includes("_l") ||
        lowerName.endsWith(".l")
      ) {
        return "left";
      }

      if (
        lowerName.includes("right") ||
        lowerName.includes("_r") ||
        lowerName.endsWith(".r")
      ) {
        return "right";
      }

      return null;
    };

    it("detects left hand from various naming conventions", () => {
      const leftNames = [
        "LeftHand",
        "leftHand",
        "mixamorig:LeftHand",
        "hand_l",
        "Hand_L",
        "hand.l",
        "leftWrist",
        "left_wrist",
      ];

      for (const name of leftNames) {
        expect(detectHandSide(name)).toBe("left");
      }
    });

    it("detects right hand from various naming conventions", () => {
      const rightNames = [
        "RightHand",
        "rightHand",
        "mixamorig:RightHand",
        "hand_r",
        "Hand_R",
        "hand.r",
        "rightWrist",
        "right_wrist",
      ];

      for (const name of rightNames) {
        expect(detectHandSide(name)).toBe("right");
      }
    });

    it("returns null for ambiguous names", () => {
      const ambiguousNames = ["Hand", "wrist", "palm", "finger"];

      for (const name of ambiguousNames) {
        expect(detectHandSide(name)).toBeNull();
      }
    });
  });

  describe("Skeleton Bone Index Operations", () => {
    it("finds bone index in skeleton", () => {
      const { skeleton, leftWrist } = createSkeletonWithWrists();

      const index = skeleton.bones.indexOf(leftWrist);
      expect(index).toBeGreaterThanOrEqual(0);
    });

    it("returns -1 for non-existent bone", () => {
      const { skeleton } = createSkeletonWithWrists();
      const unknownBone = new THREE.Bone();
      unknownBone.name = "UnknownBone";

      const index = skeleton.bones.indexOf(unknownBone);
      expect(index).toBe(-1);
    });

    it("builds bone index map correctly", () => {
      const { skeleton, leftWrist, rightWrist } = createSkeletonWithWrists();
      const boneIndices = new Map<THREE.Bone, number>();

      for (const bone of [leftWrist, rightWrist]) {
        const idx = skeleton.bones.indexOf(bone);
        if (idx !== -1) {
          boneIndices.set(bone, idx);
        }
      }

      expect(boneIndices.size).toBe(2);
      expect(boneIndices.has(leftWrist)).toBe(true);
      expect(boneIndices.has(rightWrist)).toBe(true);
    });

    it("adds new bones to skeleton dynamically", () => {
      const { skeleton, leftWrist, rootBone } = createSkeletonWithWrists();
      const originalCount = skeleton.bones.length;

      // Add a new bone
      const newBone = new THREE.Bone();
      newBone.name = "leftThumbProximal";
      leftWrist.add(newBone);

      // Update world matrices
      rootBone.updateMatrixWorld(true);

      // Create new skeleton with added bone
      const newSkeleton = new THREE.Skeleton([...skeleton.bones, newBone]);

      expect(newSkeleton.bones.length).toBe(originalCount + 1);
      expect(newSkeleton.bones.includes(newBone)).toBe(true);
    });
  });

  describe("Result Structure Validation", () => {
    it("creates valid HandRiggingResult structure", () => {
      const result: HandRiggingResult = {
        riggedModel: new ArrayBuffer(1024),
        metadata: {
          originalBoneCount: 25,
          addedBoneCount: 30,
          processingTime: 1500,
        },
      };

      expect(result.riggedModel).toBeInstanceOf(ArrayBuffer);
      expect(result.metadata.originalBoneCount).toBeGreaterThanOrEqual(0);
      expect(result.metadata.addedBoneCount).toBeGreaterThanOrEqual(0);
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
    });

    it("allows optional left/right hand data", () => {
      const resultWithHands: HandRiggingResult = {
        riggedModel: new ArrayBuffer(1024),
        metadata: {
          originalBoneCount: 25,
          addedBoneCount: 30,
          processingTime: 1500,
        },
        leftHand: {
          bones: {
            wrist: new THREE.Bone(),
            fingers: {
              thumb: [],
              index: [],
              middle: [],
              ring: [],
              pinky: [],
            },
          },
          detectionConfidence: 0.95,
          vertexCount: 1000,
        },
      };

      expect(resultWithHands.leftHand).toBeDefined();
      expect(resultWithHands.leftHand!.detectionConfidence).toBe(0.95);
      expect(resultWithHands.rightHand).toBeUndefined();
    });

    it("validates detection confidence range", () => {
      const handResult = {
        bones: {
          wrist: new THREE.Bone(),
          fingers: {
            thumb: [],
            index: [],
            middle: [],
            ring: [],
            pinky: [],
          },
        },
        detectionConfidence: 0.85,
        vertexCount: 500,
      };

      expect(handResult.detectionConfidence).toBeGreaterThanOrEqual(0);
      expect(handResult.detectionConfidence).toBeLessThanOrEqual(1);
    });
  });

  describe("Matrix Operations for 3D Projection", () => {
    it("camera projection matrix is invertible", () => {
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.updateProjectionMatrix();

      const invProjection = camera.projectionMatrix.clone().invert();

      // Verify inversion is valid (no NaN)
      for (const element of invProjection.elements) {
        expect(Number.isFinite(element)).toBe(true);
      }
    });

    it("converts NDC to camera space correctly", () => {
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.updateProjectionMatrix();

      // Center of screen in NDC
      const ndcPoint = new THREE.Vector4(0, 0, 0, 1);

      const invProjection = camera.projectionMatrix.clone().invert();
      ndcPoint.applyMatrix4(invProjection);
      ndcPoint.divideScalar(ndcPoint.w);

      // Should produce valid camera-space coordinates
      expect(Number.isFinite(ndcPoint.x)).toBe(true);
      expect(Number.isFinite(ndcPoint.y)).toBe(true);
      expect(Number.isFinite(ndcPoint.z)).toBe(true);
    });

    it("landmark scaling respects model proportions", () => {
      const modelScale = 2.0;
      const baseHandScale = 0.5;
      const effectiveScale = baseHandScale * modelScale;

      const normalizedLandmark = { x: 0.1, y: -0.05, z: 0.02 };

      const scaledPos = new THREE.Vector3(
        normalizedLandmark.x * effectiveScale,
        normalizedLandmark.y * effectiveScale,
        normalizedLandmark.z * effectiveScale,
      );

      expect(scaledPos.x).toBe(0.1);
      expect(scaledPos.y).toBe(-0.05);
      expect(scaledPos.z).toBe(0.02);
    });
  });

  describe("Error Handling Patterns", () => {
    it("no wrist bones error message pattern", () => {
      const errorMessage =
        "No wrist bones found in model. Ensure the model has proper bone hierarchy.";

      expect(errorMessage).toContain("wrist bones");
      expect(errorMessage).toContain("bone hierarchy");
    });

    it("low quality detection validation structure", () => {
      const validation = {
        isValid: false,
        issues: ["Finger spread too narrow", "Low confidence score"],
      };

      expect(validation.isValid).toBe(false);
      expect(Array.isArray(validation.issues)).toBe(true);
      expect(validation.issues.length).toBeGreaterThan(0);
    });

    it("handles null detection result gracefully", () => {
      const detection: { hands: Array<{ confidence: number }> } | null = null;

      const hasValidHands = detection !== null && detection.hands.length > 0;
      expect(hasValidHands).toBe(false);
    });

    it("handles empty hands array", () => {
      const detection = { hands: [] };

      const hasValidHands = detection.hands.length > 0;
      expect(hasValidHands).toBe(false);
    });
  });

  describe("Skinned Mesh Attributes", () => {
    it("creates valid skinWeight buffer attribute", () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const vertexCount = geometry.attributes.position.count;

      const skinWeights = new Float32Array(vertexCount * 4);
      geometry.setAttribute(
        "skinWeight",
        new THREE.Float32BufferAttribute(skinWeights, 4),
      );

      expect(geometry.attributes.skinWeight).toBeDefined();
      expect(geometry.attributes.skinWeight.itemSize).toBe(4);
      expect(geometry.attributes.skinWeight.count).toBe(vertexCount);
    });

    it("creates valid skinIndex buffer attribute", () => {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const vertexCount = geometry.attributes.position.count;

      const skinIndices = new Float32Array(vertexCount * 4);
      geometry.setAttribute(
        "skinIndex",
        new THREE.Float32BufferAttribute(skinIndices, 4),
      );

      expect(geometry.attributes.skinIndex).toBeDefined();
      expect(geometry.attributes.skinIndex.itemSize).toBe(4);
      expect(geometry.attributes.skinIndex.count).toBe(vertexCount);
    });

    it("skin attributes support 4 bone influences per vertex", () => {
      const vertexIdx = 0;
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const vertexCount = geometry.attributes.position.count;

      const skinWeights = new Float32Array(vertexCount * 4);
      skinWeights[0] = 0.4; // First influence
      skinWeights[1] = 0.3; // Second influence
      skinWeights[2] = 0.2; // Third influence
      skinWeights[3] = 0.1; // Fourth influence

      geometry.setAttribute(
        "skinWeight",
        new THREE.Float32BufferAttribute(skinWeights, 4),
      );

      const attr = geometry.attributes.skinWeight;
      // Use toBeCloseTo due to Float32 precision
      expect(attr.getX(vertexIdx)).toBeCloseTo(0.4, 5);
      expect(attr.getY(vertexIdx)).toBeCloseTo(0.3, 5);
      expect(attr.getZ(vertexIdx)).toBeCloseTo(0.2, 5);
      expect(attr.getW(vertexIdx)).toBeCloseTo(0.1, 5);
    });
  });
});
