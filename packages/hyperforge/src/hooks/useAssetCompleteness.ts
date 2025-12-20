/**
 * Asset Completeness Hook
 *
 * React hook for checking asset completeness in UI components.
 * Provides real-time feedback on what's missing before export.
 */

import { useMemo, useCallback } from "react";
import {
  calculateCompleteness,
  getSchema,
  getAllSchemas,
  getSchemaDefaults,
  type CompletenessReport,
  type AssetTypeSchema,
  type FieldDefinition,
} from "@/lib/assets/asset-completeness";

// =============================================================================
// TYPES
// =============================================================================

export interface AssetCompletenessState {
  /** The completeness report */
  report: CompletenessReport | null;
  /** Is the asset ready for export? */
  isExportReady: boolean;
  /** Completeness percentage (0-100) */
  completeness: number;
  /** Required fields that are missing */
  missingRequired: string[];
  /** Recommended fields that are missing */
  missingRecommended: string[];
  /** Files that need to be added */
  missingFiles: string[];
  /** Human-readable summary */
  summary: string;
  /** Color indicator (red/yellow/green) */
  statusColor: "red" | "yellow" | "green";
}

export interface UseAssetCompletenessOptions {
  /** Asset type (e.g., "weapon", "mob", "harvestable") */
  type: string;
  /** The asset data object */
  asset: Record<string, unknown>;
  /** Linked assets for association checking */
  linkedAssets?: Map<string, string[]>;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to track asset completeness
 */
export function useAssetCompleteness(
  options: UseAssetCompletenessOptions
): AssetCompletenessState {
  const { type, asset, linkedAssets } = options;

  return useMemo(() => {
    if (!asset || !type) {
      return createEmptyState();
    }

    const report = calculateCompleteness(asset, type, {
      checkFiles: true,
      linkedAssets,
    });

    const missingRequired = report.fields
      .filter((f) => f.requirement === "required" && !f.present)
      .map((f) => f.name);

    const missingRecommended = report.fields
      .filter((f) => f.requirement === "recommended" && !f.present)
      .map((f) => f.name);

    const missingFiles = report.files
      .filter((f) => !f.exists)
      .map((f) => f.name);

    // Generate summary
    let summary: string;
    if (report.exportReady) {
      if (report.completeness === 100) {
        summary = "Complete! Ready for export.";
      } else {
        summary = `Ready for export. ${100 - report.completeness}% optional fields missing.`;
      }
    } else {
      const issues = report.blockingIssues.length;
      summary = `${issues} required field${issues === 1 ? "" : "s"} missing.`;
    }

    // Determine status color
    let statusColor: "red" | "yellow" | "green";
    if (!report.exportReady) {
      statusColor = "red";
    } else if (report.completeness < 80) {
      statusColor = "yellow";
    } else {
      statusColor = "green";
    }

    return {
      report,
      isExportReady: report.exportReady,
      completeness: report.completeness,
      missingRequired,
      missingRecommended,
      missingFiles,
      summary,
      statusColor,
    };
  }, [type, asset, linkedAssets]);
}

/**
 * Create empty state when no asset provided
 */
function createEmptyState(): AssetCompletenessState {
  return {
    report: null,
    isExportReady: false,
    completeness: 0,
    missingRequired: [],
    missingRecommended: [],
    missingFiles: [],
    summary: "No asset selected",
    statusColor: "red",
  };
}

// =============================================================================
// SCHEMA HELPERS
// =============================================================================

/**
 * Hook to get schema information for a type
 */
export function useAssetSchema(type: string): {
  schema: AssetTypeSchema | undefined;
  fields: FieldDefinition[];
  requiredFields: FieldDefinition[];
  optionalFields: FieldDefinition[];
  defaults: Record<string, unknown>;
} {
  return useMemo(() => {
    const schema = getSchema(type);
    if (!schema) {
      return {
        schema: undefined,
        fields: [],
        requiredFields: [],
        optionalFields: [],
        defaults: {},
      };
    }

    const fields = Object.values(schema.fields);
    const requiredFields = fields.filter((f) => f.requirement === "required");
    const optionalFields = fields.filter((f) => f.requirement !== "required");
    const defaults = getSchemaDefaults(type);

    return {
      schema,
      fields,
      requiredFields,
      optionalFields,
      defaults,
    };
  }, [type]);
}

/**
 * Hook to get all available asset schemas
 */
export function useAssetSchemas(): {
  schemas: AssetTypeSchema[];
  schemasByManifest: Record<string, AssetTypeSchema[]>;
} {
  return useMemo(() => {
    const schemas = getAllSchemas();
    const schemasByManifest: Record<string, AssetTypeSchema[]> = {};

    for (const schema of schemas) {
      if (!schemasByManifest[schema.manifestFile]) {
        schemasByManifest[schema.manifestFile] = [];
      }
      schemasByManifest[schema.manifestFile].push(schema);
    }

    return { schemas, schemasByManifest };
  }, []);
}

// =============================================================================
// BATCH VALIDATION
// =============================================================================

export interface BatchValidationResult {
  total: number;
  ready: number;
  notReady: number;
  byStatus: {
    complete: string[];
    ready: string[];
    incomplete: string[];
  };
  byType: Record<string, { ready: number; notReady: number }>;
}

/**
 * Hook to validate multiple assets at once
 */
export function useBatchValidation(
  assets: Array<{ id: string; type: string; data: Record<string, unknown> }>
): BatchValidationResult {
  return useMemo(() => {
    const result: BatchValidationResult = {
      total: assets.length,
      ready: 0,
      notReady: 0,
      byStatus: {
        complete: [],
        ready: [],
        incomplete: [],
      },
      byType: {},
    };

    for (const asset of assets) {
      const report = calculateCompleteness(asset.data, asset.type);

      // Track by type
      if (!result.byType[asset.type]) {
        result.byType[asset.type] = { ready: 0, notReady: 0 };
      }

      if (report.exportReady) {
        result.ready++;
        result.byType[asset.type].ready++;

        if (report.completeness === 100) {
          result.byStatus.complete.push(asset.id);
        } else {
          result.byStatus.ready.push(asset.id);
        }
      } else {
        result.notReady++;
        result.byType[asset.type].notReady++;
        result.byStatus.incomplete.push(asset.id);
      }
    }

    return result;
  }, [assets]);
}

// =============================================================================
// EXPORT VALIDATION
// =============================================================================

/**
 * Hook to check if assets are ready for export
 */
export function useExportValidation(
  assets: Array<{ id: string; type: string; data: Record<string, unknown> }>
): {
  canExport: boolean;
  readyAssets: string[];
  blockedAssets: Array<{ id: string; issues: string[] }>;
  summary: string;
} {
  return useMemo(() => {
    const readyAssets: string[] = [];
    const blockedAssets: Array<{ id: string; issues: string[] }> = [];

    for (const asset of assets) {
      const report = calculateCompleteness(asset.data, asset.type);

      if (report.exportReady) {
        readyAssets.push(asset.id);
      } else {
        blockedAssets.push({
          id: asset.id,
          issues: report.blockingIssues,
        });
      }
    }

    const canExport = blockedAssets.length === 0 && readyAssets.length > 0;

    let summary: string;
    if (canExport) {
      summary = `${readyAssets.length} asset${readyAssets.length === 1 ? "" : "s"} ready for export`;
    } else if (readyAssets.length === 0) {
      summary = "No assets ready for export";
    } else {
      summary = `${readyAssets.length} ready, ${blockedAssets.length} need attention`;
    }

    return {
      canExport,
      readyAssets,
      blockedAssets,
      summary,
    };
  }, [assets]);
}

// =============================================================================
// UTILITY: FORM BUILDER HELPER
// =============================================================================

/**
 * Generate form field configuration from schema
 */
export function useSchemaFormFields(type: string): Array<{
  key: string;
  label: string;
  description: string;
  type: "text" | "number" | "boolean" | "select" | "object" | "array";
  required: boolean;
  defaultValue?: unknown;
  example?: unknown;
}> {
  const { schema } = useAssetSchema(type);

  return useMemo(() => {
    if (!schema) return [];

    return Object.entries(schema.fields).map(([key, field]) => ({
      key,
      label: field.name,
      description: field.description,
      type: mapFieldType(field.type),
      required: field.requirement === "required",
      defaultValue: field.default,
      example: field.example,
    }));
  }, [schema]);
}

function mapFieldType(
  schemaType: FieldDefinition["type"]
): "text" | "number" | "boolean" | "select" | "object" | "array" {
  switch (schemaType) {
    case "string":
    case "path":
      return "text";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      return "object";
    case "array":
      return "array";
    default:
      return "text";
  }
}
