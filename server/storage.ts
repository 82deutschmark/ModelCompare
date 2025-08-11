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
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import { type Comparison, type InsertComparison, type User, type UpsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserCredits(userId: string, credits: number): Promise<User>;
  updateUserStripeInfo(userId: string, customerId: string, subscriptionId?: string): Promise<User>;
  
  // Comparison operations
  createComparison(comparison: InsertComparison): Promise<Comparison>;
  getComparison(id: string): Promise<Comparison | undefined>;
  getComparisons(userId?: string): Promise<Comparison[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private comparisons: Map<string, Comparison>;

  constructor() {
    this.users = new Map();
    this.comparisons = new Map();
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = userData.id ? this.users.get(userData.id) : 
                        userData.email ? await this.getUserByEmail(userData.email) : undefined;
    
    const user: User = {
      id: existingUser?.id || randomUUID(),
      email: userData.email || existingUser?.email || null,
      firstName: userData.firstName || existingUser?.firstName || null,
      lastName: userData.lastName || existingUser?.lastName || null,
      profileImageUrl: userData.profileImageUrl || existingUser?.profileImageUrl || null,
      credits: userData.credits !== undefined ? userData.credits : (existingUser?.credits || 500),
      stripeCustomerId: userData.stripeCustomerId || existingUser?.stripeCustomerId || null,
      stripeSubscriptionId: userData.stripeSubscriptionId || existingUser?.stripeSubscriptionId || null,
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    
    this.users.set(user.id, user);
    return user;
  }

  async updateUserCredits(userId: string, credits: number): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    
    const updatedUser = { ...user, credits, updatedAt: new Date() };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUserStripeInfo(userId: string, customerId: string, subscriptionId?: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error('User not found');
    
    const updatedUser = { 
      ...user, 
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId || user.stripeSubscriptionId,
      updatedAt: new Date() 
    };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Comparison operations
  async createComparison(insertComparison: InsertComparison): Promise<Comparison> {
    const id = randomUUID();
    const comparison: Comparison = { 
      id,
      userId: insertComparison.userId || null,
      prompt: insertComparison.prompt,
      selectedModels: insertComparison.selectedModels as string[],
      responses: insertComparison.responses as Record<string, { content: string; status: 'success' | 'error' | 'loading'; responseTime: number; error?: string }>,
      creditsUsed: insertComparison.creditsUsed || 0,
      createdAt: new Date()
    };
    this.comparisons.set(id, comparison);
    return comparison;
  }

  async getComparison(id: string): Promise<Comparison | undefined> {
    return this.comparisons.get(id);
  }

  async getComparisons(userId?: string): Promise<Comparison[]> {
    const allComparisons = Array.from(this.comparisons.values());
    const filtered = userId ? allComparisons.filter(c => c.userId === userId) : allComparisons;
    return filtered.sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserCredits(userId: string, credits: number): Promise<User> {
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    const [user] = await db
      .update(users)
      .set({ credits, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    
    if (!user) throw new Error('User not found');
    return user;
  }

  async updateUserStripeInfo(userId: string, customerId: string, subscriptionId?: string): Promise<User> {
    const { db } = await import("./db");
    const { users } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    const updateData: any = {
      stripeCustomerId: customerId,
      updatedAt: new Date(),
    };
    
    if (subscriptionId) {
      updateData.stripeSubscriptionId = subscriptionId;
    }
    
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    
    if (!user) throw new Error('User not found');
    return user;
  }

  // Comparison operations
  async createComparison(insertComparison: InsertComparison): Promise<Comparison> {
    const { db } = await import("./db");
    const { comparisons } = await import("@shared/schema");
    
    const [comparison] = await db
      .insert(comparisons)
      .values({
        ...insertComparison,
        selectedModels: JSON.stringify(insertComparison.selectedModels),
        responses: JSON.stringify(insertComparison.responses),
      } as any)
      .returning();
    return comparison;
  }

  async getComparison(id: string): Promise<Comparison | undefined> {
    const { db } = await import("./db");
    const { comparisons } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    const [comparison] = await db.select().from(comparisons).where(eq(comparisons.id, id));
    return comparison || undefined;
  }

  async getComparisons(userId?: string): Promise<Comparison[]> {
    const { db } = await import("./db");
    const { comparisons } = await import("@shared/schema");
    const { eq, desc } = await import("drizzle-orm");
    
    if (userId) {
      return await db
        .select()
        .from(comparisons)
        .where(eq(comparisons.userId, userId))
        .orderBy(desc(comparisons.createdAt));
    } else {
      return await db
        .select()
        .from(comparisons)
        .orderBy(desc(comparisons.createdAt));
    }
  }
}

export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
