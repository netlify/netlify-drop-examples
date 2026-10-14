CREATE TABLE "arr_snapshots" (
	"batch_id" uuid,
	"account_id" text,
	"month" date,
	"arr_enc" text NOT NULL,
	CONSTRAINT "arr_snapshots_pkey" PRIMARY KEY("batch_id","account_id","month")
);
--> statement-breakpoint
CREATE TABLE "dataset_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"dataset" text NOT NULL,
	"source" text NOT NULL,
	"row_count" integer NOT NULL,
	"blob_key" text,
	"created_by_id" text,
	"created_by_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"batch_id" uuid,
	"id" text,
	"owner_enc" text NOT NULL,
	"stage" text NOT NULL,
	"amount_enc" text NOT NULL,
	"created_date" date NOT NULL,
	"close_date" date NOT NULL,
	"segment" text NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	CONSTRAINT "opportunities_pkey" PRIMARY KEY("batch_id","id")
);
--> statement-breakpoint
DROP TABLE "records";--> statement-breakpoint
CREATE INDEX "dataset_batches_dataset_deleted_at_idx" ON "dataset_batches" ("dataset","deleted_at");--> statement-breakpoint
ALTER TABLE "arr_snapshots" ADD CONSTRAINT "arr_snapshots_batch_id_dataset_batches_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "dataset_batches"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_batch_id_dataset_batches_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "dataset_batches"("id") ON DELETE CASCADE;