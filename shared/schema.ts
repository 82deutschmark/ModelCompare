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
import { pgTable, text, varchar, timestamp, jsonb, integer, numeric } from "drizzle-orm/pg-core";
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
// ZDR (Zero Data Retention): NO PII - deviceID-only authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceId: varchar("device_id"), // Hashed device-based identification (NO PII)
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
// Luigi pipeline persistence
export const luigiRuns = pgTable("luigi_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  missionName: text("mission_name").notNull(),
  objective: text("objective").notNull(),
  constraints: text("constraints"),
  successCriteria: text("success_criteria"),
  stakeholderNotes: text("stakeholder_notes"),
  userPrompt: text("user_prompt").notNull(),
  status: varchar("status").notNull(),
  currentStageId: varchar("current_stage_id"),
  stages: jsonb("stages").notNull().$type<Record<string, unknown>>(),
  totalCostCents: integer("total_cost_cents"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const luigiMessages = pgTable("luigi_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: varchar("run_id")
    .notNull()
    .references(() => luigiRuns.id, { onDelete: 'cascade' }),
  role: varchar("role").notNull(),
  stageId: varchar("stage_id"),
  agentId: varchar("agent_id"),
  toolName: varchar("tool_name"),
  content: text("content").notNull(),
  reasoning: text("reasoning"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const luigiArtifacts = pgTable("luigi_artifacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: varchar("run_id")
    .notNull()
    .references(() => luigiRuns.id, { onDelete: 'cascade' }),
  stageId: varchar("stage_id").notNull(),
  type: varchar("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  storagePath: text("storage_path"),
  data: jsonb("data").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Debate sessions for persisting debate state and conversation chaining
export const debateSessions = pgTable('debate_sessions', {
  id: text('id').primaryKey(),
  topicText: text('topic_text').notNull(),
  model1Id: text('model1_id').notNull(),
  model2Id: text('model2_id').notNull(),
  adversarialLevel: integer('adversarial_level').notNull(),
  turnHistory: jsonb('turn_history').notNull(), // Array of turn records
  model1ResponseIds: jsonb('model1_response_ids').notNull(), // Array of response IDs
  model2ResponseIds: jsonb('model2_response_ids').notNull(), // Array of response IDs
  totalCost: numeric('total_cost').default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
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
export const insertLuigiRunSchema = createInsertSchema(luigiRuns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export const insertLuigiMessageSchema = createInsertSchema(luigiMessages).omit({
  id: true,
  createdAt: true,
});

export const insertLuigiArtifactSchema = createInsertSchema(luigiArtifacts).omit({
  id: true,
  createdAt: true,
});

export const insertDebateSessionSchema = createInsertSchema(debateSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertComparison = z.infer<typeof insertComparisonSchema>;
export type Comparison = typeof comparisons.$inferSelect;
export type InsertVixraSession = z.infer<typeof insertVixraSessionSchema>;
export type VixraSession = typeof vixraSessions.$inferSelect;
export type InsertPromptAudit = z.infer<typeof insertPromptAuditSchema>;
export type PromptAuditRecord = typeof promptAudits.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
// Force TypeScript to regenerate this inferred type
export type User = typeof users.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

export type InsertLuigiRun = z.infer<typeof insertLuigiRunSchema>;
export type LuigiRun = typeof luigiRuns.$inferSelect;
export type InsertLuigiMessage = z.infer<typeof insertLuigiMessageSchema>;
export type LuigiMessage = typeof luigiMessages.$inferSelect;
export type InsertLuigiArtifact = z.infer<typeof insertLuigiArtifactSchema>;
export type LuigiArtifact = typeof luigiArtifacts.$inferSelect;

export type InsertDebateSession = z.infer<typeof insertDebateSessionSchema>;
export type DebateSession = typeof debateSessions.$inferSelect;

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





