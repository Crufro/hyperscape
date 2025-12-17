/**
 * Supabase Storage Integration Tests
 *
 * Tests REAL Supabase storage operations - NO MOCKS.
 * Uses the actual Supabase bucket configured in .env
 *
 * Required env vars:
 * - SUPABASE_URL
 * - SUPABASE_SECRET_KEY or SUPABASE_PUBLISHABLE_KEY
 */

import { describe, it, expect, afterAll } from "vitest";
import {
  BUCKET_NAMES,
  isSupabaseConfigured,
  getSupabasePublicUrl,
  uploadReferenceImage,
  uploadConceptArt,
  deleteFile,
  listFiles,
} from "../supabase-storage";

// Track files we create so we can clean them up
const createdFiles: Array<{ bucket: string; path: string }> = [];

describe("Supabase Storage - Real Integration", () => {
  afterAll(async () => {
    // Clean up any files we created during tests
    for (const file of createdFiles) {
      try {
        await deleteFile(file.bucket, file.path);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe("Configuration", () => {
    it("Supabase is configured with env vars", () => {
      expect(isSupabaseConfigured()).toBe(true);
    });

    it("BUCKET_NAMES are defined", () => {
      expect(BUCKET_NAMES).toBeDefined();
      expect(BUCKET_NAMES.IMAGE_GENERATION).toBe("image-generation");
      expect(BUCKET_NAMES.AUDIO_GENERATIONS).toBe("audio-generations");
      expect(BUCKET_NAMES.CONTENT_GENERATIONS).toBe("content-generations");
      expect(BUCKET_NAMES.MESHY_MODELS).toBe("meshy-models");
      expect(BUCKET_NAMES.VRM_CONVERSION).toBe("vrm-conversion");
    });

    it("getSupabasePublicUrl builds correct URLs", () => {
      const url = getSupabasePublicUrl("image-generation", "test/image.png");

      expect(url).toContain("supabase.co");
      expect(url).toContain("/storage/v1/object/public/");
      expect(url).toContain("image-generation");
      expect(url).toContain("test/image.png");
    });
  });

  describe("List Operations", () => {
    it("can list files in image-generation bucket", async () => {
      const result = await listFiles(BUCKET_NAMES.IMAGE_GENERATION, "");

      expect(Array.isArray(result)).toBe(true);
    });

    it("can list files in audio-generations bucket", async () => {
      const result = await listFiles(BUCKET_NAMES.AUDIO_GENERATIONS, "");

      expect(Array.isArray(result)).toBe(true);
    });

    it("can list files in content-generations bucket", async () => {
      const result = await listFiles(BUCKET_NAMES.CONTENT_GENERATIONS, "");

      expect(Array.isArray(result)).toBe(true);
    });

    it("can list files in meshy-models bucket", async () => {
      const result = await listFiles(BUCKET_NAMES.MESHY_MODELS, "");

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Upload and Delete Operations", () => {
    it("can upload and delete a reference image", async () => {
      // Create a small test image (1x1 PNG)
      const pngHeader = new Uint8Array([
        0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a, // PNG signature
        0x00,
        0x00,
        0x00,
        0x0d,
        0x49,
        0x48,
        0x44,
        0x52, // IHDR chunk
        0x00,
        0x00,
        0x00,
        0x01,
        0x00,
        0x00,
        0x00,
        0x01, // 1x1 dimensions
        0x08,
        0x02,
        0x00,
        0x00,
        0x00,
        0x90,
        0x77,
        0x53, // 8-bit RGB
        0xde,
        0x00,
        0x00,
        0x00,
        0x0c,
        0x49,
        0x44,
        0x41, // IDAT chunk
        0x54,
        0x08,
        0xd7,
        0x63,
        0xf8,
        0xff,
        0xff,
        0x3f,
        0x00,
        0x05,
        0xfe,
        0x02,
        0xfe,
        0xdc,
        0xcc,
        0x59,
        0xe7,
        0x00,
        0x00,
        0x00,
        0x00,
        0x49,
        0x45,
        0x4e, // IEND chunk
        0x44,
        0xae,
        0x42,
        0x60,
        0x82,
      ]);
      const testBuffer = Buffer.from(pngHeader);

      // Upload - returns UploadResult { success, url, path }
      const testFilename = `test-integration-${Date.now()}.png`;
      const result = await uploadReferenceImage(testBuffer, testFilename);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(typeof result.url).toBe("string");
      expect(result.url).toContain("supabase.co");
      expect(result.path).toContain("reference-images");

      // Track for cleanup
      createdFiles.push({
        bucket: BUCKET_NAMES.IMAGE_GENERATION,
        path: result.path,
      });

      // Delete
      await deleteFile(BUCKET_NAMES.IMAGE_GENERATION, result.path);

      // Remove from cleanup list since we already deleted
      createdFiles.pop();
    });

    it("can upload and delete concept art", async () => {
      // Create a small test image
      const pngHeader = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
        0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
        0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      const testBuffer = Buffer.from(pngHeader);

      // Upload - uploadConceptArt(buffer, contentType) - generates its own filename
      const result = await uploadConceptArt(testBuffer, "image/png");

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(typeof result.url).toBe("string");
      expect(result.path).toContain("concept-art");

      // Clean up
      await deleteFile(BUCKET_NAMES.IMAGE_GENERATION, result.path);
    });
  });

  describe("Error Handling", () => {
    it("listFiles returns empty array for non-existent folder", async () => {
      const result = await listFiles(
        BUCKET_NAMES.IMAGE_GENERATION,
        "definitely-not-a-real-folder-xyz123",
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("deleteFile handles non-existent file gracefully", async () => {
      // Should not throw
      await deleteFile(
        BUCKET_NAMES.IMAGE_GENERATION,
        "non-existent-file-xyz123.png",
      );
    });
  });
});
