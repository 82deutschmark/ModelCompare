/**
 * Shared Schema Definitions - Database Models and TypeScript Types
 * 
 * This module defines the central data models and TypeScript types used throughout
 * the application for type safety and consistency. It provides:
 * 
 * - PostgreSQL table schemas using Drizzle ORM
 * - Zod validation schemas for request/response validation
 * - TypeScript type definitions inferred from schemas
 * - Insert and select types for database operations
 * - Shared interfaces between frontend and backend
 * 
 * All data structures flow through this schema definition to ensure type safety
 * across the entire application stack, from database to API to frontend components.
 * Changes here propagate through the entire codebase automatically via TypeScript.
 * 
 * Author: Replit Agent
 * Date: August 9, 2025
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const comparisons = pgTable("comparisons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  prompt: text("prompt").notNull(),
  selectedModels: jsonb("selected_models").notNull().$type<string[]>(),
  responses: jsonb("responses").notNull().$type<Record<string, {
    content: string;
    status: 'success' | 'error' | 'loading';
    responseTime: number;
    error?: string;
  }>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertComparisonSchema = createInsertSchema(comparisons).omit({
  id: true,
  createdAt: true,
});

export type InsertComparison = z.infer<typeof insertComparisonSchema>;
export type Comparison = typeof comparisons.$inferSelect;

// AI Model types
export const aiModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.enum(['openai', 'anthropic', 'gemini', 'deepseek', 'grok']),
  enabled: z.boolean().default(true),
});

export type AIModel = z.infer<typeof aiModelSchema>;
