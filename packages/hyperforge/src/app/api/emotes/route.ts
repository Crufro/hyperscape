import { NextResponse } from "next/server";
import { loadVRMEmotes } from "@/lib-core/cdn/loader";

/**
 * GET /api/emotes - Get available emotes for VRM animation testing
 */
export async function GET() {
  try {
    const emotes = await loadVRMEmotes();
    return NextResponse.json(emotes);
  } catch (error) {
    console.error("[API] Failed to load emotes:", error);
    return NextResponse.json(
      { error: "Failed to load emotes" },
      { status: 500 },
    );
  }
}
