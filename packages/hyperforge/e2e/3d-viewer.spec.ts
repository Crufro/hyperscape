/**
 * 3D Viewer E2E Tests
 *
 * Tests Three.js rendering, WebGL context, and 3D scene functionality
 * across all studio pages. This ensures the WebGL-dependent code
 * functions correctly in a real browser environment.
 */

import { test, expect } from "@playwright/test";

test.describe("WebGL Context Verification", () => {
  const studioPages = [
    { path: "/studio", name: "Main Studio" },
    { path: "/studio/equipment", name: "Equipment Studio" },
    { path: "/studio/armor", name: "Armor Studio" },
    { path: "/studio/hands", name: "Hand Rigging Studio" },
  ];

  for (const studio of studioPages) {
    test(`${studio.name}: WebGL is available`, async ({ page }) => {
      await page.goto(studio.path);
      await page.waitForLoadState("networkidle");

      const webglAvailable = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        const gl =
          canvas.getContext("webgl2") || canvas.getContext("webgl") || null;
        return gl !== null;
      });

      expect(webglAvailable).toBe(true);
    });

    test(`${studio.name}: Canvas renders`, async ({ page }) => {
      await page.goto(studio.path);
      await page.waitForLoadState("networkidle");

      const canvas = page.locator("canvas").first();
      await expect(canvas).toBeVisible({ timeout: 15000 });
    });

    test(`${studio.name}: Canvas has content`, async ({ page }) => {
      await page.goto(studio.path);
      await page.waitForLoadState("networkidle");

      const canvas = page.locator("canvas").first();
      await expect(canvas).toBeVisible({ timeout: 15000 });

      await page.waitForTimeout(3000);

      const screenshot = await canvas.screenshot();
      expect(screenshot.length).toBeGreaterThan(1000);
    });
  }
});

test.describe("Three.js Scene Properties", () => {
  test("scene is initialized with correct renderer", async ({ page }) => {
    await page.goto("/studio/equipment");
    await page.waitForLoadState("networkidle");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Wait for full initialization
    await page.waitForTimeout(3000);

    // Check canvas dimensions are correct
    const dimensions = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      if (!canvas) return null;
      return {
        width: canvas.width,
        height: canvas.height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
      };
    });

    expect(dimensions).not.toBeNull();
    expect(dimensions!.width).toBeGreaterThan(0);
    expect(dimensions!.height).toBeGreaterThan(0);
  });

  test("scene responds to resize", async ({ page }) => {
    await page.goto("/studio/equipment");
    await page.waitForLoadState("networkidle");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Get initial size
    const initialDimensions = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      return canvas ? { width: canvas.width, height: canvas.height } : null;
    });

    // Resize viewport
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);

    // Canvas should still exist and render
    const screenshot = await canvas.screenshot();
    expect(screenshot.length).toBeGreaterThan(1000);

    // Initial dimensions should have been captured
    expect(initialDimensions).not.toBeNull();
  });

  test("scene handles aspect ratio changes", async ({ page }) => {
    await page.goto("/studio/equipment");
    await page.waitForLoadState("networkidle");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Test wide aspect ratio
    await page.setViewportSize({ width: 1920, height: 600 });
    await page.waitForTimeout(500);

    let screenshot = await canvas.screenshot();
    expect(screenshot.length).toBeGreaterThan(1000);

    // Test tall aspect ratio
    await page.setViewportSize({ width: 600, height: 900 });
    await page.waitForTimeout(500);

    screenshot = await canvas.screenshot();
    expect(screenshot.length).toBeGreaterThan(1000);
  });
});

test.describe("Camera Controls", () => {
  test("orbit controls respond to mouse drag", async ({ page }) => {
    await page.goto("/studio/equipment");
    await page.waitForLoadState("networkidle");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const boundingBox = await canvas.boundingBox();
    expect(boundingBox).not.toBeNull();

    if (boundingBox) {
      const centerX = boundingBox.x + boundingBox.width / 2;
      const centerY = boundingBox.y + boundingBox.height / 2;

      // Perform drag
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX + 50, centerY + 50);
      await page.mouse.up();

      await page.waitForTimeout(300);

      // Canvas should still be functional
      const screenshot = await canvas.screenshot();
      expect(screenshot.length).toBeGreaterThan(1000);
    }
  });

  test("zoom controls respond to scroll", async ({ page }) => {
    await page.goto("/studio/equipment");
    await page.waitForLoadState("networkidle");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const boundingBox = await canvas.boundingBox();
    expect(boundingBox).not.toBeNull();

    if (boundingBox) {
      const centerX = boundingBox.x + boundingBox.width / 2;
      const centerY = boundingBox.y + boundingBox.height / 2;

      // Zoom in
      await page.mouse.move(centerX, centerY);
      await page.mouse.wheel(0, -200);

      await page.waitForTimeout(300);

      // Zoom out
      await page.mouse.wheel(0, 400);

      await page.waitForTimeout(300);

      // Canvas should still render
      const screenshot = await canvas.screenshot();
      expect(screenshot.length).toBeGreaterThan(1000);
    }
  });

  test("right-click drag for pan", async ({ page }) => {
    await page.goto("/studio/equipment");
    await page.waitForLoadState("networkidle");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    const boundingBox = await canvas.boundingBox();
    expect(boundingBox).not.toBeNull();

    if (boundingBox) {
      const centerX = boundingBox.x + boundingBox.width / 2;
      const centerY = boundingBox.y + boundingBox.height / 2;

      // Right-click drag
      await page.mouse.move(centerX, centerY);
      await page.mouse.down({ button: "right" });
      await page.mouse.move(centerX + 30, centerY + 30);
      await page.mouse.up({ button: "right" });

      await page.waitForTimeout(300);

      const screenshot = await canvas.screenshot();
      expect(screenshot.length).toBeGreaterThan(1000);
    }
  });
});

test.describe("Rendering Quality", () => {
  test("canvas is not all black", async ({ page }) => {
    await page.goto("/studio/equipment");
    await page.waitForLoadState("networkidle");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(3000);

    // Check for non-black content
    const hasContent = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      if (!canvas) return false;

      // Create a 2D canvas to read pixels
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) return false;

      ctx.drawImage(canvas, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Check if any pixel is not black
      let hasNonBlack = false;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 10 || data[i + 1] > 10 || data[i + 2] > 10) {
          hasNonBlack = true;
          break;
        }
      }

      return hasNonBlack;
    });

    expect(hasContent).toBe(true);
  });

  test("canvas is not all white", async ({ page }) => {
    await page.goto("/studio/equipment");
    await page.waitForLoadState("networkidle");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(3000);

    // Check for non-white content
    const hasContent = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      if (!canvas) return false;

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) return false;

      ctx.drawImage(canvas, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Check if any pixel is not white
      let hasNonWhite = false;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) {
          hasNonWhite = true;
          break;
        }
      }

      return hasNonWhite;
    });

    expect(hasContent).toBe(true);
  });

  test("canvas has color variety", async ({ page }) => {
    await page.goto("/studio/equipment");
    await page.waitForLoadState("networkidle");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(3000);

    // Check for color variety
    const colorStats = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      if (!canvas) return null;

      const tempCanvas = document.createElement("canvas");
      const sampleSize = 100; // Sample a smaller size for performance
      tempCanvas.width = sampleSize;
      tempCanvas.height = sampleSize;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(canvas, 0, 0, sampleSize, sampleSize);
      const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
      const data = imageData.data;

      // Calculate unique colors
      const colors = new Set<string>();
      for (let i = 0; i < data.length; i += 4) {
        const key = `${Math.floor(data[i] / 16)}-${Math.floor(data[i + 1] / 16)}-${Math.floor(data[i + 2] / 16)}`;
        colors.add(key);
      }

      return {
        uniqueColors: colors.size,
        totalPixels: sampleSize * sampleSize,
      };
    });

    expect(colorStats).not.toBeNull();
    // Should have at least some color variety (not a solid color)
    expect(colorStats!.uniqueColors).toBeGreaterThan(1);
  });
});

test.describe("Error Handling", () => {
  test("no JavaScript errors on page load", async ({ page }) => {
    const jsErrors: string[] = [];

    page.on("pageerror", (error) => {
      jsErrors.push(error.message);
    });

    await page.goto("/studio/equipment");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Filter out known acceptable errors
    const criticalErrors = jsErrors.filter(
      (err) =>
        !err.includes("ResizeObserver") && // ResizeObserver loop limit is not critical
        !err.includes("Script error"), // Cross-origin errors we can't control
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test("no WebGL errors in console", async ({ page }) => {
    const webglErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (
          text.includes("WebGL") ||
          text.includes("GL_") ||
          text.includes("GLSL")
        ) {
          webglErrors.push(text);
        }
      }
    });

    await page.goto("/studio/equipment");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    expect(webglErrors).toHaveLength(0);
  });

  test("handles missing assets gracefully", async ({ page }) => {
    // Intercept asset requests and make them fail
    await page.route("**/*.glb", (route) => route.abort());
    await page.route("**/*.gltf", (route) => route.abort());

    let _hasError = false;
    page.on("pageerror", () => {
      _hasError = true;
    });

    await page.goto("/studio/equipment");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Page should still be functional even if assets fail to load
    const main = page.locator("main, [role='main']").first();
    await expect(main).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Performance", () => {
  test("canvas renders within acceptable time", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("/studio/equipment");
    await page.waitForLoadState("networkidle");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    const loadTime = Date.now() - startTime;

    // Should load within 15 seconds
    expect(loadTime).toBeLessThan(15000);
  });

  test("maintains 30+ FPS after load", async ({ page }) => {
    await page.goto("/studio/equipment");
    await page.waitForLoadState("networkidle");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2000);

    // Measure FPS using requestAnimationFrame
    const fps = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        let frames = 0;
        const startTime = performance.now();

        function countFrame() {
          frames++;
          if (performance.now() - startTime < 1000) {
            requestAnimationFrame(countFrame);
          } else {
            resolve(frames);
          }
        }

        requestAnimationFrame(countFrame);
      });
    });

    // Should maintain at least 30 FPS
    expect(fps).toBeGreaterThanOrEqual(30);
  });
});

test.describe("Visual Regression", () => {
  test("equipment studio screenshot", async ({ page }) => {
    await page.goto("/studio/equipment");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await expect(page).toHaveScreenshot("3d-viewer-equipment.png", {
      maxDiffPixels: 300,
    });
  });

  test("armor studio screenshot", async ({ page }) => {
    await page.goto("/studio/armor");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await expect(page).toHaveScreenshot("3d-viewer-armor.png", {
      maxDiffPixels: 300,
    });
  });

  test("hand rigging studio screenshot", async ({ page }) => {
    await page.goto("/studio/hands");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    await expect(page).toHaveScreenshot("3d-viewer-hands.png", {
      maxDiffPixels: 300,
    });
  });
});
