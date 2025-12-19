/**
 * Tests for Meshy Pipeline Functions
 * - image-to-3d.ts: startImageTo3D
 * - text-to-3d.ts: startTextTo3DPreview, startTextTo3DRefine, pollTextTo3DStatus, startTextTo3D
 * - poll-task.ts: MeshyTaskError, pollTaskStatus
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Mocks using vi.hoisted()
// ============================================================================

const {
  mockCreateImageTo3DTask,
  mockCreateTextTo3DPreviewTask,
  mockCreateTextTo3DRefineTask,
  mockGetTaskStatusV1,
  mockGetTaskStatusV2,
} = vi.hoisted(() => ({
  mockCreateImageTo3DTask: vi.fn(),
  mockCreateTextTo3DPreviewTask: vi.fn(),
  mockCreateTextTo3DRefineTask: vi.fn(),
  mockGetTaskStatusV1: vi.fn(),
  mockGetTaskStatusV2: vi.fn(),
}));

vi.mock("../client", () => ({
  createImageTo3DTask: mockCreateImageTo3DTask,
  createTextTo3DPreviewTask: mockCreateTextTo3DPreviewTask,
  createTextTo3DRefineTask: mockCreateTextTo3DRefineTask,
  getTaskStatusV1: mockGetTaskStatusV1,
  getTaskStatusV2: mockGetTaskStatusV2,
}));

// ============================================================================
// Import modules under test (after mocks)
// ============================================================================

import { startImageTo3D } from "../image-to-3d";
import {
  startTextTo3DPreview,
  startTextTo3DRefine,
  pollTextTo3DStatus,
  startTextTo3D,
} from "../text-to-3d";
import { pollTaskStatus, MeshyTaskError } from "../poll-task";
import type { MeshyTask } from "../types";

// ============================================================================
// Test Helpers
// ============================================================================

function createMockTask(overrides: Partial<MeshyTask> = {}): MeshyTask {
  return {
    id: "test-task-id",
    status: "PENDING",
    ...overrides,
  };
}

function createSucceededTask(modelUrl: string): MeshyTask {
  return createMockTask({
    status: "SUCCEEDED",
    progress: 100,
    model_urls: { glb: modelUrl },
    thumbnail_url: "https://example.com/thumbnail.png",
  });
}

function createFailedTask(errorMessage: string): MeshyTask {
  return createMockTask({
    status: "FAILED",
    task_error: { message: errorMessage },
  });
}

// ============================================================================
// image-to-3d.ts Tests
// ============================================================================

describe("image-to-3d", () => {
  beforeEach(() => {
    mockCreateImageTo3DTask.mockReset();
  });

  describe("startImageTo3D", () => {
    it("should create image-to-3d task with default options", async () => {
      const imageUrl = "https://example.com/image.png";
      mockCreateImageTo3DTask.mockResolvedValueOnce("task-123");

      const result = await startImageTo3D(imageUrl);

      expect(result).toEqual({ taskId: "task-123" });
      expect(mockCreateImageTo3DTask).toHaveBeenCalledWith({
        image_url: imageUrl,
        enable_pbr: true,
        ai_model: "meshy-4",
        topology: "triangle",
        target_polycount: 2000,
        texture_resolution: 2048,
        should_remesh: undefined,
        should_texture: undefined,
      });
    });

    it("should create image-to-3d task with custom options", async () => {
      const imageUrl = "https://example.com/image.png";
      mockCreateImageTo3DTask.mockResolvedValueOnce("task-456");

      const result = await startImageTo3D(imageUrl, {
        enable_pbr: false,
        ai_model: "meshy-6",
        topology: "quad",
        target_polycount: 5000,
        texture_resolution: 1024,
        should_remesh: true,
        should_texture: false,
      });

      expect(result).toEqual({ taskId: "task-456" });
      expect(mockCreateImageTo3DTask).toHaveBeenCalledWith({
        image_url: imageUrl,
        enable_pbr: false,
        ai_model: "meshy-6",
        topology: "quad",
        target_polycount: 5000,
        texture_resolution: 1024,
        should_remesh: true,
        should_texture: false,
      });
    });

    it("should throw error when task creation fails", async () => {
      mockCreateImageTo3DTask.mockResolvedValueOnce("");

      await expect(
        startImageTo3D("https://example.com/image.png"),
      ).rejects.toThrow("Failed to create image-to-3d task");
    });

    it("should propagate API errors", async () => {
      mockCreateImageTo3DTask.mockRejectedValueOnce(
        new Error("API rate limit exceeded"),
      );

      await expect(
        startImageTo3D("https://example.com/image.png"),
      ).rejects.toThrow("API rate limit exceeded");
    });
  });
});

// ============================================================================
// text-to-3d.ts Tests
// ============================================================================

describe("text-to-3d", () => {
  beforeEach(() => {
    mockCreateTextTo3DPreviewTask.mockReset();
    mockCreateTextTo3DRefineTask.mockReset();
    mockGetTaskStatusV2.mockReset();
  });

  describe("startTextTo3DPreview", () => {
    it("should create preview task with default options", async () => {
      const prompt = "A medieval sword";
      mockCreateTextTo3DPreviewTask.mockResolvedValueOnce("preview-task-123");

      const result = await startTextTo3DPreview(prompt);

      expect(result).toEqual({ previewTaskId: "preview-task-123" });
      expect(mockCreateTextTo3DPreviewTask).toHaveBeenCalledWith({
        prompt,
        art_style: "realistic",
        ai_model: "latest",
        topology: "triangle",
        target_polycount: 2000,
        should_remesh: true,
        symmetry_mode: "auto",
        pose_mode: "",
        seed: undefined,
        moderation: false,
      });
    });

    it("should create preview task with custom options", async () => {
      const prompt = "A fantasy character";
      mockCreateTextTo3DPreviewTask.mockResolvedValueOnce("preview-task-456");

      const result = await startTextTo3DPreview(prompt, {
        art_style: "sculpture",
        ai_model: "meshy-5",
        topology: "quad",
        target_polycount: 10000,
        should_remesh: false,
        symmetry_mode: "on",
        pose_mode: "a-pose",
        seed: 42,
        moderation: true,
      });

      expect(result).toEqual({ previewTaskId: "preview-task-456" });
      expect(mockCreateTextTo3DPreviewTask).toHaveBeenCalledWith({
        prompt,
        art_style: "sculpture",
        ai_model: "meshy-5",
        topology: "quad",
        target_polycount: 10000,
        should_remesh: false,
        symmetry_mode: "on",
        pose_mode: "a-pose",
        seed: 42,
        moderation: true,
      });
    });

    it("should throw error when preview task creation fails", async () => {
      mockCreateTextTo3DPreviewTask.mockResolvedValueOnce("");

      await expect(startTextTo3DPreview("A test prompt")).rejects.toThrow(
        "Failed to create preview task",
      );
    });
  });

  describe("startTextTo3DRefine", () => {
    it("should create refine task with default options", async () => {
      const previewTaskId = "preview-task-123";
      mockCreateTextTo3DRefineTask.mockResolvedValueOnce("refine-task-789");

      const result = await startTextTo3DRefine(previewTaskId);

      expect(result).toEqual({ refineTaskId: "refine-task-789" });
      expect(mockCreateTextTo3DRefineTask).toHaveBeenCalledWith(previewTaskId, {
        prompt: "",
        enable_pbr: true,
        texture_prompt: undefined,
        texture_image_url: undefined,
        ai_model: undefined,
      });
    });

    it("should create refine task with custom options", async () => {
      const previewTaskId = "preview-task-123";
      mockCreateTextTo3DRefineTask.mockResolvedValueOnce("refine-task-101");

      const result = await startTextTo3DRefine(previewTaskId, {
        enable_pbr: false,
        texture_prompt: "Rusty metal texture",
        texture_image_url: "https://example.com/texture.png",
        ai_model: "meshy-6",
      });

      expect(result).toEqual({ refineTaskId: "refine-task-101" });
      expect(mockCreateTextTo3DRefineTask).toHaveBeenCalledWith(previewTaskId, {
        prompt: "",
        enable_pbr: false,
        texture_prompt: "Rusty metal texture",
        texture_image_url: "https://example.com/texture.png",
        ai_model: "meshy-6",
      });
    });

    it("should throw error when refine task creation fails", async () => {
      mockCreateTextTo3DRefineTask.mockResolvedValueOnce("");

      await expect(startTextTo3DRefine("preview-task-123")).rejects.toThrow(
        "Failed to create refine task",
      );
    });
  });

  describe("pollTextTo3DStatus", () => {
    it("should return result when task succeeds immediately", async () => {
      mockGetTaskStatusV2.mockResolvedValueOnce(
        createSucceededTask("https://example.com/model.glb"),
      );

      const result = await pollTextTo3DStatus("task-123");

      expect(result).toEqual({
        taskId: "test-task-id",
        modelUrl: "https://example.com/model.glb",
        thumbnailUrl: "https://example.com/thumbnail.png",
        status: "SUCCEEDED",
      });
    });

    it("should throw error when task fails", async () => {
      mockGetTaskStatusV2.mockResolvedValueOnce(
        createFailedTask("Generation failed"),
      );

      await expect(pollTextTo3DStatus("task-123")).rejects.toThrow(
        "Generation failed",
      );
    });

    it("should throw error when task is canceled", async () => {
      mockGetTaskStatusV2.mockResolvedValueOnce(
        createMockTask({ status: "CANCELED" }),
      );

      await expect(pollTextTo3DStatus("task-123")).rejects.toThrow(
        "Task was canceled",
      );
    });

    it("should throw error when model URL is missing on success", async () => {
      mockGetTaskStatusV2.mockResolvedValueOnce(
        createMockTask({ status: "SUCCEEDED", model_urls: {} }),
      );

      await expect(pollTextTo3DStatus("task-123")).rejects.toThrow(
        "Task completed but no model URL",
      );
    });

    it("should use legacy error field if task_error is missing", async () => {
      mockGetTaskStatusV2.mockResolvedValueOnce(
        createMockTask({ status: "FAILED", error: "Legacy error message" }),
      );

      await expect(pollTextTo3DStatus("task-123")).rejects.toThrow(
        "Legacy error message",
      );
    });

    it("should use fallback model_url if model_urls.glb is missing", async () => {
      mockGetTaskStatusV2.mockResolvedValueOnce(
        createMockTask({
          status: "SUCCEEDED",
          model_url: "https://example.com/legacy-model.glb",
          progress: 100,
        }),
      );

      const result = await pollTextTo3DStatus("task-123");

      expect(result.modelUrl).toBe("https://example.com/legacy-model.glb");
    });
  });

  describe("startTextTo3D", () => {
    it("should throw when preview task fails", async () => {
      mockCreateTextTo3DPreviewTask.mockResolvedValueOnce("preview-task-123");
      mockGetTaskStatusV2.mockResolvedValueOnce(
        createFailedTask("Preview generation failed"),
      );

      await expect(startTextTo3D("A sword")).rejects.toThrow(
        "Preview generation failed",
      );
    });
  });
});

// ============================================================================
// poll-task.ts Tests
// ============================================================================

describe("poll-task", () => {
  beforeEach(() => {
    mockGetTaskStatusV2.mockReset();
    mockGetTaskStatusV1.mockReset();
  });

  describe("MeshyTaskError", () => {
    it("should create error with FAILED status", () => {
      const error = new MeshyTaskError("Task failed", "FAILED", "task-123");

      expect(error.message).toBe("Task failed");
      expect(error.status).toBe("FAILED");
      expect(error.taskId).toBe("task-123");
      expect(error.name).toBe("MeshyTaskError");
    });

    it("should create error with CANCELED status", () => {
      const error = new MeshyTaskError("Task canceled", "CANCELED");

      expect(error.message).toBe("Task canceled");
      expect(error.status).toBe("CANCELED");
      expect(error.taskId).toBeUndefined();
    });

    it("should be instanceof Error", () => {
      const error = new MeshyTaskError("Test", "FAILED");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(MeshyTaskError);
    });
  });

  describe("pollTaskStatus", () => {
    it("should return result when task succeeds on first poll (v2)", async () => {
      mockGetTaskStatusV2.mockResolvedValueOnce(
        createSucceededTask("https://example.com/model.glb"),
      );

      const result = await pollTaskStatus("task-123");

      expect(result).toEqual({
        taskId: "test-task-id",
        modelUrl: "https://example.com/model.glb",
        thumbnailUrl: "https://example.com/thumbnail.png",
        textureUrls: undefined,
        status: "SUCCEEDED",
      });
      expect(mockGetTaskStatusV2).toHaveBeenCalledWith("task-123");
    });

    it("should fallback to v1 when v2 fails", async () => {
      mockGetTaskStatusV2.mockRejectedValueOnce(new Error("V2 API error"));
      mockGetTaskStatusV1.mockResolvedValueOnce(
        createSucceededTask("https://example.com/v1-model.glb"),
      );

      const result = await pollTaskStatus("task-123");

      expect(result.modelUrl).toBe("https://example.com/v1-model.glb");
      expect(mockGetTaskStatusV1).toHaveBeenCalledWith(
        "task-123",
        "image-to-3d",
      );
    });

    it("should throw MeshyTaskError on task failure", async () => {
      mockGetTaskStatusV2.mockResolvedValueOnce(
        createFailedTask("Generation failed"),
      );

      await expect(pollTaskStatus("task-123")).rejects.toThrow(MeshyTaskError);
    });

    it("should throw MeshyTaskError with correct properties on failure", async () => {
      mockGetTaskStatusV2.mockResolvedValueOnce(
        createFailedTask("Generation failed"),
      );

      try {
        await pollTaskStatus("task-123");
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(MeshyTaskError);
        const meshyError = error as MeshyTaskError;
        expect(meshyError.message).toBe("Generation failed");
        expect(meshyError.status).toBe("FAILED");
        expect(meshyError.taskId).toBe("task-123");
      }
    });

    it("should throw MeshyTaskError on task cancellation", async () => {
      mockGetTaskStatusV2.mockResolvedValueOnce(
        createMockTask({ status: "CANCELED" }),
      );

      await expect(pollTaskStatus("task-123")).rejects.toThrow(MeshyTaskError);
    });

    it("should include texture_urls in result when present", async () => {
      mockGetTaskStatusV2.mockResolvedValueOnce(
        createMockTask({
          status: "SUCCEEDED",
          progress: 100,
          model_urls: { glb: "https://example.com/model.glb" },
          texture_urls: [
            {
              base_color: "https://example.com/base.png",
              normal: "https://example.com/normal.png",
              metallic: "https://example.com/metallic.png",
              roughness: "https://example.com/roughness.png",
            },
          ],
        }),
      );

      const result = await pollTaskStatus("task-123");

      expect(result.textureUrls).toEqual([
        {
          base_color: "https://example.com/base.png",
          normal: "https://example.com/normal.png",
          metallic: "https://example.com/metallic.png",
          roughness: "https://example.com/roughness.png",
        },
      ]);
    });

    it("should use legacy model_url when model_urls.glb is missing", async () => {
      mockGetTaskStatusV2.mockResolvedValueOnce(
        createMockTask({
          status: "SUCCEEDED",
          model_url: "https://example.com/legacy.glb",
        }),
      );

      const result = await pollTaskStatus("task-123");

      expect(result.modelUrl).toBe("https://example.com/legacy.glb");
    });

    it("should use taskId from response when available", async () => {
      mockGetTaskStatusV2.mockResolvedValueOnce({
        ...createSucceededTask("https://example.com/model.glb"),
        id: "response-task-id",
      });

      const result = await pollTaskStatus("task-123");

      expect(result.taskId).toBe("response-task-id");
    });

    it("should fallback to input taskId when response id is missing", async () => {
      mockGetTaskStatusV2.mockResolvedValueOnce({
        status: "SUCCEEDED" as const,
        progress: 100,
        model_urls: { glb: "https://example.com/model.glb" },
      });

      const result = await pollTaskStatus("input-task-id");

      expect(result.taskId).toBe("input-task-id");
    });
  });
});
