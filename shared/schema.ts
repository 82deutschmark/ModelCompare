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

// Vixra sessions for persisting satirical paper generation
export const vixraSessions = pgTable("vixra_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  variables: jsonb("variables").notNull().$type<Record<string, string>>(),
  template: text("template").notNull(),
  responses: jsonb("responses").notNull().$type<Record<string, {
    content: string;
    reasoning?: string;
    status: 'success' | 'error' | 'loading';
    responseTime: number;
    tokenUsage?: { input: number; output: number; reasoning?: number };
    cost?: { total: number; input: number; output: number; reasoning?: number };
    modelName: string;
    error?: string;
  }>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Prompt audit trail for structured template resolution tracking
export const promptAudits = pgTable("prompt_audits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull(),
  variables: jsonb("variables").notNull().$type<Record<string, string>>(),
  resolvedSections: jsonb("resolved_sections").notNull().$type<{
    systemInstructions?: string;
    userContent: string;
    contextContent?: string;
  }>(),
  messageStructure: jsonb("message_structure").notNull().$type<Array<{
    role: 'system' | 'user' | 'assistant' | 'context';
    contentLength: number;
    metadata?: Record<string, any>;
  }>>(),
  modelId: varchar("model_id"),
  responseContent: text("response_content"),
  responseTime: integer("response_time"),
  tokenUsage: jsonb("token_usage").$type<{ input: number; output: number; reasoning?: number }>(),
  cost: jsonb("cost").$type<{ total: number; input: number; output: number; reasoning?: number }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User authentication and billing tables
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceId: varchar("device_id"), // Hashed device-based identification for anonymous users
  credits: integer("credits").default(500), // Starting credits
  stripeCustomerId: varchar("stripe_customer_id"), // Hashed Stripe customer ID
  stripeSubscriptionId: varchar("stripe_subscription_id"), // Hashed Stripe subscription ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Session storage for authentication
export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export const insertComparisonSchema = createInsertSchema(comparisons).omit({
  id: true,
  createdAt: true,
});

export const insertVixraSessionSchema = createInsertSchema(vixraSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPromptAuditSchema = createInsertSchema(promptAudits).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions);

export type InsertComparison = z.infer<typeof insertComparisonSchema>;
export type Comparison = typeof comparisons.$inferSelect;
export type InsertVixraSession = z.infer<typeof insertVixraSessionSchema>;
export type VixraSession = typeof vixraSessions.$inferSelect;
export type InsertPromptAudit = z.infer<typeof insertPromptAuditSchema>;
export type PromptAuditRecord = typeof promptAudits.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// Additional types for authentication and billing
export type UpsertUser = Omit<InsertUser, 'id'> & { id?: string };
export type StripeInfo = {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
};

// AI Model types
export const aiModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.enum(['openai', 'anthropic', 'gemini', 'deepseek', 'grok']),
  enabled: z.boolean().default(true),
});

export type AIModel = z.infer<typeof aiModelSchema>;
