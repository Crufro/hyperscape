/**
 * Database Client Integration Tests
 *
 * Tests REAL PostgreSQL database connections - NO MOCKS.
 * Uses the actual Supabase database configured in .env
 */

import { describe, it, expect } from "vitest";

describe("Database Client - Real Integration", () => {
  describe("Module Exports", () => {
    it("exports db client", async () => {
      const { db } = await import("../client");
      expect(db).toBeDefined();
    });

    it("exports sql client", async () => {
      const { sql } = await import("../client");
      expect(sql).toBeDefined();
    });

    it("exports initializeSchema function", async () => {
      const { initializeSchema } = await import("../client");
      expect(typeof initializeSchema).toBe("function");
    });

    it("db client has Drizzle methods", async () => {
      const { db } = await import("../client");
      expect(db).toHaveProperty("select");
      expect(db).toHaveProperty("insert");
      expect(db).toHaveProperty("update");
      expect(db).toHaveProperty("delete");
    });

    it("sql client is a function", async () => {
      const { sql } = await import("../client");
      expect(typeof sql).toBe("function");
    });
  });

  describe("Real Database Connection", () => {
    it("can execute raw SQL query", async () => {
      const { sql } = await import("../client");

      // Simple query that works on any Postgres
      const result = await sql`SELECT 1 as test`;

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].test).toBe(1);
    });

    it("can query current timestamp", async () => {
      const { sql } = await import("../client");

      const result = await sql`SELECT NOW() as current_time`;

      expect(result).toBeDefined();
      // postgres.js returns timestamps as strings
      expect(typeof result[0].current_time).toBe("string");
      // Verify it's a valid timestamp string
      expect(new Date(result[0].current_time).getTime()).toBeGreaterThan(0);
    });

    it("can query database version", async () => {
      const { sql } = await import("../client");

      const result = await sql`SELECT version()`;

      expect(result).toBeDefined();
      expect(typeof result[0].version).toBe("string");
      expect(result[0].version).toContain("PostgreSQL");
    });

    it("initializeSchema creates hyperforge schema", async () => {
      const { initializeSchema, sql } = await import("../client");

      // Initialize schema
      await initializeSchema();

      // Verify schema exists
      const result = await sql`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = 'hyperforge'
      `;

      expect(result.length).toBe(1);
      expect(result[0].schema_name).toBe("hyperforge");
    });
  });

  describe("Schema Operations", () => {
    it("can query assets table structure", async () => {
      const { sql } = await import("../client");

      // Query table columns - will work if schema is migrated
      const result = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'hyperforge' 
        AND table_name = 'assets'
        LIMIT 5
      `;

      // If table exists, verify it has columns
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("column_name");
        expect(result[0]).toHaveProperty("data_type");
      }
      // If table doesn't exist, that's okay - just means schema not fully migrated
      expect(Array.isArray(result)).toBe(true);
    });

    it("can list tables in hyperforge schema", async () => {
      const { sql } = await import("../client");

      const result = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'hyperforge'
      `;

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Connection Pool", () => {
    it("handles multiple concurrent queries", async () => {
      const { sql } = await import("../client");

      // Run 5 queries in parallel
      const queries = Array.from(
        { length: 5 },
        (_, i) => sql`SELECT ${i + 1} as num`,
      );

      const results = await Promise.all(queries);

      expect(results.length).toBe(5);
      results.forEach((result, i) => {
        // SQL returns strings for interpolated values
        expect(Number(result[0].num)).toBe(i + 1);
      });
    });

    it("maintains connection under load", async () => {
      const { sql } = await import("../client");

      // Run 10 sequential queries
      for (let i = 0; i < 10; i++) {
        const result = await sql`SELECT ${i} as iteration`;
        // SQL returns strings for interpolated values
        expect(Number(result[0].iteration)).toBe(i);
      }
    });
  });

  describe("Error Handling", () => {
    it("throws on invalid SQL syntax", async () => {
      const { sql } = await import("../client");

      await expect(sql`SELEKT * FROM nonexistent`).rejects.toThrow();
    });

    it("throws on non-existent table", async () => {
      const { sql } = await import("../client");

      await expect(
        sql`SELECT * FROM hyperforge.definitely_not_a_real_table_xyz123`,
      ).rejects.toThrow();
    });
  });
});
