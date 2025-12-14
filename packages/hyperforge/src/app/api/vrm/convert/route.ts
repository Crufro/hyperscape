/**
 * VRM Conversion API Route
 * Converts GLB models to VRM format for Hyperscape animation
 *
 * This runs server-side as the FINAL step in the pipeline:
 * GLB → Hand Rigging (optional) → VRM Conversion
 *
 * Accepts either:
 * - modelUrl: URL to download the GLB from
 * - glbData: Base64-encoded GLB data (for hand-rigged models in memory)
 */

// Must import polyfills BEFORE Three.js
import "@/lib/server/three-polyfills";

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { modelUrl, glbData, avatarName, author } = body;

    if (!modelUrl && !glbData) {
      return NextResponse.json(
        { error: "Either modelUrl or glbData (base64) required" },
        { status: 400 },
      );
    }

    // Import Three.js and VRM converter (server-side)
    const { GLTFLoader } = await import(
      "three/examples/jsm/loaders/GLTFLoader.js"
    );
    const { convertGLBToVRM } = await import("@/services/vrm/VRMConverter");

    const loader = new GLTFLoader();
    let gltf: { scene: THREE.Object3D };

    if (glbData) {
      // Load from base64 data (for hand-rigged models)
      console.log("🎭 Loading GLB from base64 data...");
      const glbBuffer = Buffer.from(glbData, "base64");
      const arrayBuffer = glbBuffer.buffer.slice(
        glbBuffer.byteOffset,
        glbBuffer.byteOffset + glbBuffer.byteLength,
      );

      gltf = await new Promise<{ scene: THREE.Object3D }>((resolve, reject) => {
        loader.parse(
          arrayBuffer,
          "",
          (result) => resolve(result as { scene: THREE.Object3D }),
          (error) => reject(error),
        );
      });
    } else {
      // Load from URL
      console.log("🎭 Loading GLB from URL...");
      gltf = await new Promise<{ scene: THREE.Object3D }>((resolve, reject) => {
        loader.load(
          modelUrl,
          (result) => resolve(result as { scene: THREE.Object3D }),
          undefined,
          (error) => reject(error),
        );
      });
    }

    // Convert to VRM
    console.log("🎭 Converting to VRM format...");
    const vrmResult = await convertGLBToVRM(gltf.scene as THREE.Group, {
      avatarName: avatarName || "Generated Avatar",
      author: author || "HyperForge",
      version: "1.0",
    });

    // Return VRM as base64 (in production, upload to CDN and return URL)
    const vrmBase64 = Buffer.from(vrmResult.vrmData).toString("base64");
    const vrmDataUrl = `data:model/gltf-binary;base64,${vrmBase64}`;

    return NextResponse.json({
      success: true,
      vrmDataUrl,
      vrmData: vrmBase64, // Base64 encoded ArrayBuffer
      boneMappings: Object.fromEntries(vrmResult.boneMappings),
      warnings: vrmResult.warnings,
      coordinateSystemFixed: vrmResult.coordinateSystemFixed,
    });
  } catch (error) {
    console.error("[API] VRM conversion failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "VRM conversion failed",
      },
      { status: 500 },
    );
  }
}

// Import THREE type for type safety
import type * as THREE from "three";
