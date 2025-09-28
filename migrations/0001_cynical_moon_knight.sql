CREATE TABLE "prompt_audits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" varchar NOT NULL,
	"variables" jsonb NOT NULL,
	"resolved_sections" jsonb NOT NULL,
	"message_structure" jsonb NOT NULL,
	"model_id" varchar,
	"response_content" text,
	"response_time" integer,
	"token_usage" jsonb,
	"cost" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" varchar,
	"credits" integer DEFAULT 500,
	"stripe_customer_id" varchar,
	"stripe_subscription_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
