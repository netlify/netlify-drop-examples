-- Tier 2 row-level security. FORCE applies the policies to the table owner
-- too, so a misconfigured connection can't bypass them. Policies key off the
-- transaction-local `app.role` setting (see src/db/rls.ts `withDbRole`); when
-- the setting is absent no policy matches, so the default is deny.
ALTER TABLE "dataset_batches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dataset_batches" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "opportunities" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "opportunities" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "arr_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "arr_snapshots" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "dataset_batches_select" ON "dataset_batches" FOR SELECT USING (current_setting('app.role', true) IN ('viewer', 'editor', 'admin', 'system'));--> statement-breakpoint
CREATE POLICY "dataset_batches_insert" ON "dataset_batches" FOR INSERT WITH CHECK (current_setting('app.role', true) IN ('editor', 'admin', 'system'));--> statement-breakpoint
CREATE POLICY "dataset_batches_update" ON "dataset_batches" FOR UPDATE USING (current_setting('app.role', true) IN ('editor', 'admin', 'system')) WITH CHECK (current_setting('app.role', true) IN ('editor', 'admin', 'system'));--> statement-breakpoint
CREATE POLICY "dataset_batches_delete" ON "dataset_batches" FOR DELETE USING (current_setting('app.role', true) = 'system');--> statement-breakpoint
CREATE POLICY "opportunities_select" ON "opportunities" FOR SELECT USING (current_setting('app.role', true) IN ('viewer', 'editor', 'admin', 'system'));--> statement-breakpoint
CREATE POLICY "opportunities_insert" ON "opportunities" FOR INSERT WITH CHECK (current_setting('app.role', true) IN ('editor', 'admin', 'system'));--> statement-breakpoint
CREATE POLICY "opportunities_update" ON "opportunities" FOR UPDATE USING (current_setting('app.role', true) IN ('editor', 'admin', 'system')) WITH CHECK (current_setting('app.role', true) IN ('editor', 'admin', 'system'));--> statement-breakpoint
CREATE POLICY "opportunities_delete" ON "opportunities" FOR DELETE USING (current_setting('app.role', true) = 'system');--> statement-breakpoint
CREATE POLICY "arr_snapshots_select" ON "arr_snapshots" FOR SELECT USING (current_setting('app.role', true) IN ('viewer', 'editor', 'admin', 'system'));--> statement-breakpoint
CREATE POLICY "arr_snapshots_insert" ON "arr_snapshots" FOR INSERT WITH CHECK (current_setting('app.role', true) IN ('editor', 'admin', 'system'));--> statement-breakpoint
CREATE POLICY "arr_snapshots_update" ON "arr_snapshots" FOR UPDATE USING (current_setting('app.role', true) IN ('editor', 'admin', 'system')) WITH CHECK (current_setting('app.role', true) IN ('editor', 'admin', 'system'));--> statement-breakpoint
CREATE POLICY "arr_snapshots_delete" ON "arr_snapshots" FOR DELETE USING (current_setting('app.role', true) = 'system');
