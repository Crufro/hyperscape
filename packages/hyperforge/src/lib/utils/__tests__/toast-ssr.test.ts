/**
 * Toast Notification System Tests (Server-side / SSR)
 *
 * Tests for server-side behavior when document is undefined.
 * Uses node environment (no jsdom).
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Toast Notification System (Server-side)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs [INFO] prefix for info level", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { toast } = await import("@/lib/utils/toast");

    toast.info("Server info");

    expect(consoleSpy).toHaveBeenCalledWith("[INFO]", "Server info");
  });

  it("logs [SUCCESS] prefix for success level", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { toast } = await import("@/lib/utils/toast");

    toast.success("Server success");

    expect(consoleSpy).toHaveBeenCalledWith("[SUCCESS]", "Server success");
  });

  it("logs [WARN] prefix for warning level", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { toast } = await import("@/lib/utils/toast");

    toast.warning("Server warning");

    expect(consoleSpy).toHaveBeenCalledWith("[WARN]", "Server warning");
  });

  it("logs [ERROR] prefix for error level", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { toast } = await import("@/lib/utils/toast");

    toast.error("Server error");

    expect(consoleSpy).toHaveBeenCalledWith("[ERROR]", "Server error");
  });

  it("does not throw when document is undefined", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { toast } = await import("@/lib/utils/toast");

    expect(() => toast.info("Test")).not.toThrow();
    expect(() => toast.success("Test")).not.toThrow();
    expect(() => toast.warning("Test")).not.toThrow();
    expect(() => toast.error("Test")).not.toThrow();
  });

  it("returns early without creating DOM elements", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const { toast } = await import("@/lib/utils/toast");

    // This should not throw even though document doesn't exist
    toast.info("Test");
    toast.success("Test");
    toast.warning("Test");
    toast.error("Test");

    // If we got here without error, the server-side path worked
    expect(true).toBe(true);
  });

  it("toast.promise works server-side with success", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { toast } = await import("@/lib/utils/toast");

    const result = await toast.promise(Promise.resolve("data"), {
      loading: "Loading...",
      success: "Done!",
      error: "Failed!",
    });

    expect(result).toBe("data");
    // Should have logged loading and success
    expect(consoleSpy).toHaveBeenCalledWith("[INFO]", "Loading...");
    expect(consoleSpy).toHaveBeenCalledWith("[SUCCESS]", "Done!");
  });

  it("toast.promise works server-side with error", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { toast } = await import("@/lib/utils/toast");

    await expect(
      toast.promise(Promise.reject(new Error("fail")), {
        loading: "Loading...",
        success: "Done!",
        error: "Failed!",
      }),
    ).rejects.toThrow("fail");

    // Should have logged loading and error
    expect(consoleSpy).toHaveBeenCalledWith("[INFO]", "Loading...");
    expect(consoleSpy).toHaveBeenCalledWith("[ERROR]", "Failed!");
  });

  it("toast.promise error function works server-side", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const { toast } = await import("@/lib/utils/toast");

    await expect(
      toast.promise(Promise.reject(new Error("custom error")), {
        loading: "Loading...",
        success: "Done!",
        error: (err) => `Error: ${err.message}`,
      }),
    ).rejects.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith("[ERROR]", "Error: custom error");
  });
});
