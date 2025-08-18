/**
 * Database Connection Setup
 * 
 * Establishes PostgreSQL connection using Drizzle ORM when DATABASE_URL is set.
 * If not set, callers should catch errors from ensureTablesExist() and fall back
 * to in-memory storage. This avoids crashing at module import time.
 * 
 * Author: Claude Code (resilience update by Cascade)
 * Date: 2025-01-18
 */

import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "../shared/schema";

// Lazily initialized Pool/DB to avoid throwing at import time
let pool: InstanceType<typeof Pool> | null = null;
export let db: ReturnType<typeof drizzle> | null = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
  db = drizzle(pool, { schema });
}

// Function to ensure tables exist (creates them if they don't)
export async function ensureTablesExist() {
  if (!db) {
    // Make it explicit so callers (like storage factory) can catch and fallback
    throw new Error("DATABASE_URL not set; database is unavailable");
  }
  try {
    // Try to create tables using the migration SQL
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "comparisons" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "prompt" text NOT NULL,
        "selected_models" jsonb NOT NULL,
        "responses" jsonb NOT NULL,
        "created_at" timestamp DEFAULT now()
      );
    `);
    
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "vixra_sessions" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "variables" jsonb NOT NULL,
        "template" text NOT NULL,
        "responses" jsonb NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
    
    console.log("✅ Database tables ensured");
  } catch (error) {
    console.warn("⚠️ Could not ensure tables exist:", (error as Error).message);
    throw error;
  }
}

// Export type helper when db is present
export type Database = typeof db;