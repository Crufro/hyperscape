/**
 * Diff Utilities for HyperForge Version Control
 *
 * Deep diff calculation, formatting, and patch application.
 */

import type { FieldChange, ChangeType, DiffSummary } from "./version-types";

// =============================================================================
// DIFF CALCULATION
// =============================================================================

/**
 * Check if a value is a plain object (not array, null, Date, etc.)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof RegExp)
  );
}

/**
 * Get the type of a value for comparison purposes
 */
function getValueType(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";
  if (value instanceof Date) return "date";
  return typeof value;
}

/**
 * Check if two values are equal (deep comparison for objects/arrays)
 */
function areValuesEqual(a: unknown, b: unknown): boolean {
  // Same reference or primitive equality
  if (a === b) return true;

  // Different types
  if (getValueType(a) !== getValueType(b)) return false;

  // Handle null/undefined
  if (a === null || a === undefined) return a === b;

  // Handle dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => areValuesEqual(item, b[index]));
  }

  // Handle objects
  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => areValuesEqual(a[key], b[key]));
  }

  return false;
}

/**
 * Calculate deep diff between two objects
 * Returns an array of field changes with paths
 */
export function calculateDiff(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  basePath: string = ""
): FieldChange[] {
  const changes: FieldChange[] = [];

  // Get all unique keys from both objects
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    const path = basePath ? `${basePath}.${key}` : key;
    const oldValue = oldObj[key];
    const newValue = newObj[key];

    const oldExists = key in oldObj;
    const newExists = key in newObj;

    if (!oldExists && newExists) {
      // Field was added
      changes.push({
        path,
        type: "added",
        newValue,
      });
    } else if (oldExists && !newExists) {
      // Field was deleted
      changes.push({
        path,
        type: "deleted",
        oldValue,
      });
    } else if (isPlainObject(oldValue) && isPlainObject(newValue)) {
      // Both are objects, recurse
      const nestedChanges = calculateDiff(oldValue, newValue, path);
      changes.push(...nestedChanges);
    } else if (!areValuesEqual(oldValue, newValue)) {
      // Values are different
      changes.push({
        path,
        type: "modified",
        oldValue,
        newValue,
      });
    }
  }

  return changes;
}

/**
 * Calculate summary counts from changes
 */
export function calculateSummary(changes: FieldChange[]): DiffSummary {
  return changes.reduce(
    (summary, change) => {
      summary[change.type]++;
      return summary;
    },
    { added: 0, modified: 0, deleted: 0 }
  );
}

// =============================================================================
// DIFF FORMATTING
// =============================================================================

/**
 * Format a single change for human-readable display
 */
function formatChange(change: FieldChange): string {
  const { path, type, oldValue, newValue } = change;

  switch (type) {
    case "added":
      return `+ ${path}: ${formatValue(newValue)}`;
    case "deleted":
      return `- ${path}: ${formatValue(oldValue)}`;
    case "modified":
      return `~ ${path}: ${formatValue(oldValue)} → ${formatValue(newValue)}`;
    default:
      return `? ${path}`;
  }
}

/**
 * Format a value for display (truncate long values)
 */
function formatValue(value: unknown, maxLength: number = 50): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") {
    return value.length > maxLength
      ? `"${value.substring(0, maxLength)}..."`
      : `"${value}"`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    return `{${keys.length} properties}`;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

/**
 * Format an entire diff for human-readable display
 */
export function formatDiff(changes: FieldChange[]): string {
  if (changes.length === 0) {
    return "No changes";
  }

  const lines: string[] = [];
  const summary = calculateSummary(changes);

  // Add summary header
  const summaryParts: string[] = [];
  if (summary.added > 0) summaryParts.push(`+${summary.added} added`);
  if (summary.modified > 0) summaryParts.push(`~${summary.modified} modified`);
  if (summary.deleted > 0) summaryParts.push(`-${summary.deleted} deleted`);
  lines.push(`Changes: ${summaryParts.join(", ")}`);
  lines.push("---");

  // Group changes by top-level path
  const grouped = groupChangesByTopLevel(changes);

  for (const [section, sectionChanges] of Object.entries(grouped)) {
    if (sectionChanges.length > 0) {
      lines.push(`[${section}]`);
      for (const change of sectionChanges) {
        lines.push(`  ${formatChange(change)}`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Group changes by their top-level path segment
 */
function groupChangesByTopLevel(
  changes: FieldChange[]
): Record<string, FieldChange[]> {
  const grouped: Record<string, FieldChange[]> = {};

  for (const change of changes) {
    const topLevel = change.path.split(".")[0];
    if (!grouped[topLevel]) {
      grouped[topLevel] = [];
    }
    grouped[topLevel].push(change);
  }

  return grouped;
}

/**
 * Format diff as structured data for UI display
 */
export interface FormattedDiffSection {
  path: string;
  changes: FormattedChange[];
}

export interface FormattedChange {
  path: string;
  shortPath: string;
  type: ChangeType;
  oldValue: string;
  newValue: string;
  oldValueRaw: unknown;
  newValueRaw: unknown;
}

export function formatDiffForUI(changes: FieldChange[]): FormattedDiffSection[] {
  const grouped = groupChangesByTopLevel(changes);
  const sections: FormattedDiffSection[] = [];

  for (const [path, sectionChanges] of Object.entries(grouped)) {
    sections.push({
      path,
      changes: sectionChanges.map((change) => ({
        path: change.path,
        shortPath: change.path.substring(path.length + 1) || path,
        type: change.type,
        oldValue: formatValue(change.oldValue, 100),
        newValue: formatValue(change.newValue, 100),
        oldValueRaw: change.oldValue,
        newValueRaw: change.newValue,
      })),
    });
  }

  return sections;
}

// =============================================================================
// DIFF APPLICATION
// =============================================================================

/**
 * Set a value at a nested path in an object
 */
function setValueAtPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!isPlainObject(current[part])) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Delete a value at a nested path in an object
 */
function deleteValueAtPath(obj: Record<string, unknown>, path: string): void {
  const parts = path.split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!isPlainObject(current[part])) {
      return; // Path doesn't exist
    }
    current = current[part] as Record<string, unknown>;
  }

  delete current[parts[parts.length - 1]];
}

/**
 * Apply a diff to an object to transform it
 * Note: This mutates the input object
 */
export function applyDiff(
  obj: Record<string, unknown>,
  changes: FieldChange[]
): Record<string, unknown> {
  // Apply changes in order: deletes first, then adds, then modifications
  const sorted = [...changes].sort((a, b) => {
    const order = { deleted: 0, added: 1, modified: 2 };
    return order[a.type] - order[b.type];
  });

  for (const change of sorted) {
    switch (change.type) {
      case "deleted":
        deleteValueAtPath(obj, change.path);
        break;
      case "added":
      case "modified":
        setValueAtPath(obj, change.path, change.newValue);
        break;
    }
  }

  return obj;
}

/**
 * Apply a diff in reverse (for rollback)
 */
export function applyDiffReverse(
  obj: Record<string, unknown>,
  changes: FieldChange[]
): Record<string, unknown> {
  // Reverse the changes: added becomes deleted, deleted becomes added
  const reversed = changes.map((change) => ({
    ...change,
    type: reverseChangeType(change.type),
    oldValue: change.newValue,
    newValue: change.oldValue,
  }));

  return applyDiff(obj, reversed);
}

function reverseChangeType(type: ChangeType): ChangeType {
  switch (type) {
    case "added":
      return "deleted";
    case "deleted":
      return "added";
    case "modified":
      return "modified";
  }
}

// =============================================================================
// HASHING
// =============================================================================

/**
 * Generate a simple hash for an object (for quick comparison)
 * Uses a deterministic JSON string and FNV-1a hash
 */
export function hashObject(obj: Record<string, unknown>): string {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  let hash = 2166136261; // FNV offset basis

  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619); // FNV prime
  }

  // Convert to hex string
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
