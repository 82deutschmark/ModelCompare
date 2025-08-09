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
