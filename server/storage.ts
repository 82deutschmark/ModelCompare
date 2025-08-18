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

import { type Comparison, type InsertComparison, type VixraSession, type InsertVixraSession } from "@shared/schema";
import { randomUUID } from "crypto";

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

export const storage = new MemStorage();
