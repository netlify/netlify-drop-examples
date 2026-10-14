CREATE TABLE "survey_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"survey_id" uuid NOT NULL,
	"respondent_id" text,
	"respondent_email" text,
	"answers" jsonb DEFAULT '{}' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "anonymous" boolean DEFAULT true NOT NULL;