CREATE TABLE "application_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"application_id" uuid NOT NULL,
	"content" text NOT NULL,
	"author" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"job_id" uuid NOT NULL,
	"candidate_name" text NOT NULL,
	"email" text NOT NULL,
	"resume_key" text NOT NULL,
	"resume_name" text NOT NULL,
	"cover_letter" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"title" text NOT NULL,
	"department" text NOT NULL,
	"location" text NOT NULL,
	"employment_type" text NOT NULL,
	"description" text NOT NULL,
	"responsibilities" text NOT NULL,
	"qualifications" text NOT NULL,
	"benefits" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"posted_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "application_notes_application_id_idx" ON "application_notes" ("application_id");--> statement-breakpoint
CREATE INDEX "application_notes_deleted_at_idx" ON "application_notes" ("deleted_at");--> statement-breakpoint
CREATE INDEX "applications_job_id_idx" ON "applications" ("job_id");--> statement-breakpoint
CREATE INDEX "applications_deleted_at_idx" ON "applications" ("deleted_at");--> statement-breakpoint
CREATE INDEX "jobs_deleted_at_idx" ON "jobs" ("deleted_at");--> statement-breakpoint
ALTER TABLE "application_notes" ADD CONSTRAINT "application_notes_application_id_applications_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id");--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id");