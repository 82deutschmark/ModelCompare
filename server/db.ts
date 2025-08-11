/**
 * Database Connection Setup
 * 
 * Configures and exports the database connection using Drizzle ORM with
 * PostgreSQL via Neon serverless driver. This module handles:
 * 
 * - Database connection pool configuration
 * - Schema binding for type-safe operations
 * - WebSocket configuration for serverless environments
 * - Environment variable validation
 * 
 * Author: Replit Agent
 * Date: August 11, 2025
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });