# For coding agents

This is a TanStack Start + shadcn/ui starter, forkable into HR/Finance/etc.
apps. Read this before making changes.

- **Runs in demo mode locally and on the canonical demo project.**
  `npm install && npm run dev` — no database, no auth, no env vars needed.
  Data lives in memory (`src/data/*.ts`) and resets on cold start. Deployed
  forks switch to the real database path automatically based on Netlify's
  read-only `SITE_ID`.
- **Demo mode is derived, never configured.** `isDemoMode()` is
  `!isDeployed() || isOfficialDemoSite()` (`src/config/flags.ts`, keyed on
  Netlify's `SITE_ID` and `appConfig.officialDemoSiteId`). Do not add a
  `DEMO_MODE` env var or infer it from `NETLIFY_DB_URL`. Tests rely on
  `SITE_ID` being unset to stay in-memory.
- **One flag controls each non-demo toggle**: `DEFAULT_ROLE` (role assigned
  at signup, required once signups are enabled), `ALLOWED_SIGNUP_DOMAIN`
  (optional — restricts signups to one exact email domain, no subdomains),
  and `PURGE_ENABLED`/`RECORD_RETENTION_DAYS` (hard purge of soft-deleted
  records — off by default, `RECORD_RETENTION_DAYS` required once
  `PURGE_ENABLED=true`). Auth is detected by asking the platform whether Identity is on
  (`isAuthEnabled()` is async — always `await` it); local auth uses `AUTH_DEV_USER` under `netlify dev`.
  All env-backed helpers live in `src/config/flags.ts` — read `process.env`
  only inside those functions, never at module scope, never anywhere else.
- **Setup widget**: `src/components/setup-prompt.tsx` decides what floats in
  the corner — the deploy badge on the official demo site, the admin-only
  `GoLiveChecklist` elsewhere, nothing for everyone else. UX only, not access
  control. Delete the three component files and the `<SetupPrompt />` line in
  `app-shell.tsx` to remove it.
- **Branding lives in one file**: `src/config/app.ts`. If you're asked to
  rebrand the app, that's the only file that should change (plus swapping
  `/public/logo.svg`).
- **Data layer pattern**: `src/data/<entity>.ts` has `if (isDemoMode())`
  branches inline — no interface + two implementations. To add an entity,
  copy `src/data/records.ts`'s shape.
- **Soft delete is always on, not configurable**: `src/db/soft-delete.ts`'s
  `softDeleteColumns` (spread into a table) and `notDeleted`/`isNotDeleted`
  (the shared query filter/predicate) are how `records` excludes
  soft-deleted rows by default. "Delete" sets `deletedAt`; it never issues a
  real `DELETE`. Permanent purge is a separate, opt-in concern — see README
  > Soft delete — and is not audit-logged.
- **Route loaders/components must never import `src/data/*.ts` or
  `src/config/flags.ts` directly.** Both pull in Node-only code
  (`drizzle-orm/netlify-db`) or raw `process.env` reads that break the
  client bundle. Always go through the `createServerFn`-wrapped functions in
  `src/server/*.ts`, or (for flags) the root-provided `useAppContext()`.
- **Every mutation is authorized server-side**, not just route-guarded:
  `src/server/*.ts` functions call `requireUser()`/`requireRole(allowedRoles)`
  from `src/auth/server.ts` before touching data. Route-level `beforeLoad`
  guards (e.g. `src/routes/_app.tsx`) are UX only. Raw Netlify Functions use
  `checkRole(allowedRoles)` from `src/auth/session.ts` instead (no router to
  catch a thrown error, and importing it directly avoids pulling
  `server.ts`'s TanStack Router/DB dependencies into the function's bundle)
  — see `netlify/functions/example-protected.mts`. Both are pure boilerplate;
  only the `allowedRoles` array is vertical-specific. Roles live in Identity's
  `app_metadata.roles`, never `user_metadata` — see README > Roles. Mutations
  are always audit-logged via `audit()`; read-level logging via
  `auditRead(action, entity, entityId)` (same file) is opt-in and NOT wired
  into any getter automatically — call it explicitly from a sensitive
  getter's server function, see `src/server/example-audited-getter.ts` for
  the reference pattern and README > Audit logging.
- **Uploads fail closed until configured**: `netlify/functions/upload.mts`
  and `netlify/functions/files.mts` (`/api/upload`, `/api/files/:key`) 403
  unconditionally unless Netlify Identity auth is enabled **and**
  `appConfig.uploadAllowedRoles` (`src/config/app.ts`, defaults to `[]`) is a
  non-empty list of roles allowed to upload/download — set it explicitly
  before relying on these endpoints. See README > Uploads.
- **Auth UI covers login, signup, forgot-password, and invite/recovery
  acceptance**: `src/auth/client.tsx` (`LoginForm`, `ResetPasswordForm`) and
  `src/routes/login.tsx` / `src/routes/reset-password.tsx`. If an auth flow is
  reached but Identity itself isn't enabled in the Netlify dashboard,
  `getSettings()` throws `MissingIdentityError` and `/login` shows an alert
  rather than failing silently on submit.
- **Full details**: see `README.md` — especially "Extension points" and the
  "Do not touch" list before adding a new entity, changing branding, or
  touching the DB schema.

If you're not sure whether something belongs in demo mode or the DB path,
check `src/data/records.ts` for the reference pattern.
