/**
 * GLB Binary Utilities
 *
 * Provides utilities for parsing and building GLB (glTF Binary) files.
 * Used by VRMConverter and other services that need to manipulate GLB data.
 *
 * GLB file structure:
 * - 12 bytes header: magic (4) + version (4) + length (4)
 * - JSON chunk: length (4) + type (4) + data (padded to 4-byte boundary)
 * - BIN chunk (optional): length (4) + type (4) + data (padded to 4-byte boundary)
 */

/** Magic number for GLB files: "glTF" in little-endian */
const GLB_MAGIC = 0x46546c67;

/** Chunk type for JSON: "JSON" in little-endian */
const CHUNK_TYPE_JSON = 0x4e4f534a;

/** Chunk type for BIN: "BIN\0" in little-endian */
const CHUNK_TYPE_BIN = 0x004e4942;

/**
 * Parsed GLB chunks
 */
export interface GLBChunks {
  /** Parsed JSON content from the GLB */
  json: Record<string, unknown>;
  /** Binary data chunk (geometry, textures, etc.) */
  bin: Uint8Array | null;
}

/**
 * Parse a GLB binary file into its JSON and BIN chunks
 *
 * @param glbData - Raw GLB file data
 * @returns Parsed GLB chunks
 * @throws Error if the GLB is invalid or malformed
 */
export function parseGLB(glbData: ArrayBuffer): GLBChunks {
  const view = new DataView(glbData);

  // Validate header
  const magic = view.getUint32(0, true);
  if (magic !== GLB_MAGIC) {
    throw new Error("Invalid GLB: wrong magic number");
  }

  const version = view.getUint32(4, true);
  if (version !== 2) {
    throw new Error(`Invalid GLB: unsupported version ${version}`);
  }

  // Parse JSON chunk
  const jsonChunkLength = view.getUint32(12, true);
  const jsonChunkType = view.getUint32(16, true);
  if (jsonChunkType !== CHUNK_TYPE_JSON) {
    throw new Error("Invalid GLB: first chunk is not JSON");
  }

  // Copy JSON bytes to avoid issues with ArrayBuffer detachment
  const jsonBytesView = new Uint8Array(glbData, 20, jsonChunkLength);
  const jsonBytes = new Uint8Array(jsonChunkLength);
  jsonBytes.set(jsonBytesView);

  const jsonString = new TextDecoder().decode(jsonBytes);
  const json = JSON.parse(jsonString) as Record<string, unknown>;

  // Parse BIN chunk if present
  const binChunkOffset = 12 + 8 + jsonChunkLength;
  let bin: Uint8Array | null = null;

  if (binChunkOffset < glbData.byteLength) {
    const binChunkLength = view.getUint32(binChunkOffset, true);
    const binChunkType = view.getUint32(binChunkOffset + 4, true);

    if (binChunkType === CHUNK_TYPE_BIN) {
      // Copy BIN data to avoid issues with ArrayBuffer detachment
      const binView = new Uint8Array(
        glbData,
        binChunkOffset + 8,
        binChunkLength,
      );
      bin = new Uint8Array(binChunkLength);
      bin.set(binView);
    }
  }

  return { json, bin };
}

/**
 * Build a GLB binary file from JSON and optional BIN chunks
 *
 * @param json - JSON content to include in the GLB
 * @param bin - Optional binary data chunk
 * @returns Complete GLB file as ArrayBuffer
 */
export function buildGLB(
  json: Record<string, unknown>,
  bin: Uint8Array | null,
): ArrayBuffer {
  // Encode JSON and calculate padded length
  const jsonString = JSON.stringify(json);
  const jsonBuffer = new TextEncoder().encode(jsonString);
  const jsonChunkLength = alignTo4Bytes(jsonBuffer.length);
  const jsonPadding = jsonChunkLength - jsonBuffer.length;

  // Calculate BIN chunk size if present
  const binChunkLength = bin ? alignTo4Bytes(bin.length) : 0;
  const binPadding = bin ? binChunkLength - bin.length : 0;

  // Calculate total file length
  const totalLength =
    12 + // Header
    8 +
    jsonChunkLength + // JSON chunk
    (bin ? 8 + binChunkLength : 0); // BIN chunk (optional)

  // Create output buffer
  const glb = new ArrayBuffer(totalLength);
  const view = new DataView(glb);

  // Write header
  view.setUint32(0, GLB_MAGIC, true);
  view.setUint32(4, 2, true); // version
  view.setUint32(8, totalLength, true);

  // Write JSON chunk header
  view.setUint32(12, jsonChunkLength, true);
  view.setUint32(16, CHUNK_TYPE_JSON, true);

  // Write JSON chunk data with padding
  const jsonChunkData = new Uint8Array(glb, 20, jsonChunkLength);
  jsonChunkData.set(jsonBuffer);
  for (let i = 0; i < jsonPadding; i++) {
    jsonChunkData[jsonBuffer.length + i] = 0x20; // Pad with spaces
  }

  // Write BIN chunk if present
  if (bin) {
    const binChunkHeaderOffset = 20 + jsonChunkLength;
    view.setUint32(binChunkHeaderOffset, binChunkLength, true);
    view.setUint32(binChunkHeaderOffset + 4, CHUNK_TYPE_BIN, true);

    const binChunkData = new Uint8Array(
      glb,
      binChunkHeaderOffset + 8,
      binChunkLength,
    );
    binChunkData.set(bin);
    for (let i = 0; i < binPadding; i++) {
      binChunkData[bin.length + i] = 0x00; // Pad with zeros
    }
  }

  return glb;
}

/**
 * Get basic info from a GLB without fully parsing it
 *
 * @param glbData - Raw GLB file data
 * @returns Object with file size and version
 */
export function getGLBInfo(glbData: ArrayBuffer): {
  version: number;
  totalLength: number;
} {
  const view = new DataView(glbData);

  const magic = view.getUint32(0, true);
  if (magic !== GLB_MAGIC) {
    throw new Error("Invalid GLB: wrong magic number");
  }

  return {
    version: view.getUint32(4, true),
    totalLength: view.getUint32(8, true),
  };
}

/**
 * Align a number to a 4-byte boundary (required by GLB spec)
 */
function alignTo4Bytes(value: number): number {
  return Math.ceil(value / 4) * 4;
}
