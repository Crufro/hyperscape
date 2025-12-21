/**
 * Relationships API
 *
 * Provides access to asset relationship data from game manifests.
 *
 * GET /api/relationships - Get relationship graph with optional filters
 *   ?assetId=<id> - Filter to relationships involving this asset
 *   ?assetTypes=<type1,type2> - Filter by asset categories
 *   ?relationshipTypes=<type1,type2> - Filter by relationship types
 *
 * POST /api/relationships - Add a new relationship
 *
 * DELETE /api/relationships?id=<relationshipId> - Remove a relationship
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/utils";
import {
  getRelationships,
  getRelationshipGraph,
  addRelationship,
  removeRelationship,
  getRelationshipStats,
} from "@/lib/relationships/relationship-service";
import {
  type RelationshipType,
  type RelationshipMetadata,
  isRelationshipType,
} from "@/lib/relationships/relationship-types";
import type { AssetCategory } from "@/types/core";

const log = logger.child("API:relationships");

// =============================================================================
// GET - Fetch relationships
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get("assetId");
    const assetTypesParam = searchParams.get("assetTypes");
    const relationshipTypesParam = searchParams.get("relationshipTypes");
    const statsOnly = searchParams.get("stats") === "true";

    // Return stats only
    if (statsOnly) {
      const stats = await getRelationshipStats();
      return NextResponse.json({
        success: true,
        stats,
      });
    }

    // Parse filters
    const assetTypes = assetTypesParam
      ? (assetTypesParam.split(",") as AssetCategory[])
      : undefined;
    const relationshipTypes = relationshipTypesParam
      ? (relationshipTypesParam.split(",").filter(isRelationshipType) as RelationshipType[])
      : undefined;

    // If assetId is specified, return relationships for that asset
    if (assetId) {
      const { outgoing, incoming } = await getRelationships(assetId);

      // Also get the graph centered on this asset
      const graph = await getRelationshipGraph({
        assetId,
        assetTypes,
        relationshipTypes,
      });

      return NextResponse.json({
        success: true,
        assetId,
        outgoing,
        incoming,
        graph,
        counts: {
          outgoing: outgoing.length,
          incoming: incoming.length,
          totalNodes: graph.nodes.length,
          totalEdges: graph.edges.length,
        },
      });
    }

    // Otherwise return the full graph with filters
    const graph = await getRelationshipGraph({
      assetTypes,
      relationshipTypes,
    });

    return NextResponse.json({
      success: true,
      graph,
      counts: {
        nodes: graph.nodes.length,
        edges: graph.edges.length,
      },
      filters: {
        assetTypes: assetTypes || [],
        relationshipTypes: relationshipTypes || [],
      },
    });
  } catch (error) {
    log.error("Failed to get relationships", { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get relationships",
      },
      { status: 500 },
    );
  }
}

// =============================================================================
// POST - Add a relationship
// =============================================================================

interface AddRelationshipBody {
  sourceId: string;
  sourceType: AssetCategory;
  sourceName: string;
  targetId: string;
  targetType: AssetCategory;
  targetName: string;
  relationshipType: RelationshipType;
  metadata?: RelationshipMetadata;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AddRelationshipBody;

    // Validate required fields
    if (
      !body.sourceId ||
      !body.sourceType ||
      !body.sourceName ||
      !body.targetId ||
      !body.targetType ||
      !body.targetName ||
      !body.relationshipType
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: [
            "sourceId",
            "sourceType",
            "sourceName",
            "targetId",
            "targetType",
            "targetName",
            "relationshipType",
          ],
        },
        { status: 400 },
      );
    }

    // Validate relationship type
    if (!isRelationshipType(body.relationshipType)) {
      return NextResponse.json(
        {
          error: `Invalid relationship type: ${body.relationshipType}`,
          validTypes: [
            "drops",
            "yields",
            "sells",
            "spawns",
            "harvests",
            "requires",
            "manages",
          ],
        },
        { status: 400 },
      );
    }

    const relationship = await addRelationship(
      body.sourceId,
      body.sourceType,
      body.sourceName,
      body.targetId,
      body.targetType,
      body.targetName,
      body.relationshipType,
      body.metadata,
    );

    if (!relationship) {
      return NextResponse.json(
        {
          error: "Failed to create relationship - invalid combination",
          hint: "Check that the source and target categories are valid for this relationship type",
        },
        { status: 400 },
      );
    }

    log.info("Relationship created", {
      id: relationship.id,
      type: relationship.relationshipType,
    });

    return NextResponse.json({
      success: true,
      relationship,
    });
  } catch (error) {
    log.error("Failed to add relationship", { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to add relationship",
      },
      { status: 500 },
    );
  }
}

// =============================================================================
// DELETE - Remove a relationship
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const relationshipId = searchParams.get("id");

    if (!relationshipId) {
      return NextResponse.json(
        {
          error: "Missing relationship ID",
          usage: "DELETE /api/relationships?id=<relationshipId>",
        },
        { status: 400 },
      );
    }

    const removed = await removeRelationship(relationshipId);

    if (!removed) {
      return NextResponse.json(
        {
          error: "Relationship not found",
          id: relationshipId,
        },
        { status: 404 },
      );
    }

    log.info("Relationship removed", { id: relationshipId });

    return NextResponse.json({
      success: true,
      removed: relationshipId,
    });
  } catch (error) {
    log.error("Failed to remove relationship", { error });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to remove relationship",
      },
      { status: 500 },
    );
  }
}
