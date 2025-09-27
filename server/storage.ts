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

import { type Comparison, type InsertComparison, type VixraSession, type InsertVixraSession, type PromptAuditRecord, type InsertPromptAudit, type User, type InsertUser, type UpsertUser, type StripeInfo, comparisons, vixraSessions, promptAudits, users } from "@shared/schema";
import { randomUUID } from "crypto";
import { db, ensureTablesExist } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  createComparison(comparison: InsertComparison): Promise<Comparison>;
  getComparison(id: string): Promise<Comparison | undefined>;
  getComparisons(): Promise<Comparison[]>;
  
  // Vixra session persistence
  createVixraSession(session: InsertVixraSession): Promise<VixraSession>;
  updateVixraSession(id: string, session: Partial<InsertVixraSession>): Promise<VixraSession | undefined>;
  getVixraSession(id: string): Promise<VixraSession | undefined>;
  getVixraSessions(): Promise<VixraSession[]>;
  
  // Prompt audit trail
  createPromptAudit(audit: InsertPromptAudit): Promise<PromptAuditRecord>;
  getPromptAudit(id: string): Promise<PromptAuditRecord | undefined>;
  getPromptAudits(templateId?: string): Promise<PromptAuditRecord[]>;
  
  // User authentication operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(userData: UpsertUser): Promise<User>;
  
  // Credit management operations
  getUserCredits(userId: string): Promise<number>;
  deductCredits(userId: string, amount: number): Promise<User>;
  addCredits(userId: string, amount: number): Promise<User>;
  
  // Stripe integration operations
  updateStripeCustomerId(userId: string, customerId: string): Promise<User>;
  updateUserStripeInfo(userId: string, info: StripeInfo): Promise<User>;
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

  async createPromptAudit(insertAudit: InsertPromptAudit): Promise<PromptAuditRecord> {
    const [result] = await requireDb().insert(promptAudits).values({
      templateId: insertAudit.templateId,
      variables: insertAudit.variables,
      resolvedSections: insertAudit.resolvedSections as any,
      messageStructure: insertAudit.messageStructure as any,
      modelId: insertAudit.modelId,
      responseContent: insertAudit.responseContent,
      responseTime: insertAudit.responseTime,
      tokenUsage: insertAudit.tokenUsage as any,
      cost: insertAudit.cost as any
    }).returning();
    return result;
  }

  async getPromptAudit(id: string): Promise<PromptAuditRecord | undefined> {
    const [result] = await requireDb().select().from(promptAudits).where(eq(promptAudits.id, id));
    return result;
  }

  async getPromptAudits(templateId?: string): Promise<PromptAuditRecord[]> {
    const query = requireDb().select().from(promptAudits);
    if (templateId) {
      return await query.where(eq(promptAudits.templateId, templateId)).orderBy(desc(promptAudits.createdAt));
    }
    return await query.orderBy(desc(promptAudits.createdAt));
  }

  // User authentication operations
  async getUser(id: string): Promise<User | undefined> {
    const [result] = await requireDb().select().from(users).where(eq(users.id, id));
    return result;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [result] = await requireDb().select().from(users).where(eq(users.email, email));
    return result;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (userData.id) {
      // Update existing user
      const [result] = await requireDb()
        .update(users)
        .set({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          credits: userData.credits,
          stripeCustomerId: userData.stripeCustomerId,
          stripeSubscriptionId: userData.stripeSubscriptionId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userData.id))
        .returning();
      return result;
    } else {
      // Create new user
      const [result] = await requireDb()
        .insert(users)
        .values({
          email: userData.email!,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          credits: userData.credits ?? 500,
          stripeCustomerId: userData.stripeCustomerId,
          stripeSubscriptionId: userData.stripeSubscriptionId,
        })
        .returning();
      return result;
    }
  }

  // Credit management operations
  async getUserCredits(userId: string): Promise<number> {
    const [result] = await requireDb()
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, userId));
    return result?.credits ?? 0;
  }

  async deductCredits(userId: string, amount: number): Promise<User> {
    const [result] = await requireDb()
      .update(users)
      .set({
        credits: sql`${users.credits} - ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result;
  }

  async addCredits(userId: string, amount: number): Promise<User> {
    const [result] = await requireDb()
      .update(users)
      .set({
        credits: sql`${users.credits} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result;
  }

  // Stripe integration operations
  async updateStripeCustomerId(userId: string, customerId: string): Promise<User> {
    const [result] = await requireDb()
      .update(users)
      .set({
        stripeCustomerId: customerId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result;
  }

  async updateUserStripeInfo(userId: string, info: StripeInfo): Promise<User> {
    const [result] = await requireDb()
      .update(users)
      .set({
        stripeCustomerId: info.stripeCustomerId,
        stripeSubscriptionId: info.stripeSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return result;
  }
}

export class MemStorage implements IStorage {
  private comparisons: Map<string, Comparison>;
  private vixraSessions: Map<string, VixraSession>;
  private promptAudits: Map<string, PromptAuditRecord>;
  private users: Map<string, User>;

  constructor() {
    this.comparisons = new Map();
    this.vixraSessions = new Map();
    this.promptAudits = new Map();
    this.users = new Map();
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

  async createPromptAudit(insertAudit: InsertPromptAudit): Promise<PromptAuditRecord> {
    const id = randomUUID();
    const audit: PromptAuditRecord = {
      id,
      templateId: insertAudit.templateId,
      variables: insertAudit.variables,
      resolvedSections: insertAudit.resolvedSections as any,
      messageStructure: insertAudit.messageStructure as any,
      modelId: insertAudit.modelId || null,
      responseContent: insertAudit.responseContent || null,
      responseTime: insertAudit.responseTime || null,
      tokenUsage: insertAudit.tokenUsage ? {
        input: insertAudit.tokenUsage.input,
        output: insertAudit.tokenUsage.output,
        reasoning: insertAudit.tokenUsage.reasoning as number | undefined
      } : null,
      cost: insertAudit.cost ? {
        total: insertAudit.cost.total,
        input: insertAudit.cost.input,
        output: insertAudit.cost.output,
        reasoning: insertAudit.cost.reasoning as number | undefined
      } : null,
      createdAt: new Date()
    };
    this.promptAudits.set(id, audit);
    return audit;
  }

  async getPromptAudit(id: string): Promise<PromptAuditRecord | undefined> {
    return this.promptAudits.get(id);
  }

  async getPromptAudits(templateId?: string): Promise<PromptAuditRecord[]> {
    const audits = Array.from(this.promptAudits.values());
    const filtered = templateId ? audits.filter(a => a.templateId === templateId) : audits;
    return filtered.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  // User authentication operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const users = Array.from(this.users.values());
    return users.find(user => user.email === email);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (userData.id) {
      // Update existing user
      const existing = this.users.get(userData.id);
      if (!existing) {
        throw new Error(`User with id ${userData.id} not found`);
      }
      
      const updated: User = {
        ...existing,
        email: userData.email || existing.email,
        firstName: userData.firstName ?? existing.firstName,
        lastName: userData.lastName ?? existing.lastName,
        profileImageUrl: userData.profileImageUrl ?? existing.profileImageUrl,
        credits: userData.credits ?? existing.credits,
        stripeCustomerId: userData.stripeCustomerId ?? existing.stripeCustomerId,
        stripeSubscriptionId: userData.stripeSubscriptionId ?? existing.stripeSubscriptionId,
        updatedAt: new Date(),
      };
      
      this.users.set(userData.id, updated);
      return updated;
    } else {
      // Create new user
      const id = randomUUID();
      const newUser: User = {
        id,
        email: userData.email!,
        firstName: userData.firstName ?? null,
        lastName: userData.lastName ?? null,
        profileImageUrl: userData.profileImageUrl ?? null,
        credits: userData.credits ?? 500,
        stripeCustomerId: userData.stripeCustomerId ?? null,
        stripeSubscriptionId: userData.stripeSubscriptionId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.users.set(id, newUser);
      return newUser;
    }
  }

  // Credit management operations
  async getUserCredits(userId: string): Promise<number> {
    const user = this.users.get(userId);
    return user?.credits ?? 0;
  }

  async deductCredits(userId: string, amount: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const currentCredits = user.credits ?? 0;
    const updated: User = {
      ...user,
      credits: Math.max(0, currentCredits - amount),
      updatedAt: new Date(),
    };
    
    this.users.set(userId, updated);
    return updated;
  }

  async addCredits(userId: string, amount: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const currentCredits = user.credits ?? 0;
    const updated: User = {
      ...user,
      credits: currentCredits + amount,
      updatedAt: new Date(),
    };
    
    this.users.set(userId, updated);
    return updated;
  }

  // Stripe integration operations
  async updateStripeCustomerId(userId: string, customerId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updated: User = {
      ...user,
      stripeCustomerId: customerId,
      updatedAt: new Date(),
    };
    
    this.users.set(userId, updated);
    return updated;
  }

  async updateUserStripeInfo(userId: string, info: StripeInfo): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    const updated: User = {
      ...user,
      stripeCustomerId: info.stripeCustomerId ?? user.stripeCustomerId,
      stripeSubscriptionId: info.stripeSubscriptionId ?? user.stripeSubscriptionId,
      updatedAt: new Date(),
    };
    
    this.users.set(userId, updated);
    return updated;
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
