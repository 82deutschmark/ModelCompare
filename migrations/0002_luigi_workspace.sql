--
-- Author: Codex using GPT-5
-- Date: 2025-10-04T01:48:19Z
-- PURPOSE: Create Luigi run, message, and artifact tables for agent workspace persistence.
-- SRP/DRY check: Pass - adds dedicated tables for Luigi pipeline without overlapping existing schemas.
-- shadcn/ui: Pass - server-side migration only.
--

CREATE TABLE "luigi_runs" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "mission_name" text NOT NULL,
  "objective" text NOT NULL,
  "constraints" text,
  "success_criteria" text,
  "stakeholder_notes" text,
  "user_prompt" text NOT NULL,
  "status" varchar NOT NULL,
  "current_stage_id" varchar,
  "stages" jsonb NOT NULL,
  "total_cost_cents" integer,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "luigi_messages" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "run_id" varchar NOT NULL REFERENCES "luigi_runs"("id") ON DELETE cascade,
  "role" varchar NOT NULL,
  "stage_id" varchar,
  "agent_id" varchar,
  "tool_name" varchar,
  "content" text NOT NULL,
  "reasoning" text,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "luigi_artifacts" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "run_id" varchar NOT NULL REFERENCES "luigi_runs"("id") ON DELETE cascade,
  "stage_id" varchar NOT NULL,
  "type" varchar NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "storage_path" text,
  "data" jsonb,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "luigi_messages_run_idx" ON "luigi_messages" ("run_id");
--> statement-breakpoint
CREATE INDEX "luigi_artifacts_run_idx" ON "luigi_artifacts" ("run_id");
