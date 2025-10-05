/**
 * Database Connection Setup with Enhanced Connection Management
 * 
 * Provides both legacy compatibility and modern database management.
 * Uses DatabaseManager for new implementations while maintaining backward compatibility.
 * 
 * Author: Cascade using Claude Sonnet 4
 * Date: 2025-10-04
 * PURPOSE: Manages database connections to PostgreSQL with automatic fallback to in-memory storage.
 *          Loads environment variables at module initialization to ensure DATABASE_URL is available.
 * SRP/DRY check: Pass - Single responsibility for database connection management
 */

// Load environment variables FIRST before checking DATABASE_URL
import 'dotenv/config';

import { DatabaseManager } from './database-manager.js';
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "../shared/schema";

// Global database manager instance
let globalDatabaseManager: DatabaseManager | null = null;
let pool: InstanceType<typeof Pool> | null = null;
export let db: ReturnType<typeof drizzle> | null = null;

// Initialize modern database manager if DATABASE_URL is set
if (process.env.DATABASE_URL) {
  globalDatabaseManager = new DatabaseManager({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production"
  });

  // Legacy compatibility setup
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
  db = drizzle(pool, { schema });
}

// Legacy function to ensure tables exist (creates them if they don't)
export async function ensureTablesExist() {
  if (globalDatabaseManager?.isInitialized) {
    return await globalDatabaseManager.ensureTablesExist();
  }

  // Fallback to legacy implementation
  if (!db) {
    throw new Error("DATABASE_URL not set; database is unavailable");
  }
  try {
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

// Modern API exports
export async function initializeDatabaseManager(): Promise<DatabaseManager | null> {
  if (!globalDatabaseManager) {
    return null;
  }
  
  await globalDatabaseManager.initialize();
  return globalDatabaseManager;
}

export function getDatabaseManager(): DatabaseManager | null {
  return globalDatabaseManager;
}

// Export type helper when db is present
export type Database = typeof db;