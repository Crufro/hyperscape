/**
 * Database Client
 * Singleton Drizzle client for Hyperforge SQLite database
 */

import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../../../lib/db/schema";
import path from "path";

// Database file path
const DB_PATH =
  process.env.HYPERFORGE_DB_PATH || path.join(process.cwd(), "hyperforge.db");

// Create SQLite database connection
const sqlite = new Database(DB_PATH);

// Enable WAL mode for better performance
sqlite.pragma("journal_mode = WAL");

// Create Drizzle client
export const db = drizzle(sqlite, { schema });

// Export for migrations
export { sqlite };
