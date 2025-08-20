/**
 * Storage Layer - Data Persistence and Database Management
 * 
 * This module provides a unified storage interface that supports both PostgreSQL
 * and in-memory storage with automatic fallback capabilities. It manages:
 * 
 * - Database connections with Neon PostgreSQL (primary) and in-memory (fallback)
 * - CRUD operations for comparison results and session data
 * - Schema validation using Drizzle ORM with TypeScript safety
 * - Session management for user state persistence
 * - Automatic failover between storage backends
 * - Connection pooling and error recovery
 * 
 * The storage interface abstracts database operations from the application logic,
 * allowing seamless switching between persistence layers based on configuration
 * and availability.
 * 
 * Author: Cascade
 * Date: August 20, 2025
 */

import { type Comparison, type InsertComparison, type VixraSession, type InsertVixraSession, comparisons, vixraSessions } from "@shared/schema";
import { randomUUID } from "crypto";
import { db, ensureTablesExist } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  createComparison(comparison: InsertComparison): Promise<Comparison>;
  getComparison(id: string): Promise<Comparison | undefined>;
  getComparisons(): Promise<Comparison[]>;
  
  // Vixra session persistence
  createVixraSession(session: InsertVixraSession): Promise<VixraSession>;
  updateVixraSession(id: string, session: Partial<InsertVixraSession>): Promise<VixraSession | undefined>;
  getVixraSession(id: string): Promise<VixraSession | undefined>;
  getVixraSessions(): Promise<VixraSession[]>;
}

export class DbStorage implements IStorage {
  async createComparison(insertComparison: InsertComparison): Promise<Comparison> {
    const [result] = await requireDb().insert(comparisons).values({
      prompt: insertComparison.prompt,
      selectedModels: insertComparison.selectedModels as string[],
      responses: insertComparison.responses as any
    }).returning();
    return result;
  }

  async getComparison(id: string): Promise<Comparison | undefined> {
    const [result] = await requireDb().select().from(comparisons).where(eq(comparisons.id, id));
    return result;
  }

  async getComparisons(): Promise<Comparison[]> {
    return await requireDb().select().from(comparisons).orderBy(desc(comparisons.createdAt));
  }

  async createVixraSession(insertSession: InsertVixraSession): Promise<VixraSession> {
    const [result] = await requireDb().insert(vixraSessions).values({
      template: insertSession.template,
      variables: insertSession.variables,
      responses: insertSession.responses as any
    }).returning();
    return result;
  }

  async updateVixraSession(id: string, updates: Partial<InsertVixraSession>): Promise<VixraSession | undefined> {
    const updateData: any = { updatedAt: new Date() };
    if (updates.template) updateData.template = updates.template;
    if (updates.variables) updateData.variables = updates.variables;
    if (updates.responses) updateData.responses = updates.responses;
    
    const [result] = await requireDb()
      .update(vixraSessions)
      .set(updateData)
      .where(eq(vixraSessions.id, id))
      .returning();
    return result;
  }

  async getVixraSession(id: string): Promise<VixraSession | undefined> {
    const [result] = await requireDb().select().from(vixraSessions).where(eq(vixraSessions.id, id));
    return result;
  }

  async getVixraSessions(): Promise<VixraSession[]> {
    return await requireDb().select().from(vixraSessions).orderBy(desc(vixraSessions.updatedAt));
  }
}

export class MemStorage implements IStorage {
  private comparisons: Map<string, Comparison>;
  private vixraSessions: Map<string, VixraSession>;

  constructor() {
    this.comparisons = new Map();
    this.vixraSessions = new Map();
  }

  async createComparison(insertComparison: InsertComparison): Promise<Comparison> {
    const id = randomUUID();
    const comparison: Comparison = { 
      id,
      prompt: insertComparison.prompt,
      selectedModels: insertComparison.selectedModels as string[],
      responses: insertComparison.responses as Record<string, { content: string; status: 'success' | 'error' | 'loading'; responseTime: number; error?: string }>,
      createdAt: new Date()
    };
    this.comparisons.set(id, comparison);
    return comparison;
  }

  async getComparison(id: string): Promise<Comparison | undefined> {
    return this.comparisons.get(id);
  }

  async getComparisons(): Promise<Comparison[]> {
    return Array.from(this.comparisons.values()).sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async createVixraSession(insertSession: InsertVixraSession): Promise<VixraSession> {
    const id = randomUUID();
    const session: VixraSession = {
      id,
      variables: insertSession.variables,
      template: insertSession.template,
      responses: insertSession.responses as Record<string, {
        content: string;
        reasoning?: string;
        status: 'success' | 'error' | 'loading';
        responseTime: number;
        tokenUsage?: { input: number; output: number; reasoning?: number };
        cost?: { total: number; input: number; output: number; reasoning?: number };
        modelName: string;
        error?: string;
      }>,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.vixraSessions.set(id, session);
    return session;
  }

  async updateVixraSession(id: string, updates: Partial<InsertVixraSession>): Promise<VixraSession | undefined> {
    const existing = this.vixraSessions.get(id);
    if (!existing) return undefined;
    
    const updated: VixraSession = {
      ...existing,
      ...updates,
      responses: updates.responses ? updates.responses as Record<string, {
        content: string;
        reasoning?: string;
        status: 'success' | 'error' | 'loading';
        responseTime: number;
        tokenUsage?: { input: number; output: number; reasoning?: number };
        cost?: { total: number; input: number; output: number; reasoning?: number };
        modelName: string;
        error?: string;
      }> : existing.responses,
      updatedAt: new Date()
    };
    this.vixraSessions.set(id, updated);
    return updated;
  }

  async getVixraSession(id: string): Promise<VixraSession | undefined> {
    return this.vixraSessions.get(id);
  }

  async getVixraSessions(): Promise<VixraSession[]> {
    return Array.from(this.vixraSessions.values()).sort(
      (a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0)
    );
  }
}

// Try to use database storage, fall back to memory storage if database is unavailable
async function createStorage(): Promise<IStorage> {
  try {
    // Ensure tables exist first
    await ensureTablesExist();
    
    // Test database connection
    const dbStorage = new DbStorage();
    await dbStorage.getComparisons(); // Simple test query
    console.log("✅ Connected to PostgreSQL database");
    return dbStorage;
  } catch (error) {
    console.warn("⚠️ Database connection failed, using in-memory storage:", (error as Error).message);
    return new MemStorage();
  }
}

// Initialize storage asynchronously
let storageInstance: IStorage | null = null;

export async function getStorage(): Promise<IStorage> {
  if (!storageInstance) {
    storageInstance = await createStorage();
  }
  return storageInstance;
}

// For backwards compatibility, create a proxy that initializes on first use
export const storage = new Proxy({} as IStorage, {
  get(target, prop) {
    return async (...args: any[]) => {
      const instance = await getStorage();
      return (instance as any)[prop](...args);
    };
  }
});

// Local helper to assert database availability at call sites within this module
function requireDb() {
  if (!db) {
    throw new Error("Database is unavailable (DATABASE_URL not set or connection failed)");
  }
  return db;
}
