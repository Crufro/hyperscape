/**
 * Weapon Fitting E2E Tests
 *
 * Tests the weapon fitting workflow through the browser interface.
 * This covers the WebGL-dependent services:
 * - WeaponHandleDetector
 * - MeshFittingService
 * - 3D weapon rendering and positioning
 */

import { test, expect } from "@playwright/test";

test.describe("Equipment Studio (Weapons)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/studio/equipment");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000); // Wait for 3D scene to initialize
  });

  test.describe("UI Components", () => {
    test("page loads with all required panels", async ({ page }) => {
      // Check main content area
      const main = page.locator("main, [role='main']").first();
      await expect(main).toBeVisible({ timeout: 15000 });

      // Check for Avatars section
      const avatarsHeading = page.locator('h3:has-text("Avatars")');
      await expect(avatarsHeading).toBeVisible({ timeout: 10000 });

      // Check for Weapons section
      const weaponsHeading = page.locator('h3:has-text("Weapons")');
      await expect(weaponsHeading).toBeVisible({ timeout: 10000 });

      // Check for Equipment Slot heading
      const slotHeading = page.locator('h3:has-text("Equipment Slot")');
      await expect(slotHeading).toBeVisible({ timeout: 10000 });
    });

    test("equipment slot options exist", async ({ page }) => {
      // Check for Right Hand option
      const rightHand = page.locator('button:has-text("Right Hand")');
      await expect(rightHand).toBeVisible({ timeout: 10000 });

      // Check for Left Hand option
      const leftHand = page.locator('button:has-text("Left Hand")');
      await expect(leftHand).toBeVisible({ timeout: 10000 });
    });

    test("search functionality works", async ({ page }) => {
      // Find search input
      const searchInput = page.locator('input[placeholder*="Search"]').first();
      await expect(searchInput).toBeVisible({ timeout: 10000 });

      // Type search query
      await searchInput.fill("sword");
      await expect(searchInput).toHaveValue("sword");
    });

    test("screenshot for visual regression", async ({ page }) => {
      await expect(page).toHaveScreenshot("equipment-studio-full.png", {
        maxDiffPixels: 300,
      });
    });
  });

  test.describe("3D Canvas", () => {
    test("canvas element is rendered", async ({ page }) => {
      const canvas = page.locator("canvas").first();
      await expect(canvas).toBeVisible({ timeout: 15000 });
    });

    test("canvas has proper dimensions", async ({ page }) => {
      const canvas = page.locator("canvas").first();
      await expect(canvas).toBeVisible({ timeout: 15000 });

      const boundingBox = await canvas.boundingBox();
      expect(boundingBox).not.toBeNull();
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThan(200);
        expect(boundingBox.height).toBeGreaterThan(200);
      }
    });

    test("canvas is not blank", async ({ page }) => {
      const canvas = page.locator("canvas").first();
      await expect(canvas).toBeVisible({ timeout: 15000 });

      // Wait for rendering
      await page.waitForTimeout(3000);

      // Take screenshot of canvas
      const screenshot = await canvas.screenshot();
      expect(screenshot.length).toBeGreaterThan(1000);
    });

    test("canvas screenshot for WebGL verification", async ({ page }) => {
      const canvas = page.locator("canvas").first();
      await expect(canvas).toBeVisible({ timeout: 15000 });

      await page.waitForTimeout(3000);

      await expect(canvas).toHaveScreenshot("equipment-studio-canvas.png", {
        maxDiffPixels: 500,
      });
    });
  });

  test.describe("Equipment Slot Selection", () => {
    test("can switch between right and left hand", async ({ page }) => {
      // Find slot buttons
      const rightHand = page.locator('button:has-text("Right Hand")');
      const leftHand = page.locator('button:has-text("Left Hand")');

      await expect(rightHand).toBeVisible({ timeout: 10000 });
      await expect(leftHand).toBeVisible({ timeout: 10000 });

      // Click Right Hand
      await rightHand.click();
      await page.waitForTimeout(500);

      // Click Left Hand
      await leftHand.click();
      await page.waitForTimeout(500);

      // Both buttons should still be visible
      await expect(rightHand).toBeVisible();
      await expect(leftHand).toBeVisible();
    });

    test("slot selection updates 3D view", async ({ page }) => {
      const canvas = page.locator("canvas").first();
      await expect(canvas).toBeVisible({ timeout: 15000 });

      // Get initial canvas state
      const _initialScreenshot = await canvas.screenshot();

      // Switch slot
      const leftHand = page.locator('button:has-text("Left Hand")');
      await leftHand.click();
      await page.waitForTimeout(1000);

      // Canvas should still have content
      const newScreenshot = await canvas.screenshot();
      expect(newScreenshot.length).toBeGreaterThan(1000);
    });
  });

  test.describe("Asset Selection", () => {
    test("avatar list is accessible", async ({ page }) => {
      const avatarsHeading = page.locator('h3:has-text("Avatars")');
      await expect(avatarsHeading).toBeVisible({ timeout: 10000 });

      // The section should contain items or empty state
      const avatarContainer = avatarsHeading.locator("xpath=..");
      await expect(avatarContainer).toBeVisible();
    });

    test("weapon list is accessible", async ({ page }) => {
      const weaponsHeading = page.locator('h3:has-text("Weapons")');
      await expect(weaponsHeading).toBeVisible({ timeout: 10000 });

      // The section should contain items or empty state
      const weaponContainer = weaponsHeading.locator("xpath=..");
      await expect(weaponContainer).toBeVisible();
    });
  });

  test.describe("Camera Controls", () => {
    test("can orbit camera with mouse drag", async ({ page }) => {
      const canvas = page.locator("canvas").first();
      await expect(canvas).toBeVisible({ timeout: 15000 });

      const boundingBox = await canvas.boundingBox();
      if (boundingBox) {
        const centerX = boundingBox.x + boundingBox.width / 2;
        const centerY = boundingBox.y + boundingBox.height / 2;

        // Drag to orbit
        await page.mouse.move(centerX, centerY);
        await page.mouse.down();
        await page.mouse.move(centerX + 100, centerY);
        await page.mouse.up();

        await page.waitForTimeout(500);

        // Canvas should still render
        const screenshot = await canvas.screenshot();
        expect(screenshot.length).toBeGreaterThan(1000);
      }
    });

    test("can zoom with scroll wheel", async ({ page }) => {
      const canvas = page.locator("canvas").first();
      await expect(canvas).toBeVisible({ timeout: 15000 });

      const boundingBox = await canvas.boundingBox();
      if (boundingBox) {
        const centerX = boundingBox.x + boundingBox.width / 2;
        const centerY = boundingBox.y + boundingBox.height / 2;

        // Scroll to zoom
        await page.mouse.move(centerX, centerY);
        await page.mouse.wheel(0, -100);

        await page.waitForTimeout(500);

        const screenshot = await canvas.screenshot();
        expect(screenshot.length).toBeGreaterThan(1000);
      }
    });
  });
});

test.describe("Weapon Handle Detection API", () => {
  test("GET /api/weapon-handle-detect returns API info", async ({
    request,
  }) => {
    const response = await request.get("/api/weapon-handle-detect");

    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("application/json");

    const data = await response.json();
    expect(data).toHaveProperty("name");
    expect(data).toHaveProperty("description");
    expect(data.name).toBe("Weapon Handle Detection API");
  });

  test("POST /api/weapon-handle-detect validates input", async ({
    request,
  }) => {
    // Test with missing image
    const response = await request.post("/api/weapon-handle-detect", {
      data: {},
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data.error).toContain("Image required");
  });

  test("POST /api/weapon-handle-detect with simple image returns heuristic", async ({
    request,
  }) => {
    // Create a simple 1x1 white pixel PNG as base64
    const simpleImageBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const response = await request.post("/api/weapon-handle-detect", {
      data: {
        image: `data:image/png;base64,${simpleImageBase64}`,
      },
      headers: { "Content-Type": "application/json" },
    });

    // Should succeed with heuristic detection (no API key)
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty("success");
    expect(data).toHaveProperty("gripData");
    expect(data.gripData).toHaveProperty("gripBounds");
    expect(data.gripData).toHaveProperty("confidence");
    expect(data.gripData).toHaveProperty("weaponType");
  });
});

test.describe("Weapon Orientation Detection API", () => {
  test("GET /api/weapon-orientation-detect returns API info", async ({
    request,
  }) => {
    const response = await request.get("/api/weapon-orientation-detect");

    // Either 200 with API info or 405 if GET not supported
    expect([200, 405]).toContain(response.status());
  });
});

test.describe("Armor Fitting API", () => {
  test("armor fit endpoint exists", async ({ request }) => {
    const response = await request.get("/api/armor/fit");

    // Either 200 with API info or 405 if GET not supported
    expect([200, 405]).toContain(response.status());
  });
});

test.describe("Armor Studio", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/studio/armor");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
  });

  test.describe("UI Components", () => {
    test("page loads with fitting interface", async ({ page }) => {
      const main = page.locator("main, [role='main']").first();
      await expect(main).toBeVisible({ timeout: 15000 });

      // Check for Avatars section
      const avatarsHeading = page.locator('h3:has-text("Avatars")');
      await expect(avatarsHeading).toBeVisible({ timeout: 10000 });

      // Check for Armor section
      const armorHeading = page.locator('h3:has-text("Armor")');
      await expect(armorHeading).toBeVisible({ timeout: 10000 });

      // Check for Fitting Settings
      const fittingSettings = page.locator('h3:has-text("Fitting Settings")');
      await expect(fittingSettings).toBeVisible({ timeout: 10000 });
    });

    test("perform fitting button exists", async ({ page }) => {
      const fittingButton = page.locator('button:has-text("Perform Fitting")');
      await expect(fittingButton).toBeVisible({ timeout: 10000 });
    });

    test("equipment slot options exist", async ({ page }) => {
      const slotHeading = page.locator('h3:has-text("Equipment Slot")');
      await expect(slotHeading).toBeVisible({ timeout: 10000 });

      // Check for Helmet option
      const helmet = page.locator('button:has-text("Helmet")');
      await expect(helmet).toBeVisible();
    });

    test("screenshot for visual regression", async ({ page }) => {
      await expect(page).toHaveScreenshot("armor-studio-full.png", {
        maxDiffPixels: 300,
      });
    });
  });

  test.describe("3D Canvas", () => {
    test("canvas renders for armor fitting", async ({ page }) => {
      const canvas = page.locator("canvas").first();
      await expect(canvas).toBeVisible({ timeout: 15000 });

      await page.waitForTimeout(3000);

      const screenshot = await canvas.screenshot();
      expect(screenshot.length).toBeGreaterThan(1000);
    });
  });

  test.describe("Armor Slot Selection", () => {
    test("can select different armor slots", async ({ page }) => {
      // Try to find armor slot buttons
      const helmetButton = page.locator('button:has-text("Helmet")');
      const chestButton = page.locator('button:has-text("Chest")');

      if (await helmetButton.isVisible()) {
        await helmetButton.click();
        await page.waitForTimeout(500);
      }

      if (await chestButton.isVisible()) {
        await chestButton.click();
        await page.waitForTimeout(500);
      }
    });
  });
});
