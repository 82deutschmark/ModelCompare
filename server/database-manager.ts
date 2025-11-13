/**
 * Database Connection Manager with Health Monitoring
 * 
 * Provides connection pooling, health checks, and resilient database operations
 * with automatic reconnection and transaction management.
 * 
 * Author: Claude Code
 * Date: 2025-08-26
 */

import pg from 'pg';
const { Pool } = pg;
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../shared/schema.js';
import { DatabaseError } from './errors.js';

export interface DatabaseConfig {
  connectionString: string;
  ssl?: boolean;
  maxConnections?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
}

export interface HealthCheckResult {
  isHealthy: boolean;
  latencyMs?: number;
  error?: string;
  connectionCount?: {
    total: number;
    idle: number;
    waiting: number;
  };
}

export class DatabaseManager {
  private pool: InstanceType<typeof Pool> | null = null;
  private db: NodePgDatabase<typeof schema> | null = null;
  private config: DatabaseConfig;
  private lastHealthCheck: Date | null = null;
  private healthCheckCache: HealthCheckResult | null = null;
  private readonly HEALTH_CHECK_CACHE_MS = 5000; // 5 seconds

  constructor(config: DatabaseConfig) {
    this.config = {
      maxConnections: 10,
      idleTimeoutMs: 30000,
      connectionTimeoutMs: 5000,
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      this.pool = new Pool({
        connectionString: this.config.connectionString,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
        max: this.config.maxConnections,
        idleTimeoutMillis: this.config.idleTimeoutMs,
        connectionTimeoutMillis: this.config.connectionTimeoutMs,
      });

      this.db = drizzle(this.pool, { schema });

      // Test initial connection
      await this.healthCheck();
      
      console.log('✅ Database connection pool initialized');
    } catch (error) {
      throw new DatabaseError('Failed to initialize database connection pool', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    // Return cached result if recent
    if (this.healthCheckCache && this.lastHealthCheck && 
        (Date.now() - this.lastHealthCheck.getTime()) < this.HEALTH_CHECK_CACHE_MS) {
      return this.healthCheckCache;
    }

    const startTime = Date.now();
    
    try {
      if (!this.pool) {
        const result: HealthCheckResult = {
          isHealthy: false,
          error: 'Database pool not initialized'
        };
        this.updateHealthCheckCache(result);
        return result;
      }

      // Simple connectivity test
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      
      const latencyMs = Date.now() - startTime;
      
      const result: HealthCheckResult = {
        isHealthy: true,
        latencyMs,
        connectionCount: {
          total: this.pool.totalCount,
          idle: this.pool.idleCount,
          waiting: this.pool.waitingCount
        }
      };
      
      client.release();
      this.updateHealthCheckCache(result);
      return result;
      
    } catch (error) {
      const result: HealthCheckResult = {
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown database error'
      };
      this.updateHealthCheckCache(result);
      return result;
    }
  }

  private updateHealthCheckCache(result: HealthCheckResult): void {
    this.healthCheckCache = result;
    this.lastHealthCheck = new Date();
  }

  async withTransaction<T>(operation: (db: NodePgDatabase<typeof schema>) => Promise<T>): Promise<T> {
    if (!this.db || !this.pool) {
      throw new DatabaseError('Database not initialized');
    }

    const client = await this.pool.connect();
    const transactionDb = drizzle(client, { schema });
    
    try {
      await client.query('BEGIN');
      const result = await operation(transactionDb);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new DatabaseError('Transaction failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      client.release();
    }
  }

  async withConnection<T>(operation: (db: NodePgDatabase<typeof schema>) => Promise<T>): Promise<T> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized');
    }

    try {
      return await operation(this.db);
    } catch (error) {
      throw new DatabaseError('Database operation failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  getDatabase(): NodePgDatabase<typeof schema> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized');
    }
    return this.db;
  }

  async ensureTablesExist(): Promise<void> {
    if (!this.db) {
      throw new DatabaseError('Database not initialized');
    }

    try {
      // Try to create tables using the migration SQL
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS "comparisons" (
          "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "prompt" text NOT NULL,
          "selected_models" jsonb NOT NULL,
          "responses" jsonb NOT NULL,
          "created_at" timestamp DEFAULT now()
        );
      `);
      
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS "vixra_sessions" (
          "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "variables" jsonb NOT NULL,
          "template" text NOT NULL,
          "responses" jsonb NOT NULL,
          "created_at" timestamp DEFAULT now(),
          "updated_at" timestamp DEFAULT now()
        );
      `);

      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS "debate_sessions" (
          "id" text PRIMARY KEY,
          "topic_text" text NOT NULL,
          "model1_id" text NOT NULL,
          "model2_id" text NOT NULL,
          "adversarial_level" integer NOT NULL,
          "turn_history" jsonb NOT NULL DEFAULT '[]'::jsonb,
          "model1_response_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
          "model2_response_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
          "total_cost" numeric DEFAULT '0',
          "created_at" timestamp DEFAULT now(),
          "updated_at" timestamp DEFAULT now()
        );
      `);

      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS "arc_runs" (
          "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "task_id" varchar NOT NULL,
          "challenge_name" text NOT NULL,
          "puzzle_description" text NOT NULL,
          "puzzle_payload" jsonb NOT NULL,
          "target_pattern_summary" text,
          "evaluation_focus" text,
          "status" varchar NOT NULL,
          "current_stage_id" varchar,
          "stages" jsonb NOT NULL,
          "total_cost_cents" integer,
          "created_at" timestamp DEFAULT now(),
          "updated_at" timestamp DEFAULT now(),
          "completed_at" timestamp
        );
      `);

      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS "arc_messages" (
          "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "run_id" varchar NOT NULL REFERENCES "arc_runs"("id") ON DELETE cascade,
          "role" varchar NOT NULL,
          "stage_id" varchar,
          "agent_id" varchar,
          "content" text NOT NULL,
          "reasoning" text,
          "metadata" jsonb,
          "created_at" timestamp DEFAULT now()
        );
      `);

      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS "arc_artifacts" (
          "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "run_id" varchar NOT NULL REFERENCES "arc_runs"("id") ON DELETE cascade,
          "stage_id" varchar NOT NULL,
          "type" varchar NOT NULL,
          "title" text NOT NULL,
          "description" text,
          "data" jsonb,
          "created_at" timestamp DEFAULT now()
        );
      `);

      console.log("✅ Database tables ensured");
    } catch (error) {
      console.warn("⚠️ Could not ensure tables exist:", (error as Error).message);
      throw new DatabaseError('Failed to ensure tables exist', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.db = null;
      console.log('📴 Database connection pool closed');
    }
  }

  // Getters for monitoring
  get connectionStats() {
    if (!this.pool) return null;
    
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount
    };
  }

  get isInitialized(): boolean {
    return this.db !== null && this.pool !== null;
  }
}