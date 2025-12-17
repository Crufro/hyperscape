/**
 * Format Asset Names
 * Utilities for formatting asset names for display
 */

/**
 * Format asset names for display
 * Converts "sword-bronze-base" to "Bronze Sword (Base)"
 */
export function formatAssetName(name: string): string {
  if (!name) return "Unnamed Asset";

  // Split by hyphens
  const parts = name.split("-");

  // Check if it's a base model
  const isBase = parts[parts.length - 1] === "base";
  if (isBase) {
    parts.pop(); // Remove 'base' from parts
  }

  // Format the name - capitalize each word
  let formatted = parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  // Add (Base) suffix if it's a base model
  if (isBase) {
    formatted += " (Base)";
  }

  return formatted;
}

/**
 * Known material tiers for detection
 */
const MATERIAL_TIERS = [
  "bronze",
  "steel",
  "mithril",
  "iron",
  "wood",
  "oak",
  "willow",
  "leather",
];

/**
 * Parse material tier from asset name
 * Returns the material if found, undefined otherwise
 */
export function parseMaterialFromName(name: string): string | undefined {
  const lowerName = name.toLowerCase();
  return MATERIAL_TIERS.find((material) => lowerName.includes(material));
}

/**
 * Check if asset name indicates a base model
 */
export function isBaseModel(name: string): boolean {
  return name.toLowerCase().endsWith("-base");
}

/**
 * Convert display name back to slug format
 * Converts "Bronze Sword (Base)" to "bronze-sword-base"
 */
export function nameToSlug(displayName: string): string {
  // Remove (Base) suffix if present
  let name = displayName.replace(/\s*\(Base\)\s*$/i, "");

  // Convert to lowercase and replace spaces with hyphens
  name = name.toLowerCase().replace(/\s+/g, "-");

  // Check if original had (Base) and add it back
  if (displayName.toLowerCase().includes("(base)")) {
    name += "-base";
  }

  return name;
}
