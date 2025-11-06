--
-- Author: gpt-5-codex
-- Date: 2025-11-06T03:49:34Z
-- PURPOSE: Create ARC agent workspace tables for runs, messages, and artifacts.
-- SRP/DRY check: Pass - adds dedicated ARC tables without overlapping Luigi schema.
-- shadcn/ui: Pass - migration only.
--

CREATE TABLE "arc_runs" (
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
--> statement-breakpoint
CREATE TABLE "arc_messages" (
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
--> statement-breakpoint
CREATE TABLE "arc_artifacts" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "run_id" varchar NOT NULL REFERENCES "arc_runs"("id") ON DELETE cascade,
  "stage_id" varchar NOT NULL,
  "type" varchar NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "data" jsonb,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "arc_messages_run_idx" ON "arc_messages" ("run_id");
--> statement-breakpoint
CREATE INDEX "arc_artifacts_run_idx" ON "arc_artifacts" ("run_id");
