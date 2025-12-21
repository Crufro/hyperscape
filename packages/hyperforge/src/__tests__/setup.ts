/**
 * Vitest Global Setup
 *
 * This file runs before all tests and sets up:
 * - Three.js server-side polyfills
 * - Environment variables
 * - Global test utilities
 */

import { beforeAll, afterAll, afterEach } from "vitest";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env file
config({ path: resolve(__dirname, "../../.env") });

// Server-side Three.js polyfills
beforeAll(async () => {
  // Import Three.js polyfills for server-side testing
  // These mock document, window, and canvas for GLB loading
  await import("@/lib/server/three-polyfills");
});

// Clean up after each test
afterEach(() => {
  // Clear any global state between tests
});

// Final cleanup
afterAll(() => {
  // Clean up any persistent resources
});

/**
 * Global test configuration
 */
declare global {
  // Add any global test variables here
  // eslint-disable-next-line no-var
  var TEST_ASSETS_PATH: string;
}

globalThis.TEST_ASSETS_PATH = new URL(
  "../../test-assets",
  import.meta.url,
).pathname;
