/**
 * Type Guards for HyperForge
 *
 * Centralized type guards to use instead of unsafe type assertions.
 * Import these guards instead of using `as Type` patterns.
 *
 * ## Organization
 * - Primitive guards (isString, isNumber, etc.)
 * - Enum/Union type guards (isAssetCategory, isRarity, etc.)
 * - Three.js guards (isMesh, isSkinnedMesh, etc.)
 * - Asset guards (hasModelUrl, isEquipment, etc.)
 * - Object shape guards (hasProperty, hasStringProperty, etc.)
 * - Manifest guards (isItemManifest, etc.)
 * - Generated content guards (isNPCContent, isQuestContent, etc.)
 * - Utility guards (getProperty, etc.)
 *
 * ## Legitimate Assertion Patterns (documented, not bugs)
 *
 * These patterns use `as Type` but are safe due to runtime guarantees:
 *
 * 1. **React Flow node/edge data**: ReactFlow uses generic Node<T>/Edge<T>.
 *    When we create nodes with known data types, assertions are safe.
 *    Example: `(node.data as DialogueNodeData).text`
 *
 * 2. **Three.js mesh/geometry access**: Three.js types are loose for flexibility.
 *    When we know the mesh type from creation, assertions are acceptable.
 *    Example: `mesh as THREE.SkinnedMesh`
 *
 * 3. **GLTF/VRM JSON parsing**: External format with known structure.
 *    Validated by loader, assertion documents the structure.
 *
 * 4. **Next.js dynamic route params**: Framework limitation (Promise params).
 *    Example: `context.params as unknown as Promise<{ id: string }>`
 *
 * 5. **Version control diffing**: Objects treated as generic records for diff.
 *
 * 6. **External SDK responses**: When SDK types are incomplete.
 *    We use assertions after verifying structure exists.
 *
 * 7. **Test files**: Tests often intentionally cast to test edge cases.
 *
 * ## Dangerous Patterns (use validation instead)
 *
 * - `await response.json() as Type` → Use `fetchJsonValidated()` with Zod
 * - `JSON.parse(text) as Type` → Parse and validate with Zod
 * - External API data → Use Zod schemas from `@/lib/api/schemas/`
 *
 * ## Available Validation Utilities
 *
 * - Meshy API: `@/lib/api/schemas/meshy` - parseMeshyTaskStatus()
 * - CDN Manifests: `@/lib/cdn/schemas` - parseItemManifests()
 * - API Fetch: `@/lib/utils/api` - fetchJsonValidated()
 */

import type * as THREE from "three";
import type { HyperForgeAsset, CDNAsset } from "./asset";
import type {
  AssetCategory,
  Rarity,
  EquipSlot,
  WeaponType,
  AttackType,
  NPCCategory,
  SkillType,
  ItemType,
  AssetSource,
} from "./core";

// =============================================================================
// RE-EXPORT ASSET GUARDS
// =============================================================================

// These are already defined in asset.ts but re-exported for convenience
export {
  isCDNAsset,
  isLocalAsset,
  isBaseTemplateAsset,
  isLocalAssetDraft,
  isLocalAssetProcessing,
  isLocalAssetCompleted,
  isLocalAssetFailed,
} from "./asset";

// =============================================================================
// PRIMITIVE GUARDS
// =============================================================================

/**
 * Check if value is an array (any array)
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Check if value is a finite number (not Infinity)
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value) && Number.isFinite(value);
}

/**
 * Check if value is a non-negative number (>= 0)
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && !Number.isNaN(value);
}

/**
 * Check if value is an integer
 */
export function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

/**
 * Check if value is a positive integer (> 0)
 */
export function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

// =============================================================================
// ENUM/UNION TYPE GUARDS
// =============================================================================

/**
 * Asset categories - matches core.ts AssetCategory type
 */
const ASSET_CATEGORIES: readonly AssetCategory[] = [
  "weapon", "armor", "tool", "item", "npc", "mob", "character",
  "resource", "building", "prop", "currency", "music", "biome",
  "environment", "audio", "avatar", "emote", "misc",
];

/**
 * Check if value is a valid AssetCategory
 */
export function isAssetCategory(value: unknown): value is AssetCategory {
  return typeof value === "string" && ASSET_CATEGORIES.includes(value as AssetCategory);
}

/**
 * Rarities - matches core.ts Rarity type
 */
const RARITIES: readonly Rarity[] = [
  "common", "uncommon", "rare", "epic", "legendary", "unique",
];

/**
 * Check if value is a valid Rarity
 */
export function isRarity(value: unknown): value is Rarity {
  return typeof value === "string" && RARITIES.includes(value as Rarity);
}

/**
 * Equipment slots - matches core.ts EquipSlot type
 */
const EQUIP_SLOTS: readonly EquipSlot[] = [
  "head", "chest", "legs", "feet", "hands", "cape",
  "neck", "ring", "mainhand", "offhand", "ammo",
];

/**
 * Check if value is a valid EquipSlot
 */
export function isEquipSlot(value: unknown): value is EquipSlot {
  return typeof value === "string" && EQUIP_SLOTS.includes(value as EquipSlot);
}

/**
 * Weapon types - matches core.ts WeaponType type
 */
const WEAPON_TYPES: readonly WeaponType[] = [
  "sword", "axe", "mace", "dagger", "spear", "bow", "crossbow", "staff", "wand",
];

/**
 * Check if value is a valid WeaponType
 */
export function isWeaponType(value: unknown): value is WeaponType {
  return typeof value === "string" && WEAPON_TYPES.includes(value as WeaponType);
}

/**
 * Attack types - matches core.ts AttackType type
 */
const ATTACK_TYPES: readonly AttackType[] = ["melee", "ranged", "magic"];

/**
 * Check if value is a valid AttackType
 */
export function isAttackType(value: unknown): value is AttackType {
  return typeof value === "string" && ATTACK_TYPES.includes(value as AttackType);
}

/**
 * NPC categories - matches core.ts NPCCategory type
 */
const NPC_CATEGORIES: readonly NPCCategory[] = [
  "humanoid", "monster", "animal", "undead", "demon",
  "dragon", "elemental", "merchant", "quest",
];

/**
 * Check if value is a valid NPCCategory
 */
export function isNPCCategory(value: unknown): value is NPCCategory {
  return typeof value === "string" && NPC_CATEGORIES.includes(value as NPCCategory);
}

/**
 * Skill types - matches core.ts SkillType type
 */
const SKILL_TYPES: readonly SkillType[] = [
  "attack", "strength", "defense", "ranged", "prayer", "magic", "runecrafting",
  "hitpoints", "crafting", "mining", "smithing", "fishing", "cooking", "firemaking",
  "woodcutting", "agility", "herblore", "thieving", "fletching", "slayer",
  "farming", "construction", "hunter", "summoning",
];

/**
 * Check if value is a valid SkillType
 */
export function isSkillType(value: unknown): value is SkillType {
  return typeof value === "string" && SKILL_TYPES.includes(value as SkillType);
}

/**
 * Item types - matches core.ts ItemType type
 */
const ITEM_TYPES: readonly ItemType[] = [
  "weapon", "armor", "tool", "consumable", "quest", "resource", "material", "currency",
];

/**
 * Check if value is a valid ItemType
 */
export function isItemType(value: unknown): value is ItemType {
  return typeof value === "string" && ITEM_TYPES.includes(value as ItemType);
}

/**
 * Asset sources - matches core.ts AssetSource type
 */
const ASSET_SOURCES: readonly AssetSource[] = ["CDN", "FORGE", "LOCAL", "BASE"];

/**
 * Check if value is a valid AssetSource
 */
export function isAssetSource(value: unknown): value is AssetSource {
  return typeof value === "string" && ASSET_SOURCES.includes(value as AssetSource);
}

// =============================================================================
// THREE.JS TYPE GUARDS
// =============================================================================

/**
 * Check if a Three.js Object3D is a Mesh
 */
export function isMesh(obj: THREE.Object3D): obj is THREE.Mesh {
  return obj.type === "Mesh";
}

/**
 * Check if a Three.js Object3D is a SkinnedMesh
 */
export function isSkinnedMesh(obj: THREE.Object3D): obj is THREE.SkinnedMesh {
  return obj.type === "SkinnedMesh";
}

/**
 * Check if a Three.js Object3D is a Bone
 */
export function isBone(obj: THREE.Object3D): obj is THREE.Bone {
  return obj.type === "Bone";
}

/**
 * Check if a Three.js Object3D is a Group
 */
export function isGroup(obj: THREE.Object3D): obj is THREE.Group {
  return obj.type === "Group";
}

/**
 * Check if a mesh has BufferGeometry (most meshes do)
 */
export function hasBufferGeometry(
  mesh: THREE.Mesh
): mesh is THREE.Mesh<THREE.BufferGeometry> {
  return mesh.geometry?.type?.includes("BufferGeometry") ?? false;
}

// =============================================================================
// GENERIC GUARDS
// =============================================================================

/**
 * Check if a value is non-null and non-undefined
 */
export function isNonNull<T>(value: T | null | undefined): value is T {
  return value != null;
}

/**
 * Check if a value is a non-null object (not array)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Check if an object has a specific property
 * Use sparingly - prefer typed objects
 */
export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

/**
 * Check if an object has a string property
 */
export function hasStringProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, string> {
  return hasProperty(obj, key) && typeof obj[key] === "string";
}

/**
 * Check if an object has a non-empty string property
 */
export function hasNonEmptyStringProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, string> {
  return hasStringProperty(obj, key) && (obj[key] as string).length > 0;
}

/**
 * Check if an object has a number property
 */
export function hasNumberProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, number> {
  return hasProperty(obj, key) && typeof obj[key] === "number" && !Number.isNaN(obj[key]);
}

/**
 * Check if an object has a boolean property
 */
export function hasBooleanProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, boolean> {
  return hasProperty(obj, key) && typeof obj[key] === "boolean";
}

/**
 * Check if an object has an array property
 */
export function hasArrayProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown[]> {
  return hasProperty(obj, key) && Array.isArray(obj[key]);
}

/**
 * Check if an object has an object property (non-null, non-array)
 */
export function hasObjectProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, Record<string, unknown>> {
  const val = hasProperty(obj, key) ? obj[key] : undefined;
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

/**
 * Check if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Check if a value is a number (and not NaN)
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

/**
 * Check if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

// =============================================================================
// ARRAY GUARDS
// =============================================================================

/**
 * Type guard for arrays with a specific element guard
 */
export function isArrayOf<T>(
  value: unknown,
  elementGuard: (item: unknown) => item is T
): value is T[] {
  return Array.isArray(value) && value.every(elementGuard);
}

/**
 * Check if a value is a non-empty array
 */
export function isNonEmptyArray<T>(value: T[] | null | undefined): value is [T, ...T[]] {
  return Array.isArray(value) && value.length > 0;
}

// =============================================================================
// MANIFEST GUARDS
// =============================================================================

/**
 * Item manifest shape
 */
interface ItemManifestShape {
  id: string;
  name: string;
  type: string;
}

/**
 * NPC manifest shape
 */
interface NPCManifestShape {
  id: string;
  name: string;
  category: string;
}

/**
 * Resource manifest shape
 */
interface ResourceManifestShape {
  id: string;
  name: string;
  type: string;
  modelPath: string | null;
}

/**
 * Check if an object looks like an item manifest
 */
export function isItemManifest(obj: unknown): obj is ItemManifestShape {
  return (
    isObject(obj) &&
    isString(obj["id"]) &&
    isString(obj["name"]) &&
    isString(obj["type"])
  );
}

/**
 * Check if an object looks like an NPC manifest
 */
export function isNPCManifest(obj: unknown): obj is NPCManifestShape {
  return (
    isObject(obj) &&
    isString(obj["id"]) &&
    isString(obj["name"]) &&
    isString(obj["category"])
  );
}

/**
 * Check if an object looks like a resource manifest
 */
export function isResourceManifest(obj: unknown): obj is ResourceManifestShape {
  return (
    isObject(obj) &&
    isString(obj["id"]) &&
    isString(obj["name"]) &&
    isString(obj["type"]) &&
    (obj["modelPath"] === null || isString(obj["modelPath"]))
  );
}

// =============================================================================
// GLTF GUARDS
// =============================================================================

/**
 * Check if an object has a valid GLTF structure
 */
export function isGLTFDocument(obj: unknown): obj is { asset: { version: string } } {
  return (
    isObject(obj) &&
    isObject(obj["asset"]) &&
    isString((obj["asset"] as Record<string, unknown>)["version"])
  );
}

// =============================================================================
// ASSET-SPECIFIC GUARDS
// =============================================================================

/**
 * Check if asset has a model URL (non-empty string)
 */
export function hasModelUrl(
  asset: HyperForgeAsset
): asset is HyperForgeAsset & { modelUrl: string } {
  return typeof asset.modelUrl === "string" && asset.modelUrl.length > 0;
}

/**
 * Check if asset has a model path (non-empty string)
 */
export function hasModelPath(
  asset: HyperForgeAsset
): asset is HyperForgeAsset & { modelPath: string } {
  return typeof asset.modelPath === "string" && asset.modelPath.length > 0;
}

/**
 * Check if asset has a thumbnail URL (non-empty string)
 */
export function hasThumbnailUrl(
  asset: HyperForgeAsset
): asset is HyperForgeAsset & { thumbnailUrl: string } {
  return typeof asset.thumbnailUrl === "string" && asset.thumbnailUrl.length > 0;
}

/**
 * Check if asset has a VRM model available
 */
export function hasVRM(
  asset: HyperForgeAsset
): asset is HyperForgeAsset & { hasVRM: true; vrmUrl: string } {
  return asset.hasVRM === true && typeof asset.vrmUrl === "string" && asset.vrmUrl.length > 0;
}

/**
 * Check if asset has sprites available
 */
export function hasSprites(
  asset: HyperForgeAsset
): asset is HyperForgeAsset & { hasSprites: true; sprites: NonNullable<HyperForgeAsset["sprites"]> } {
  return asset.hasSprites === true && Array.isArray(asset.sprites) && asset.sprites.length > 0;
}

/**
 * Check if asset is equipment (has equipSlot)
 */
export function isEquipment(
  asset: HyperForgeAsset
): asset is CDNAsset & { equipSlot: EquipSlot } {
  if (asset.source !== "CDN") return false;
  const cdnAsset = asset as CDNAsset;
  return isEquipSlot(cdnAsset.equipSlot);
}

/**
 * Check if asset is a weapon (has weaponType)
 */
export function isWeaponAsset(
  asset: HyperForgeAsset
): asset is CDNAsset & { weaponType: WeaponType } {
  if (asset.source !== "CDN") return false;
  const cdnAsset = asset as CDNAsset;
  return isWeaponType(cdnAsset.weaponType);
}

/**
 * Check if asset has combat bonuses
 */
export function hasCombatBonuses(
  asset: HyperForgeAsset
): asset is CDNAsset & { bonuses: NonNullable<CDNAsset["bonuses"]> } {
  if (asset.source !== "CDN") return false;
  const cdnAsset = asset as CDNAsset;
  return cdnAsset.bonuses !== undefined && isObject(cdnAsset.bonuses);
}

/**
 * Check if asset has requirements
 */
export function hasRequirements(
  asset: HyperForgeAsset
): asset is CDNAsset & { requirements: NonNullable<CDNAsset["requirements"]> } {
  if (asset.source !== "CDN") return false;
  const cdnAsset = asset as CDNAsset;
  return cdnAsset.requirements !== undefined && isObject(cdnAsset.requirements);
}

/**
 * Check if CDN asset is a resource (has harvestSkill)
 */
export function isResourceAsset(
  asset: HyperForgeAsset
): asset is CDNAsset & { harvestSkill: string } {
  if (asset.source !== "CDN") return false;
  const cdnAsset = asset as CDNAsset;
  return typeof cdnAsset.harvestSkill === "string" && cdnAsset.harvestSkill.length > 0;
}

/**
 * Check if CDN asset is an NPC (has npcCategory)
 */
export function isNPCAsset(
  asset: HyperForgeAsset
): asset is CDNAsset & { npcCategory: NPCCategory } {
  if (asset.source !== "CDN") return false;
  const cdnAsset = asset as CDNAsset;
  return isNPCCategory(cdnAsset.npcCategory);
}

/**
 * Check if asset is attackable (NPC/mob with attackable flag)
 */
export function isAttackableAsset(
  asset: HyperForgeAsset
): asset is CDNAsset & { attackable: true; combatLevel: number } {
  if (asset.source !== "CDN") return false;
  const cdnAsset = asset as CDNAsset;
  return cdnAsset.attackable === true && typeof cdnAsset.combatLevel === "number";
}

// =============================================================================
// GENERATED CONTENT TYPE GUARDS
// =============================================================================

import type {
  GeneratedQuestContent,
  GeneratedAreaContent,
  GeneratedItemContent,
} from "./game/content-types";
import type { GeneratedNPCContent } from "./game/npc-types";

/**
 * Generated content with discriminant field
 */
interface GeneratedContentBase {
  type: "npc" | "quest" | "area" | "item";
  data?: GeneratedNPCContent | GeneratedQuestContent | GeneratedAreaContent | GeneratedItemContent;
}

/**
 * Check if generated content is NPC type
 */
export function isNPCContent(content: GeneratedContentBase): content is GeneratedContentBase & { 
  type: "npc"; 
  data: GeneratedNPCContent;
} {
  return content.type === "npc" && content.data !== undefined && "npc" in content.data;
}

/**
 * Check if generated content is Quest type
 */
export function isQuestContent(content: GeneratedContentBase): content is GeneratedContentBase & { 
  type: "quest"; 
  data: GeneratedQuestContent;
} {
  return content.type === "quest" && content.data !== undefined && "quest" in content.data;
}

/**
 * Check if generated content is Area type
 */
export function isAreaContent(content: GeneratedContentBase): content is GeneratedContentBase & { 
  type: "area"; 
  data: GeneratedAreaContent;
} {
  return content.type === "area" && content.data !== undefined && "area" in content.data;
}

/**
 * Check if generated content is Item type
 */
export function isItemContent(content: GeneratedContentBase): content is GeneratedContentBase & { 
  type: "item"; 
  data: GeneratedItemContent;
} {
  return content.type === "item" && content.data !== undefined && "item" in content.data;
}

// =============================================================================
// UTILITY FOR SAFE PROPERTY ACCESS
// =============================================================================

/**
 * Safely get a property from an unknown object
 * Returns undefined if property doesn't exist or value is not of expected type
 */
export function getProperty<T>(
  obj: unknown,
  key: string,
  guard: (v: unknown) => v is T
): T | undefined {
  if (!isObject(obj)) return undefined;
  const value = obj[key];
  return guard(value) ? value : undefined;
}

/**
 * Get a string property or undefined
 */
export function getStringProperty(obj: unknown, key: string): string | undefined {
  return getProperty(obj, key, isString);
}

/**
 * Get a number property or undefined
 */
export function getNumberProperty(obj: unknown, key: string): number | undefined {
  return getProperty(obj, key, isNumber);
}

/**
 * Get a nested object property or undefined
 */
export function getObjectProperty(
  obj: unknown,
  key: string
): Record<string, unknown> | undefined {
  return getProperty(obj, key, isObject);
}
