ALTER TABLE "records" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "records_deleted_at_idx" ON "records" ("deleted_at");