/**
 * Toast Notification System Tests (Client-side)
 *
 * Tests for the DOM-based toast notification system.
 * Uses jsdom for real DOM manipulation testing.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { toast, notify } from "@/lib/utils/toast";

const TOAST_CONTAINER_ID = "__hyperforge_toast_container__";

/**
 * Helper to get the last toast in the container
 */
function getLastToast(): HTMLElement | null {
  const container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container || container.children.length === 0) return null;
  return container.lastChild as HTMLElement;
}

/**
 * Helper to clear all toasts and container
 */
function clearAllToasts(): void {
  const container = document.getElementById(TOAST_CONTAINER_ID);
  if (container) {
    container.remove();
  }
}

/**
 * Helper to count toasts in container
 */
function getToastCount(): number {
  const container = document.getElementById(TOAST_CONTAINER_ID);
  return container ? container.children.length : 0;
}

// Run tests sequentially to avoid DOM state conflicts
describe.sequential("Toast Notification System (Client-side)", () => {
  beforeEach(() => {
    // Clear all DOM state
    clearAllToasts();
    document.body.innerHTML = "";
    // Use fake timers
    vi.useFakeTimers();
  });

  afterEach(() => {
    clearAllToasts();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("toast API", () => {
    it("exports toast object with all expected methods", () => {
      expect(typeof toast.info).toBe("function");
      expect(typeof toast.success).toBe("function");
      expect(typeof toast.warning).toBe("function");
      expect(typeof toast.error).toBe("function");
      expect(typeof toast.promise).toBe("function");
    });

    it("exports notify as alias for toast", () => {
      expect(notify).toBe(toast);
    });
  });

  describe("toast.info", () => {
    it("creates a toast container when first called", () => {
      toast.info("Test message");

      const container = document.getElementById(TOAST_CONTAINER_ID);
      expect(container).not.toBeNull();
    });

    it("applies correct container styles", () => {
      toast.info("Test message");

      const container = document.getElementById(TOAST_CONTAINER_ID);
      expect(container).not.toBeNull();
      expect(container!.style.position).toBe("fixed");
      expect(container!.style.top).toBe("16px");
      expect(container!.style.right).toBe("16px");
      expect(container!.style.zIndex).toBe("9999");
    });

    it("creates a toast element with correct background color", () => {
      toast.info("Test message");

      const toastEl = getLastToast();
      expect(toastEl).not.toBeNull();
      expect(toastEl!.style.background).toBe("rgb(59, 130, 246)"); // blue-500
    });

    it("includes the info icon", () => {
      toast.info("Test message");

      const toastEl = getLastToast();
      const icon = toastEl!.firstChild as HTMLElement;
      expect(icon.textContent).toBe("ℹ️");
    });

    it("includes the message text", () => {
      toast.info("My info message");

      const toastEl = getLastToast();
      const children = Array.from(toastEl!.children);
      const textSpan = children[1] as HTMLElement;
      expect(textSpan.textContent).toBe("My info message");
    });

    it("includes a close button", () => {
      toast.info("Test message");

      const toastEl = getLastToast();
      const closeBtn = toastEl!.querySelector("button");
      expect(closeBtn).not.toBeNull();
      expect(closeBtn!.textContent).toBe("×");
    });
  });

  describe("toast.success", () => {
    it("creates a toast with success background color", () => {
      toast.success("Success message");

      const toastEl = getLastToast();
      expect(toastEl!.style.background).toBe("rgb(16, 185, 129)"); // emerald-500
    });

    it("includes the success icon", () => {
      toast.success("Success message");

      const toastEl = getLastToast();
      const icon = toastEl!.firstChild as HTMLElement;
      expect(icon.textContent).toBe("✓");
    });
  });

  describe("toast.warning", () => {
    it("creates a toast with warning background color", () => {
      toast.warning("Warning message");

      const toastEl = getLastToast();
      expect(toastEl!.style.background).toBe("rgb(245, 158, 11)"); // amber-500
    });

    it("includes the warning icon", () => {
      toast.warning("Warning message");

      const toastEl = getLastToast();
      const icon = toastEl!.firstChild as HTMLElement;
      expect(icon.textContent).toBe("⚠️");
    });
  });

  describe("toast.error", () => {
    it("creates a toast with error background color", () => {
      toast.error("Error message");

      const toastEl = getLastToast();
      expect(toastEl!.style.background).toBe("rgb(239, 68, 68)"); // red-500
    });

    it("includes the error icon", () => {
      toast.error("Error message");

      const toastEl = getLastToast();
      const icon = toastEl!.firstChild as HTMLElement;
      expect(icon.textContent).toBe("✕");
    });
  });

  describe("toast styles and animation", () => {
    it("starts with opacity 0 and transformed off-screen", () => {
      toast.info("Test");

      const toastEl = getLastToast();
      expect(toastEl!.style.opacity).toBe("0");
      expect(toastEl!.style.transform).toBe("translateX(100%)");
    });

    it("applies correct toast element styles", () => {
      toast.info("Test");

      const toastEl = getLastToast();

      expect(toastEl!.style.display).toBe("flex");
      expect(toastEl!.style.alignItems).toBe("center");
      expect(toastEl!.style.padding).toBe("12px 16px");
      expect(toastEl!.style.borderRadius).toBe("8px");
      expect(toastEl!.style.color).toBe("rgb(255, 255, 255)");
      expect(toastEl!.style.fontSize).toBe("14px");
      expect(toastEl!.style.maxWidth).toBe("400px");
    });

    it("applies transition styles to toast element", () => {
      toast.info("Test");

      const toastEl = getLastToast();
      expect(toastEl!.style.transition).toBe("all 200ms ease-out");
    });
  });

  describe("auto-dismiss", () => {
    it("auto-dismisses after default duration (4000ms)", async () => {
      toast.info("Test");

      expect(getToastCount()).toBe(1);

      // Advance past default duration + dismiss animation
      await vi.advanceTimersByTimeAsync(4200);

      expect(getToastCount()).toBe(0);
    });

    it("respects custom duration", async () => {
      toast.info("Test", { durationMs: 1000 });

      expect(getToastCount()).toBe(1);

      // Should still be present at 900ms
      await vi.advanceTimersByTimeAsync(900);
      expect(getToastCount()).toBe(1);

      // Should be dismissed after 1000ms + animation
      await vi.advanceTimersByTimeAsync(300);
      expect(getToastCount()).toBe(0);
    });

    it("handles zero duration", async () => {
      toast.info("Test", { durationMs: 0 });

      expect(getToastCount()).toBe(1);

      // Should dismiss immediately (after the 200ms animation)
      await vi.advanceTimersByTimeAsync(200);
      expect(getToastCount()).toBe(0);
    });
  });

  describe("close button interaction", () => {
    it("dismisses toast when close button is clicked", async () => {
      toast.info("Test");

      const toastEl = getLastToast();
      const closeBtn = toastEl!.querySelector("button");

      expect(getToastCount()).toBe(1);

      // Click the close button
      closeBtn!.click();

      // Wait for dismiss animation
      await vi.advanceTimersByTimeAsync(200);

      expect(getToastCount()).toBe(0);
    });

    it("animates out before removing", async () => {
      toast.info("Test");

      const container = document.getElementById(TOAST_CONTAINER_ID);
      const toastEl = getLastToast();
      const closeBtn = toastEl!.querySelector("button");

      // Click close button
      closeBtn!.click();

      // Should start animating out immediately
      expect(toastEl!.style.opacity).toBe("0");
      expect(toastEl!.style.transform).toBe("translateX(100%)");

      // Should still be in DOM during animation
      expect(container!.contains(toastEl)).toBe(true);

      // After animation completes, should be removed
      await vi.advanceTimersByTimeAsync(200);
      expect(container!.contains(toastEl)).toBe(false);
    });
  });

  describe("multiple toasts", () => {
    it("stacks multiple toasts in the same container", () => {
      toast.info("First");
      toast.success("Second");
      toast.error("Third");

      expect(getToastCount()).toBe(3);
    });

    it("reuses the same container", () => {
      toast.info("First");
      const container1 = document.getElementById(TOAST_CONTAINER_ID);

      toast.info("Second");
      const container2 = document.getElementById(TOAST_CONTAINER_ID);

      expect(container1).toBe(container2);
    });
  });

  describe("toast.promise", () => {
    it("shows loading toast initially", async () => {
      let resolvePromise: (value: string) => void;
      const slowPromise = new Promise<string>((resolve) => {
        resolvePromise = resolve;
      });

      // Start the promise (don't await)
      const promiseResult = toast.promise(slowPromise, {
        loading: "Loading...",
        success: "Done!",
        error: "Failed!",
      });

      const loadingToast = getLastToast();

      expect(getToastCount()).toBe(1);
      const textSpan = loadingToast!.children[1] as HTMLElement;
      expect(textSpan.textContent).toBe("Loading...");

      // Clean up
      resolvePromise!("done");
      await promiseResult;
    });

    it("shows success toast when promise resolves", async () => {
      const resolvePromise = Promise.resolve("result");

      const result = await toast.promise(resolvePromise, {
        loading: "Loading...",
        success: "Success!",
        error: "Failed!",
      });

      expect(result).toBe("result");

      // Should have loading + success toasts
      expect(getToastCount()).toBe(2);

      const successToast = getLastToast();
      expect(successToast!.style.background).toBe("rgb(16, 185, 129)"); // emerald-500
      const textSpan = successToast!.children[1] as HTMLElement;
      expect(textSpan.textContent).toBe("Success!");
    });

    it("shows error toast when promise rejects", async () => {
      const rejectPromise = Promise.reject(new Error("Test error"));

      await expect(
        toast.promise(rejectPromise, {
          loading: "Loading...",
          success: "Success!",
          error: "Failed!",
        }),
      ).rejects.toThrow("Test error");

      // Should have loading + error toasts
      expect(getToastCount()).toBe(2);

      const errorToast = getLastToast();
      expect(errorToast!.style.background).toBe("rgb(239, 68, 68)"); // red-500
      const textSpan = errorToast!.children[1] as HTMLElement;
      expect(textSpan.textContent).toBe("Failed!");
    });

    it("uses error function to generate error message", async () => {
      const rejectPromise = Promise.reject(new Error("Custom error"));

      await expect(
        toast.promise(rejectPromise, {
          loading: "Loading...",
          success: "Success!",
          error: (err) => `Error: ${err.message}`,
        }),
      ).rejects.toThrow();

      const errorToast = getLastToast();
      const textSpan = errorToast!.children[1] as HTMLElement;
      expect(textSpan.textContent).toBe("Error: Custom error");
    });

    it("returns the resolved value", async () => {
      const data = { id: 123, name: "Test" };
      const resolvePromise = Promise.resolve(data);

      const result = await toast.promise(resolvePromise, {
        loading: "Loading...",
        success: "Done!",
        error: "Failed!",
      });

      expect(result).toEqual(data);
    });

    it("re-throws the error", async () => {
      const testError = new Error("Specific error");
      const rejectPromise = Promise.reject(testError);

      await expect(
        toast.promise(rejectPromise, {
          loading: "Loading...",
          success: "Done!",
          error: "Failed!",
        }),
      ).rejects.toThrow("Specific error");
    });
  });

  describe("edge cases", () => {
    it("handles empty message", () => {
      expect(() => toast.info("")).not.toThrow();

      const toastEl = getLastToast();
      const textSpan = toastEl!.children[1] as HTMLElement;
      expect(textSpan.textContent).toBe("");
    });

    it("handles very long message", () => {
      const longMessage = "A".repeat(1000);
      expect(() => toast.info(longMessage)).not.toThrow();

      const toastEl = getLastToast();
      expect(toastEl!.style.wordBreak).toBe("break-word");
    });

    it("handles special characters in message", () => {
      const specialMessage = '<script>alert("xss")</script>';
      toast.info(specialMessage);

      const toastEl = getLastToast();
      const textSpan = toastEl!.children[1] as HTMLElement;
      // textContent should escape HTML
      expect(textSpan.textContent).toBe(specialMessage);
      expect(textSpan.innerHTML).not.toContain("<script>");
    });

    it("handles undefined options", () => {
      expect(() => toast.info("Test", undefined)).not.toThrow();
    });
  });

  describe("container lifecycle", () => {
    it("container persists after all toasts are dismissed", async () => {
      toast.info("Test", { durationMs: 100 });

      // Wait for toast to be dismissed
      await vi.advanceTimersByTimeAsync(300);

      // Container should still exist
      const container = document.getElementById(TOAST_CONTAINER_ID);
      expect(container).not.toBeNull();
    });

    it("new toasts use existing container", async () => {
      toast.info("First", { durationMs: 100 });

      const container1 = document.getElementById(TOAST_CONTAINER_ID);

      // Wait for first to be dismissed
      await vi.advanceTimersByTimeAsync(300);

      // Add another toast
      toast.info("Second");

      const container2 = document.getElementById(TOAST_CONTAINER_ID);
      expect(container1).toBe(container2);
    });
  });

  describe("dismiss animation details", () => {
    it("icon span has bold font weight", () => {
      toast.info("Test");

      const toastEl = getLastToast();
      const icon = toastEl!.firstChild as HTMLElement;
      expect(icon.style.fontWeight).toBe("bold");
    });

    it("close button has correct cursor style", () => {
      toast.info("Test");

      const toastEl = getLastToast();
      const closeBtn = toastEl!.querySelector("button");
      expect(closeBtn!.style.cursor).toBe("pointer");
    });

    it("close button has transparent background", () => {
      toast.info("Test");

      const toastEl = getLastToast();
      const closeBtn = toastEl!.querySelector("button");
      expect(closeBtn!.style.background).toBe("transparent");
    });

    it("close button has margin left", () => {
      toast.info("Test");

      const toastEl = getLastToast();
      const closeBtn = toastEl!.querySelector("button");
      expect(closeBtn!.style.marginLeft).toBe("8px");
    });
  });
});
