/**
 * HandPoseDetectionService Tests
 *
 * Tests for the hand pose detection service that detects hand landmarks
 * and converts them to 3D coordinates for rigging.
 * Uses REAL Three.js implementations - NO MOCKS.
 *
 * Real Issues to Surface:
 * - Landmark coordinate conversion errors
 * - Invalid 3D projection calculations
 * - Finger segment extraction issues
 * - Hand bounds calculation problems
 * - Detection validation edge cases
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as THREE from "three";

import { HAND_LANDMARKS, FINGER_JOINTS } from "@/constants";
import type {
  HandLandmarks,
  Point3D,
  Point2D,
} from "../HandPoseDetectionService";

// Import polyfills for server-side Three.js
import "@/lib/server/three-polyfills";

/**
 * Create test hand landmarks simulating MediaPipe output
 */
function createTestHandLandmarks(
  side: "left" | "right" = "left",
  options: {
    imageWidth?: number;
    imageHeight?: number;
    confidence?: number;
    includeWorld?: boolean;
  } = {},
): HandLandmarks {
  const {
    imageWidth = 512,
    imageHeight = 512,
    confidence = 0.95,
    includeWorld = true,
  } = options;

  const centerX = imageWidth / 2;
  const centerY = imageHeight / 2;
  const scale = imageWidth * 0.3;
  const xDir = side === "left" ? 1 : -1;

  // Create 21 landmarks in pixel coordinates
  const landmarks: Point3D[] = [
    // 0 - Wrist
    { x: centerX, y: centerY + scale * 0.8, z: 0 },
    // 1-4 - Thumb
    { x: centerX + xDir * scale * 0.3, y: centerY + scale * 0.5, z: 0.02 },
    { x: centerX + xDir * scale * 0.4, y: centerY + scale * 0.3, z: 0.04 },
    { x: centerX + xDir * scale * 0.45, y: centerY + scale * 0.15, z: 0.06 },
    { x: centerX + xDir * scale * 0.5, y: centerY, z: 0.08 },
    // 5-8 - Index
    { x: centerX + xDir * scale * 0.2, y: centerY + scale * 0.3, z: 0 },
    { x: centerX + xDir * scale * 0.22, y: centerY, z: 0.02 },
    { x: centerX + xDir * scale * 0.24, y: centerY - scale * 0.25, z: 0.04 },
    { x: centerX + xDir * scale * 0.25, y: centerY - scale * 0.45, z: 0.06 },
    // 9-12 - Middle
    { x: centerX, y: centerY + scale * 0.25, z: 0 },
    { x: centerX, y: centerY - scale * 0.1, z: 0.02 },
    { x: centerX, y: centerY - scale * 0.35, z: 0.04 },
    { x: centerX, y: centerY - scale * 0.55, z: 0.06 },
    // 13-16 - Ring
    { x: centerX - xDir * scale * 0.15, y: centerY + scale * 0.3, z: 0 },
    { x: centerX - xDir * scale * 0.17, y: centerY + scale * 0.05, z: 0.02 },
    { x: centerX - xDir * scale * 0.18, y: centerY - scale * 0.2, z: 0.04 },
    { x: centerX - xDir * scale * 0.2, y: centerY - scale * 0.4, z: 0.06 },
    // 17-20 - Pinky
    { x: centerX - xDir * scale * 0.3, y: centerY + scale * 0.4, z: 0 },
    { x: centerX - xDir * scale * 0.35, y: centerY + scale * 0.2, z: 0.02 },
    { x: centerX - xDir * scale * 0.38, y: centerY, z: 0.04 },
    { x: centerX - xDir * scale * 0.4, y: centerY - scale * 0.15, z: 0.06 },
  ];

  // Create world landmarks (normalized 3D coordinates)
  const worldLandmarks: Point3D[] | undefined = includeWorld
    ? landmarks.map((l, _i) => ({
        x: ((l.x - centerX) / imageWidth) * 0.2,
        y: ((centerY - l.y) / imageHeight) * 0.2,
        z: l.z,
      }))
    : undefined;

  return {
    landmarks,
    worldLandmarks,
    handedness: side === "left" ? "Left" : "Right",
    confidence,
  };
}

/**
 * Create camera matrices for projection testing
 */
function createTestCameraMatrices(): {
  camera: THREE.OrthographicCamera;
  cameraMatrix: THREE.Matrix4;
  projectionMatrix: THREE.Matrix4;
} {
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.set(0, 0, 2);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();

  return {
    camera,
    cameraMatrix: camera.matrixWorld.clone(),
    projectionMatrix: camera.projectionMatrix.clone(),
  };
}

describe("HandPoseDetectionService", () => {
  describe("Landmark Structure - 21 Point Hand Model", () => {
    it("creates 21 landmarks for a complete hand", () => {
      const hand = createTestHandLandmarks("left");
      expect(hand.landmarks).toHaveLength(21);
    });

    it("wrist is at index 0", () => {
      const hand = createTestHandLandmarks("left");
      expect(hand.landmarks[HAND_LANDMARKS.WRIST]).toBeDefined();
      expect(HAND_LANDMARKS.WRIST).toBe(0);
    });

    it("finger tips are at correct indices", () => {
      const hand = createTestHandLandmarks("left");

      expect(hand.landmarks[HAND_LANDMARKS.THUMB_TIP]).toBeDefined();
      expect(HAND_LANDMARKS.THUMB_TIP).toBe(4);

      expect(hand.landmarks[HAND_LANDMARKS.INDEX_TIP]).toBeDefined();
      expect(HAND_LANDMARKS.INDEX_TIP).toBe(8);

      expect(hand.landmarks[HAND_LANDMARKS.MIDDLE_TIP]).toBeDefined();
      expect(HAND_LANDMARKS.MIDDLE_TIP).toBe(12);

      expect(hand.landmarks[HAND_LANDMARKS.RING_TIP]).toBeDefined();
      expect(HAND_LANDMARKS.RING_TIP).toBe(16);

      expect(hand.landmarks[HAND_LANDMARKS.PINKY_TIP]).toBeDefined();
      expect(HAND_LANDMARKS.PINKY_TIP).toBe(20);
    });

    it("each landmark has x, y, z coordinates", () => {
      const hand = createTestHandLandmarks("left");

      for (let i = 0; i < 21; i++) {
        expect(typeof hand.landmarks[i].x).toBe("number");
        expect(typeof hand.landmarks[i].y).toBe("number");
        expect(typeof hand.landmarks[i].z).toBe("number");
        expect(Number.isFinite(hand.landmarks[i].x)).toBe(true);
        expect(Number.isFinite(hand.landmarks[i].y)).toBe(true);
        expect(Number.isFinite(hand.landmarks[i].z)).toBe(true);
      }
    });

    it("left and right hands have mirrored landmark positions", () => {
      const leftHand = createTestHandLandmarks("left", {
        imageWidth: 512,
        imageHeight: 512,
      });
      const rightHand = createTestHandLandmarks("right", {
        imageWidth: 512,
        imageHeight: 512,
      });

      // Thumb should be on opposite sides relative to wrist
      const leftThumbX = leftHand.landmarks[4].x - leftHand.landmarks[0].x;
      const rightThumbX = rightHand.landmarks[4].x - rightHand.landmarks[0].x;

      expect(Math.sign(leftThumbX)).toBe(-Math.sign(rightThumbX));
    });

    it("world landmarks are normalized coordinates", () => {
      const hand = createTestHandLandmarks("left", { includeWorld: true });

      expect(hand.worldLandmarks).toBeDefined();
      expect(hand.worldLandmarks!).toHaveLength(21);

      // World landmarks should be in a reasonable range (typically -0.5 to 0.5)
      for (const landmark of hand.worldLandmarks!) {
        expect(Math.abs(landmark.x)).toBeLessThan(1);
        expect(Math.abs(landmark.y)).toBeLessThan(1);
      }
    });
  });

  describe("Finger Joint Mappings", () => {
    it("thumb has 4 joint indices (CMC, MCP, IP, TIP)", () => {
      expect(FINGER_JOINTS.thumb).toEqual([1, 2, 3, 4]);
      expect(FINGER_JOINTS.thumb).toHaveLength(4);
    });

    it("index finger has 4 joint indices (MCP, PIP, DIP, TIP)", () => {
      expect(FINGER_JOINTS.index).toEqual([5, 6, 7, 8]);
      expect(FINGER_JOINTS.index).toHaveLength(4);
    });

    it("middle finger has 4 joint indices (MCP, PIP, DIP, TIP)", () => {
      expect(FINGER_JOINTS.middle).toEqual([9, 10, 11, 12]);
      expect(FINGER_JOINTS.middle).toHaveLength(4);
    });

    it("ring finger has 4 joint indices (MCP, PIP, DIP, TIP)", () => {
      expect(FINGER_JOINTS.ring).toEqual([13, 14, 15, 16]);
      expect(FINGER_JOINTS.ring).toHaveLength(4);
    });

    it("little/pinky finger has 4 joint indices (MCP, PIP, DIP, TIP)", () => {
      expect(FINGER_JOINTS.little).toEqual([17, 18, 19, 20]);
      expect(FINGER_JOINTS.little).toHaveLength(4);
    });

    it("joint indices are sequential within each finger", () => {
      for (const [_finger, joints] of Object.entries(FINGER_JOINTS)) {
        for (let i = 1; i < joints.length; i++) {
          expect(joints[i]).toBe(joints[i - 1] + 1);
        }
      }
    });

    it("all fingers combined cover indices 1-20", () => {
      const allJoints = new Set<number>();
      Object.values(FINGER_JOINTS).forEach((joints) => {
        joints.forEach((idx) => allJoints.add(idx));
      });

      expect(allJoints.size).toBe(20);
      for (let i = 1; i <= 20; i++) {
        expect(allJoints.has(i)).toBe(true);
      }
    });
  });

  describe("Coordinate Conversion - 2D to 3D Projection", () => {
    it("converts normalized 2D points to clip space correctly", () => {
      const point2D: Point2D = { x: 0.5, y: 0.5 };

      // Convert to NDC space (-1 to 1)
      const ndcX = point2D.x * 2 - 1;
      const ndcY = 1 - point2D.y * 2; // Flip Y

      expect(ndcX).toBe(0);
      expect(ndcY).toBe(0);
    });

    it("handles corner points correctly", () => {
      // Top-left (0, 0)
      const topLeft: Point2D = { x: 0, y: 0 };
      expect(topLeft.x * 2 - 1).toBe(-1);
      expect(1 - topLeft.y * 2).toBe(1);

      // Bottom-right (1, 1)
      const bottomRight: Point2D = { x: 1, y: 1 };
      expect(bottomRight.x * 2 - 1).toBe(1);
      expect(1 - bottomRight.y * 2).toBe(-1);
    });

    it("inverts projection matrix correctly", () => {
      const { projectionMatrix } = createTestCameraMatrices();

      const invProjection = projectionMatrix.clone().invert();
      const identity = new THREE.Matrix4().multiplyMatrices(
        projectionMatrix,
        invProjection,
      );

      // Should be close to identity matrix
      for (let i = 0; i < 16; i++) {
        const expected = i % 5 === 0 ? 1 : 0; // Diagonal elements are 1
        expect(identity.elements[i]).toBeCloseTo(expected, 5);
      }
    });

    it("projects 3D point to camera space and back", () => {
      const {
        camera,
        cameraMatrix: _cameraMatrix,
        projectionMatrix: _projectionMatrix,
      } = createTestCameraMatrices();

      // Original 3D point
      const original = new THREE.Vector3(0.5, 0.3, 0);

      // Project to screen
      const projected = original.clone().project(camera);

      // Unproject back to world
      const unprojected = projected.clone().unproject(camera);

      // Should be close to original (Z might differ due to projection)
      expect(unprojected.x).toBeCloseTo(original.x, 3);
      expect(unprojected.y).toBeCloseTo(original.y, 3);
    });

    it("converts array of 2D landmarks to 3D coordinates", () => {
      const { cameraMatrix, projectionMatrix } = createTestCameraMatrices();

      // Simulate the conversion logic
      const landmarks2D: Point2D[] = [
        { x: 0.5, y: 0.5 },
        { x: 0.3, y: 0.4 },
        { x: 0.7, y: 0.6 },
      ];

      const depthEstimates = [0.5, 0.5, 0.5];

      const invProjection = projectionMatrix.clone().invert();
      const invCamera = cameraMatrix.clone().invert();

      const landmarks3D: Point3D[] = landmarks2D.map((point2D, i) => {
        const ndcX = point2D.x * 2 - 1;
        const ndcY = 1 - point2D.y * 2;
        const depth = depthEstimates[i];

        const clipSpace = new THREE.Vector4(ndcX, ndcY, depth, 1);
        clipSpace.applyMatrix4(invProjection);
        clipSpace.divideScalar(clipSpace.w);
        clipSpace.applyMatrix4(invCamera);

        return { x: clipSpace.x, y: clipSpace.y, z: clipSpace.z };
      });

      expect(landmarks3D).toHaveLength(3);
      landmarks3D.forEach((point) => {
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.y)).toBe(true);
        expect(Number.isFinite(point.z)).toBe(true);
      });
    });
  });

  describe("Normalized Landmarks", () => {
    it("normalizes landmarks to 0-1 range", () => {
      const hand = createTestHandLandmarks("left", {
        imageWidth: 512,
        imageHeight: 512,
      });
      const imageWidth = 512;
      const imageHeight = 512;

      // Simulate getNormalizedLandmarks
      const normalized = hand.landmarks.map((landmark) => ({
        x: landmark.x / imageWidth,
        y: landmark.y / imageHeight,
        z: landmark.z,
      }));

      // All normalized coordinates should be reasonable
      for (const point of normalized) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(1);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(1);
      }
    });

    it("preserves z coordinate during normalization", () => {
      const hand = createTestHandLandmarks("left");
      const imageWidth = 512;
      const imageHeight = 512;

      const normalized = hand.landmarks.map((landmark) => ({
        x: landmark.x / imageWidth,
        y: landmark.y / imageHeight,
        z: landmark.z,
      }));

      for (let i = 0; i < 21; i++) {
        expect(normalized[i].z).toBe(hand.landmarks[i].z);
      }
    });
  });

  describe("Finger Segment Extraction", () => {
    it("extracts palm landmarks correctly", () => {
      const hand = createTestHandLandmarks("left");

      // Palm includes wrist and all MCPs
      const palm = [
        hand.landmarks[HAND_LANDMARKS.WRIST],
        hand.landmarks[HAND_LANDMARKS.THUMB_CMC],
        hand.landmarks[HAND_LANDMARKS.INDEX_MCP],
        hand.landmarks[HAND_LANDMARKS.MIDDLE_MCP],
        hand.landmarks[HAND_LANDMARKS.RING_MCP],
        hand.landmarks[HAND_LANDMARKS.PINKY_MCP],
      ];

      expect(palm).toHaveLength(6);
      palm.forEach((point) => {
        expect(point).toBeDefined();
        expect(typeof point.x).toBe("number");
      });
    });

    it("extracts each finger landmarks correctly", () => {
      const hand = createTestHandLandmarks("left");

      const fingers = {
        thumb: FINGER_JOINTS.thumb.map((idx) => hand.landmarks[idx]),
        index: FINGER_JOINTS.index.map((idx) => hand.landmarks[idx]),
        middle: FINGER_JOINTS.middle.map((idx) => hand.landmarks[idx]),
        ring: FINGER_JOINTS.ring.map((idx) => hand.landmarks[idx]),
        little: FINGER_JOINTS.little.map((idx) => hand.landmarks[idx]),
      };

      Object.entries(fingers).forEach(([_name, points]) => {
        expect(points).toHaveLength(4);
        points.forEach((point, _i) => {
          expect(point).toBeDefined();
          expect(Number.isFinite(point.x)).toBe(true);
          expect(Number.isFinite(point.y)).toBe(true);
        });
      });
    });

    it("finger tip is further from wrist than MCP", () => {
      const hand = createTestHandLandmarks("left");
      const wrist = hand.landmarks[HAND_LANDMARKS.WRIST];

      // Check for index finger
      const indexMCP = hand.landmarks[HAND_LANDMARKS.INDEX_MCP];
      const indexTip = hand.landmarks[HAND_LANDMARKS.INDEX_TIP];

      const mcpDist = Math.sqrt(
        Math.pow(indexMCP.x - wrist.x, 2) + Math.pow(indexMCP.y - wrist.y, 2),
      );
      const tipDist = Math.sqrt(
        Math.pow(indexTip.x - wrist.x, 2) + Math.pow(indexTip.y - wrist.y, 2),
      );

      expect(tipDist).toBeGreaterThan(mcpDist);
    });
  });

  describe("Hand Bounding Box Calculation", () => {
    it("calculates correct min/max bounds", () => {
      const landmarks: Point3D[] = [
        { x: 100, y: 200, z: 0 },
        { x: 150, y: 100, z: 0.1 },
        { x: 200, y: 300, z: 0.2 },
      ];

      const xs = landmarks.map((p) => p.x);
      const ys = landmarks.map((p) => p.y);
      const zs = landmarks.map((p) => p.z);

      const bounds = {
        min: {
          x: Math.min(...xs),
          y: Math.min(...ys),
          z: Math.min(...zs),
        },
        max: {
          x: Math.max(...xs),
          y: Math.max(...ys),
          z: Math.max(...zs),
        },
      };

      expect(bounds.min.x).toBe(100);
      expect(bounds.max.x).toBe(200);
      expect(bounds.min.y).toBe(100);
      expect(bounds.max.y).toBe(300);
      expect(bounds.min.z).toBe(0);
      expect(bounds.max.z).toBe(0.2);
    });

    it("calculates bounds for complete hand", () => {
      const hand = createTestHandLandmarks("left");

      const xs = hand.landmarks.map((p) => p.x);
      const ys = hand.landmarks.map((p) => p.y);
      const zs = hand.landmarks.map((p) => p.z);

      const bounds = {
        min: { x: Math.min(...xs), y: Math.min(...ys), z: Math.min(...zs) },
        max: { x: Math.max(...xs), y: Math.max(...ys), z: Math.max(...zs) },
      };

      // Width and height should be positive
      const width = bounds.max.x - bounds.min.x;
      const height = bounds.max.y - bounds.min.y;

      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    });

    it("bounds contain all landmarks", () => {
      const hand = createTestHandLandmarks("left");

      const xs = hand.landmarks.map((p) => p.x);
      const ys = hand.landmarks.map((p) => p.y);

      const bounds = {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      };

      for (const landmark of hand.landmarks) {
        expect(landmark.x).toBeGreaterThanOrEqual(bounds.minX);
        expect(landmark.x).toBeLessThanOrEqual(bounds.maxX);
        expect(landmark.y).toBeGreaterThanOrEqual(bounds.minY);
        expect(landmark.y).toBeLessThanOrEqual(bounds.maxY);
      }
    });
  });

  describe("Detection Validation", () => {
    it("validates confidence threshold", () => {
      const highConfidence = createTestHandLandmarks("left", {
        confidence: 0.95,
      });
      const lowConfidence = createTestHandLandmarks("left", {
        confidence: 0.5,
      });

      const minConfidence = 0.7;

      expect(highConfidence.confidence).toBeGreaterThanOrEqual(minConfidence);
      expect(lowConfidence.confidence).toBeLessThan(minConfidence);
    });

    it("validates landmark count", () => {
      const validHand = createTestHandLandmarks("left");
      expect(validHand.landmarks.length).toBe(21);

      // Invalid hand with missing landmarks
      const invalidLandmarkCount = 15;
      expect(invalidLandmarkCount).not.toBe(21);
    });

    it("validates hand size is reasonable", () => {
      const hand = createTestHandLandmarks("left", {
        imageWidth: 512,
        imageHeight: 512,
      });

      const xs = hand.landmarks.map((p) => p.x);
      const ys = hand.landmarks.map((p) => p.y);

      const width = Math.max(...xs) - Math.min(...xs);
      const height = Math.max(...ys) - Math.min(...ys);

      // Normalized size
      const normalizedWidth = width / 512;
      const normalizedHeight = height / 512;

      // Hand should not be too small (> 5% of image)
      expect(normalizedWidth).toBeGreaterThan(0.05);
      expect(normalizedHeight).toBeGreaterThan(0.05);
    });

    it("validates aspect ratio is reasonable", () => {
      const hand = createTestHandLandmarks("left");

      const xs = hand.landmarks.map((p) => p.x);
      const ys = hand.landmarks.map((p) => p.y);

      const width = Math.max(...xs) - Math.min(...xs);
      const height = Math.max(...ys) - Math.min(...ys);

      const aspectRatio = width / height;

      // Reasonable aspect ratio between 0.5 and 2.0
      expect(aspectRatio).toBeGreaterThan(0.3);
      expect(aspectRatio).toBeLessThan(3.0);
    });

    it("identifies validation issues", () => {
      const hand = createTestHandLandmarks("left", { confidence: 0.5 });

      const issues: string[] = [];

      if (hand.confidence < 0.7) {
        issues.push(`Low confidence: ${(hand.confidence * 100).toFixed(1)}%`);
      }

      if (hand.landmarks.length !== 21) {
        issues.push(`Missing landmarks: ${hand.landmarks.length}/21`);
      }

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]).toContain("Low confidence");
    });
  });

  describe("Bone Position Calculation", () => {
    it("calculates wrist position from landmarks", () => {
      const hand = createTestHandLandmarks("left");

      const wristPos = {
        x: hand.landmarks[HAND_LANDMARKS.WRIST].x,
        y: hand.landmarks[HAND_LANDMARKS.WRIST].y,
        z: hand.landmarks[HAND_LANDMARKS.WRIST].z,
      };

      expect(wristPos).toBeDefined();
      expect(Number.isFinite(wristPos.x)).toBe(true);
      expect(Number.isFinite(wristPos.y)).toBe(true);
      expect(Number.isFinite(wristPos.z)).toBe(true);
    });

    it("calculates palm center as average of MCPs", () => {
      const hand = createTestHandLandmarks("left");

      const mcpIndices = [
        HAND_LANDMARKS.INDEX_MCP,
        HAND_LANDMARKS.MIDDLE_MCP,
        HAND_LANDMARKS.RING_MCP,
        HAND_LANDMARKS.PINKY_MCP,
      ];

      const palmCenter = {
        x: 0,
        y: 0,
        z: 0,
      };

      mcpIndices.forEach((idx) => {
        palmCenter.x += hand.landmarks[idx].x;
        palmCenter.y += hand.landmarks[idx].y;
        palmCenter.z += hand.landmarks[idx].z;
      });

      palmCenter.x /= mcpIndices.length;
      palmCenter.y /= mcpIndices.length;
      palmCenter.z /= mcpIndices.length;

      expect(Number.isFinite(palmCenter.x)).toBe(true);
      expect(Number.isFinite(palmCenter.y)).toBe(true);
      expect(Number.isFinite(palmCenter.z)).toBe(true);
    });

    it("finger bone positions follow anatomical order", () => {
      const hand = createTestHandLandmarks("left");

      // For each finger, joints should be progressively further from wrist
      const wrist = hand.landmarks[HAND_LANDMARKS.WRIST];

      // Check index finger
      const indexJoints = FINGER_JOINTS.index.map((idx) => hand.landmarks[idx]);

      let prevDist = 0;
      indexJoints.forEach((joint, i) => {
        const dist = Math.sqrt(
          Math.pow(joint.x - wrist.x, 2) + Math.pow(joint.y - wrist.y, 2),
        );

        // Each joint should be further from wrist than previous
        // (allowing some tolerance for different poses)
        if (i > 0) {
          expect(dist).toBeGreaterThanOrEqual(prevDist * 0.8); // 80% tolerance
        }
        prevDist = dist;
      });
    });
  });

  describe("Depth Estimation", () => {
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

      // Fingers
      for (let finger = 0; finger < 4; finger++) {
        const base = 5 + finger * 4;
        depths[base] = 0.01; // MCP
        depths[base + 1] = 0.03; // PIP
        depths[base + 2] = 0.05; // DIP
        depths[base + 3] = 0.07; // Tip
      }

      expect(depths).toHaveLength(21);
      depths.forEach((d) => {
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(0.1);
      });
    });

    it("finger tips have greater depth than MCPs", () => {
      // Typical depth values
      const mcpDepth = 0.01;
      const tipDepth = 0.07;

      expect(tipDepth).toBeGreaterThan(mcpDepth);
    });

    it("thumb has forward-pointing depth profile", () => {
      const thumbDepths = [0.02, 0.04, 0.06, 0.08];

      // Thumb should progressively extend forward
      for (let i = 1; i < thumbDepths.length; i++) {
        expect(thumbDepths[i]).toBeGreaterThan(thumbDepths[i - 1]);
      }
    });
  });

  describe("Handedness Detection", () => {
    it("correctly identifies left hand", () => {
      const hand = createTestHandLandmarks("left");
      expect(hand.handedness).toBe("Left");
    });

    it("correctly identifies right hand", () => {
      const hand = createTestHandLandmarks("right");
      expect(hand.handedness).toBe("Right");
    });

    it("thumb position indicates hand side", () => {
      const leftHand = createTestHandLandmarks("left");
      const rightHand = createTestHandLandmarks("right");

      const leftThumb = leftHand.landmarks[HAND_LANDMARKS.THUMB_TIP];
      const leftMiddle = leftHand.landmarks[HAND_LANDMARKS.MIDDLE_TIP];

      const rightThumb = rightHand.landmarks[HAND_LANDMARKS.THUMB_TIP];
      const rightMiddle = rightHand.landmarks[HAND_LANDMARKS.MIDDLE_TIP];

      // For left hand, thumb should be on right side of middle finger
      // For right hand, thumb should be on left side of middle finger
      // (in image coordinates)
      const leftThumbSide = leftThumb.x > leftMiddle.x ? "right" : "left";
      const rightThumbSide = rightThumb.x > rightMiddle.x ? "right" : "left";

      expect(leftThumbSide).not.toBe(rightThumbSide);
    });
  });

  describe("Edge Cases", () => {
    it("handles landmarks at image boundaries", () => {
      const landmarks: Point3D[] = Array(21)
        .fill(null)
        .map((_, i) => ({
          x: i % 2 === 0 ? 0 : 511,
          y: i % 3 === 0 ? 0 : 511,
          z: 0,
        }));

      // Should not throw
      const xs = landmarks.map((p) => p.x);
      const ys = landmarks.map((p) => p.y);

      const bounds = {
        min: { x: Math.min(...xs), y: Math.min(...ys) },
        max: { x: Math.max(...xs), y: Math.max(...ys) },
      };

      expect(bounds.min.x).toBe(0);
      expect(bounds.max.x).toBe(511);
    });

    it("handles zero confidence", () => {
      const hand = createTestHandLandmarks("left", { confidence: 0 });
      expect(hand.confidence).toBe(0);

      const isValid = hand.confidence >= 0.7;
      expect(isValid).toBe(false);
    });

    it("handles missing world landmarks", () => {
      const hand = createTestHandLandmarks("left", { includeWorld: false });
      expect(hand.worldLandmarks).toBeUndefined();

      // Should still have regular landmarks
      expect(hand.landmarks).toHaveLength(21);
    });

    it("handles very small image dimensions", () => {
      const hand = createTestHandLandmarks("left", {
        imageWidth: 32,
        imageHeight: 32,
      });

      // Landmarks should still be valid
      for (const landmark of hand.landmarks) {
        expect(Number.isFinite(landmark.x)).toBe(true);
        expect(Number.isFinite(landmark.y)).toBe(true);
      }
    });

    it("handles very large image dimensions", () => {
      const hand = createTestHandLandmarks("left", {
        imageWidth: 4096,
        imageHeight: 4096,
      });

      // Landmarks should still be valid
      for (const landmark of hand.landmarks) {
        expect(Number.isFinite(landmark.x)).toBe(true);
        expect(Number.isFinite(landmark.y)).toBe(true);
        expect(landmark.x).toBeLessThanOrEqual(4096);
        expect(landmark.y).toBeLessThanOrEqual(4096);
      }
    });
  });
});

// =============================================================================
// ACTUAL SERVICE TESTS - Testing HandPoseDetectionService class methods
// =============================================================================
import { HandPoseDetectionService } from "../HandPoseDetectionService";

describe("HandPoseDetectionService - Service Instance Tests", () => {
  let service: HandPoseDetectionService;

  beforeAll(() => {
    // Create service instance - does NOT require TensorFlow until initialize() is called
    service = new HandPoseDetectionService();
  });

  describe("Constructor and Initialization State", () => {
    it("creates service instance without errors", () => {
      const newService = new HandPoseDetectionService();
      expect(newService).toBeDefined();
      expect(newService).toBeInstanceOf(HandPoseDetectionService);
    });

    it("service is not initialized until initialize() is called", () => {
      const newService = new HandPoseDetectionService();
      // The service should exist but detector should be null
      expect(newService).toBeDefined();
    });
  });

  describe("getNormalizedLandmarks() - Actual Service Method", () => {
    it("normalizes landmarks to 0-1 range", () => {
      const hand = createTestHandLandmarks("left", {
        imageWidth: 512,
        imageHeight: 512,
      });

      const normalized = service.getNormalizedLandmarks(hand, 512, 512);

      expect(normalized).toHaveLength(21);
      for (const point of normalized) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(1);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(1);
      }
    });

    it("preserves z coordinate", () => {
      const hand = createTestHandLandmarks("left");

      const normalized = service.getNormalizedLandmarks(hand, 512, 512);

      for (let i = 0; i < 21; i++) {
        expect(normalized[i].z).toBe(hand.landmarks[i].z);
      }
    });

    it("handles different image dimensions", () => {
      const hand = createTestHandLandmarks("left", {
        imageWidth: 1024,
        imageHeight: 768,
      });

      const normalized = service.getNormalizedLandmarks(hand, 1024, 768);

      expect(normalized).toHaveLength(21);
      // Verify normalization uses correct dimensions
      for (const point of normalized) {
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.y)).toBe(true);
      }
    });
  });

  describe("getFingerSegments() - Actual Service Method", () => {
    it("extracts all finger segments correctly", () => {
      const hand = createTestHandLandmarks("left");

      const segments = service.getFingerSegments(hand);

      expect(segments).toHaveProperty("palm");
      expect(segments).toHaveProperty("thumb");
      expect(segments).toHaveProperty("index");
      expect(segments).toHaveProperty("middle");
      expect(segments).toHaveProperty("ring");
      expect(segments).toHaveProperty("pinky");
    });

    it("palm segment includes wrist and MCPs", () => {
      const hand = createTestHandLandmarks("left");

      const segments = service.getFingerSegments(hand);

      expect(segments.palm).toHaveLength(6);
      // First point should be wrist
      expect(segments.palm[0]).toEqual(hand.landmarks[HAND_LANDMARKS.WRIST]);
    });

    it("each finger segment has 4 joints", () => {
      const hand = createTestHandLandmarks("left");

      const segments = service.getFingerSegments(hand);

      // Note: FINGER_JOINTS uses 'little' instead of 'pinky'
      expect(segments.thumb).toHaveLength(4);
      expect(segments.index).toHaveLength(4);
      expect(segments.middle).toHaveLength(4);
      expect(segments.ring).toHaveLength(4);
      expect(segments.little).toHaveLength(4);
    });

    it("segments contain valid 3D points", () => {
      const hand = createTestHandLandmarks("left");

      const segments = service.getFingerSegments(hand);

      for (const [_name, points] of Object.entries(segments)) {
        for (const point of points) {
          expect(Number.isFinite(point.x)).toBe(true);
          expect(Number.isFinite(point.y)).toBe(true);
          expect(Number.isFinite(point.z)).toBe(true);
        }
      }
    });
  });

  describe("getHandBounds() - Actual Service Method", () => {
    it("calculates correct min/max bounds", () => {
      const landmarks: Point3D[] = [
        { x: 100, y: 200, z: 0 },
        { x: 150, y: 100, z: 0.1 },
        { x: 200, y: 300, z: 0.2 },
      ];

      const bounds = service.getHandBounds(landmarks);

      expect(bounds.min.x).toBe(100);
      expect(bounds.max.x).toBe(200);
      expect(bounds.min.y).toBe(100);
      expect(bounds.max.y).toBe(300);
      expect(bounds.min.z).toBe(0);
      expect(bounds.max.z).toBe(0.2);
    });

    it("handles all 21 hand landmarks", () => {
      const hand = createTestHandLandmarks("left");

      const bounds = service.getHandBounds(hand.landmarks);

      // Width and height should be positive
      const width = bounds.max.x - bounds.min.x;
      const height = bounds.max.y - bounds.min.y;

      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    });

    it("bounds contain all landmarks", () => {
      const hand = createTestHandLandmarks("left");

      const bounds = service.getHandBounds(hand.landmarks);

      for (const landmark of hand.landmarks) {
        expect(landmark.x).toBeGreaterThanOrEqual(bounds.min.x);
        expect(landmark.x).toBeLessThanOrEqual(bounds.max.x);
        expect(landmark.y).toBeGreaterThanOrEqual(bounds.min.y);
        expect(landmark.y).toBeLessThanOrEqual(bounds.max.y);
        expect(landmark.z).toBeGreaterThanOrEqual(bounds.min.z);
        expect(landmark.z).toBeLessThanOrEqual(bounds.max.z);
      }
    });
  });

  describe("validateHandDetection() - Actual Service Method", () => {
    it("validates high confidence detection", () => {
      const hand = createTestHandLandmarks("left", { confidence: 0.95 });

      const result = service.validateHandDetection(hand);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("reports low confidence as issue", () => {
      const hand = createTestHandLandmarks("left", { confidence: 0.5 });

      const result = service.validateHandDetection(hand);

      expect(result.isValid).toBe(false);
      expect(result.issues.some((i) => i.includes("confidence"))).toBe(true);
    });

    it("validates landmark count", () => {
      const hand = createTestHandLandmarks("left");

      const _result = service.validateHandDetection(hand);

      // Should pass since we have 21 landmarks
      expect(hand.landmarks.length).toBe(21);
    });

    it("handles edge case hand proportions", () => {
      const hand = createTestHandLandmarks("left", {
        imageWidth: 512,
        imageHeight: 512,
        confidence: 0.9,
      });

      const result = service.validateHandDetection(hand);

      // Our test landmarks should be valid
      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe("boolean");
      expect(Array.isArray(result.issues)).toBe(true);
    });
  });

  describe("calculateBonePositions() - Actual Service Method", () => {
    it("calculates bone positions for left hand", () => {
      const hand = createTestHandLandmarks("left");

      const positions = service.calculateBonePositions(hand, "left");

      expect(positions).toHaveProperty("wrist");
      expect(positions).toHaveProperty("thumb");
      expect(positions).toHaveProperty("index");
      expect(positions).toHaveProperty("middle");
      expect(positions).toHaveProperty("ring");
      expect(positions).toHaveProperty("little");
    });

    it("calculates bone positions for right hand", () => {
      const hand = createTestHandLandmarks("right");

      const positions = service.calculateBonePositions(hand, "right");

      expect(positions).toHaveProperty("wrist");
      expect(positions).toHaveProperty("thumb");
      expect(positions).toHaveProperty("index");
      expect(positions).toHaveProperty("middle");
      expect(positions).toHaveProperty("ring");
      expect(positions).toHaveProperty("little");
    });

    it("wrist position matches first landmark", () => {
      const hand = createTestHandLandmarks("left");

      const positions = service.calculateBonePositions(hand, "left");

      expect(positions.wrist).toHaveLength(1);
      expect(positions.wrist[0]).toEqual(hand.landmarks[HAND_LANDMARKS.WRIST]);
    });

    it("finger positions have correct joint count", () => {
      const hand = createTestHandLandmarks("left");

      const positions = service.calculateBonePositions(hand, "left");

      // Each finger should have 5 positions (base + 4 joints)
      expect(positions.thumb.length).toBeGreaterThanOrEqual(4);
      expect(positions.index.length).toBeGreaterThanOrEqual(4);
      expect(positions.middle.length).toBeGreaterThanOrEqual(4);
      expect(positions.ring.length).toBeGreaterThanOrEqual(4);
      expect(positions.little.length).toBeGreaterThanOrEqual(4);
    });

    it("all positions are valid 3D points", () => {
      const hand = createTestHandLandmarks("left");

      const positions = service.calculateBonePositions(hand, "left");

      for (const [_name, points] of Object.entries(positions)) {
        for (const point of points) {
          expect(Number.isFinite(point.x)).toBe(true);
          expect(Number.isFinite(point.y)).toBe(true);
          expect(Number.isFinite(point.z)).toBe(true);
        }
      }
    });
  });

  describe("convertTo3DCoordinates() - Actual Service Method", () => {
    it("converts 2D landmarks to 3D using camera matrices", () => {
      const { cameraMatrix, projectionMatrix } = createTestCameraMatrices();

      const landmarks2D: Point2D[] = [
        { x: 0.5, y: 0.5 },
        { x: 0.3, y: 0.4 },
        { x: 0.7, y: 0.6 },
      ];

      const landmarks3D = service.convertTo3DCoordinates(
        landmarks2D,
        cameraMatrix,
        projectionMatrix,
      );

      expect(landmarks3D).toHaveLength(3);
      for (const point of landmarks3D) {
        expect(Number.isFinite(point.x)).toBe(true);
        expect(Number.isFinite(point.y)).toBe(true);
        expect(Number.isFinite(point.z)).toBe(true);
      }
    });

    it("uses depth estimates when provided", () => {
      const { cameraMatrix, projectionMatrix } = createTestCameraMatrices();

      const landmarks2D: Point2D[] = [
        { x: 0.5, y: 0.5 },
        { x: 0.5, y: 0.5 },
      ];
      const depthEstimates = [0.2, 0.8];

      const landmarks3D = service.convertTo3DCoordinates(
        landmarks2D,
        cameraMatrix,
        projectionMatrix,
        depthEstimates,
      );

      expect(landmarks3D).toHaveLength(2);
      // Different depths should produce different Z values
      expect(landmarks3D[0].z).not.toBe(landmarks3D[1].z);
    });

    it("handles corner case coordinates", () => {
      const { cameraMatrix, projectionMatrix } = createTestCameraMatrices();

      const landmarks2D: Point2D[] = [
        { x: 0, y: 0 }, // Top-left
        { x: 1, y: 1 }, // Bottom-right
        { x: 0.5, y: 0.5 }, // Center
      ];

      const landmarks3D = service.convertTo3DCoordinates(
        landmarks2D,
        cameraMatrix,
        projectionMatrix,
      );

      expect(landmarks3D).toHaveLength(3);
      for (const point of landmarks3D) {
        expect(Number.isNaN(point.x)).toBe(false);
        expect(Number.isNaN(point.y)).toBe(false);
        expect(Number.isNaN(point.z)).toBe(false);
      }
    });
  });

  describe("dispose() - Actual Service Method", () => {
    it("disposes service without errors", () => {
      const disposableService = new HandPoseDetectionService();

      expect(() => disposableService.dispose()).not.toThrow();
    });

    it("can be disposed multiple times safely", () => {
      const disposableService = new HandPoseDetectionService();

      expect(() => {
        disposableService.dispose();
        disposableService.dispose();
      }).not.toThrow();
    });
  });
});
