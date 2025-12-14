/**
 * Hyperforge Database Schema
 * Standalone SQLite database for asset creation and multi-product publishing
 */

import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ============================================================================
// USERS - Creator profiles linked to Privy auth
// ============================================================================

export const users = sqliteTable("users", {
  // Primary key from Privy (shared identity across products)
  userId: text("user_id").primaryKey(),

  // Profile info
  email: text("email"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),

  // Subscription & limits
  subscriptionTier: text("subscription_tier").notNull().default("free"), // free | pro | studio
  storageUsedBytes: integer("storage_used_bytes").notNull().default(0),
  storageQuotaBytes: integer("storage_quota_bytes")
    .notNull()
    .default(1073741824), // 1GB default

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
  assets: many(assets),
  projects: many(projects),
  apiKeys: many(userApiKeys),
}));

// ============================================================================
// USER API KEYS - Encrypted storage for user's AI service keys
// ============================================================================

export const userApiKeys = sqliteTable("user_api_keys", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.userId, { onDelete: "cascade" }),

  // Key identification
  service: text("service").notNull(), // openai | meshy | elevenlabs | ai_gateway
  keyName: text("key_name"), // User-friendly name

  // Encrypted key value (encrypt before storing!)
  encryptedKey: text("encrypted_key").notNull(),

  // Metadata
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const userApiKeysRelations = relations(userApiKeys, ({ one }) => ({
  user: one(users, {
    fields: [userApiKeys.userId],
    references: [users.userId],
  }),
}));

// ============================================================================
// PROJECTS - Grouping/workspace for assets
// ============================================================================

export const projects = sqliteTable("projects", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.userId, { onDelete: "cascade" }),

  // Project info
  name: text("name").notNull(),
  description: text("description"),
  coverImagePath: text("cover_image_path"),

  // Settings
  defaultVisibility: text("default_visibility").notNull().default("private"),
  defaultLicense: text("default_license").notNull().default("personal"),

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.userId],
  }),
  assets: many(assets),
}));

// ============================================================================
// ASSETS - Created assets with generation metadata
// ============================================================================

export const assets = sqliteTable("assets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  creatorId: text("creator_id")
    .notNull()
    .references(() => users.userId, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),

  // Asset identification
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // character | item | environment | equipment | weapon | armor
  category: text("category"), // Sub-category
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),

  // File storage (local paths)
  localPath: text("local_path"), // Primary model file
  thumbnailPath: text("thumbnail_path"),
  previewPaths: text("preview_paths", { mode: "json" }).$type<string[]>(),
  fileSizeBytes: integer("file_size_bytes"),

  // CDN storage (after publish)
  cdnUrl: text("cdn_url"),
  cdnThumbnailUrl: text("cdn_thumbnail_url"),

  // Generation metadata
  prompt: text("prompt"),
  negativePrompt: text("negative_prompt"),
  generationParams: text("generation_params", { mode: "json" }).$type<
    Record<string, unknown>
  >(),
  aiModel: text("ai_model"), // Model used for generation
  pipelineId: text("pipeline_id"), // Reference to generation pipeline

  // Status & workflow
  status: text("status").notNull().default("draft"), // draft | processing | completed | failed | approved
  visibility: text("visibility").notNull().default("private"), // private | unlisted | public
  license: text("license").notNull().default("personal"), // personal | commercial | exclusive

  // Multi-product publishing
  publishedTo: text("published_to", { mode: "json" }).$type<
    Array<{
      productId: string;
      externalId: string;
      status: "pending" | "approved" | "rejected";
      publishedAt: string;
    }>
  >(),

  // Versioning
  version: integer("version").notNull().default(1),
  parentAssetId: text("parent_asset_id"),

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const assetsRelations = relations(assets, ({ one, many }) => ({
  creator: one(users, {
    fields: [assets.creatorId],
    references: [users.userId],
  }),
  project: one(projects, {
    fields: [assets.projectId],
    references: [projects.id],
  }),
  publishHistory: many(publishHistory),
}));

// ============================================================================
// CONNECTED PRODUCTS - Registry of products that can receive assets
// ============================================================================

export const connectedProducts = sqliteTable("connected_products", {
  id: text("id").primaryKey(), // Slug: "hyperscape", "future-game"
  name: text("name").notNull(),
  description: text("description"),
  iconUrl: text("icon_url"),

  // API connection
  apiEndpoint: text("api_endpoint"), // Webhook URL for publishing
  webhookSecret: text("webhook_secret"), // HMAC secret for verification

  // Asset requirements
  assetRequirements: text("asset_requirements", { mode: "json" }).$type<{
    formats: string[];
    maxPolycountLow: number;
    maxPolycountHigh: number;
    textureSize: number;
    requiredMetadata: string[];
  }>(),

  // Status
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isPrimary: integer("is_primary", { mode: "boolean" })
    .notNull()
    .default(false), // Hyperscape = primary

  // Timestamps
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const connectedProductsRelations = relations(
  connectedProducts,
  ({ many }) => ({
    publishHistory: many(publishHistory),
  }),
);

// ============================================================================
// PUBLISH HISTORY - Audit log of all publishing actions
// ============================================================================

export const publishHistory = sqliteTable("publish_history", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  assetId: text("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => connectedProducts.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.userId, { onDelete: "cascade" }),

  // Action details
  action: text("action").notNull(), // published | unpublished | updated | rejected
  externalId: text("external_id"), // ID in target product's database
  cdnUrl: text("cdn_url"), // CDN URL at time of publish

  // Response from target product
  responseStatus: integer("response_status"),
  responseMessage: text("response_message"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),

  // Timestamp
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const publishHistoryRelations = relations(publishHistory, ({ one }) => ({
  asset: one(assets, {
    fields: [publishHistory.assetId],
    references: [assets.id],
  }),
  product: one(connectedProducts, {
    fields: [publishHistory.productId],
    references: [connectedProducts.id],
  }),
  user: one(users, {
    fields: [publishHistory.userId],
    references: [users.userId],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type UserApiKey = typeof userApiKeys.$inferSelect;
export type NewUserApiKey = typeof userApiKeys.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;

export type ConnectedProduct = typeof connectedProducts.$inferSelect;
export type NewConnectedProduct = typeof connectedProducts.$inferInsert;

export type PublishHistoryEntry = typeof publishHistory.$inferSelect;
export type NewPublishHistoryEntry = typeof publishHistory.$inferInsert;
