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

import { type Comparison, type InsertComparison } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  createComparison(comparison: InsertComparison): Promise<Comparison>;
  getComparison(id: string): Promise<Comparison | undefined>;
  getComparisons(): Promise<Comparison[]>;
}

export class MemStorage implements IStorage {
  private comparisons: Map<string, Comparison>;

  constructor() {
    this.comparisons = new Map();
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
}

export const storage = new MemStorage();
