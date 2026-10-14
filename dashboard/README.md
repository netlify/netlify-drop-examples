# Pipeline & ARR Dashboard

A read-only **Pipeline & ARR dashboard** built on the App Pack starter
(TanStack Start + shadcn/ui). Builders load data from CSV (Snowflake and
Salesforce as optional sources) and stakeholders (viewers) only view. The dataset is classified
**Tier 2** — see [Data classification (Tier 2)](#data-classification-tier-2).

The underlying starter deploys to Netlify in one
command, runs in **demo mode** locally and on the canonical public demo
project (in-memory data, no database or auth required), and turns on real
authentication automatically when Netlify Identity is enabled for a deployed
project. Built to be forked by HR, Finance, and other internal teams — and by
AI coding agents working on their behalf.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. You're in demo mode: every view works against
in-memory **synthetic** data for a fictional company ("Larkspur Robotics")
with a built-in demo admin. Uploads on `/data` replace the in-memory data until
the server restarts. Nothing to configure.

## The dashboard

| View | What it shows |
| --- | --- |
| `/` Overview | Six KPIs (total & weighted pipeline, closed-won ARR, win rate, average sales cycle, net new ARR) plus mini charts |
| `/pipeline` | Open pipeline by stage, stacked by segment / owner / source |
| `/arr` | Monthly new, expansion, contraction and churn, with a net line |
| `/breakdown` | Sortable, searchable aggregate table grouped by segment, owner or stage |
| `/data` | Editors/admins: CSV upload, template downloads, batch history, Snowflake / Salesforce refresh |

Every view shares a date-range picker (fiscal presets or a custom month range;
stored in the URL as `?from=&to=`), a per-dataset **Last updated** stamp with
its source, and a **How these metrics are calculated** panel rendered from
`src/config/dashboard.ts` (assumptions are badged *Inferred* — confirm them for
your business). Server functions return **aggregates only**; no per-deal row,
account ID or per-deal owner ever reaches the browser.

### Loading data

Two datasets, each an **exact column allowlist** (`src/datasets/contract.ts`) —
a missing or extra column fails closed, which keeps account names and other
identifying fields out:

- `opportunities`: `id, owner, stage, amount, created_date, close_date, segment, source, status`
- `arr_snapshots`: `account_id, month, arr`

Rules: `status` is `open|won|lost`; `stage` must be in `dashboardConfig.stages`;
dates are `YYYY-MM-DD` (ARR `month` is normalized to the first of the month);
amounts/ARR are non-negative numbers; `id`/`account_id` must match
`^[A-Za-z0-9_-]{1,64}$` (opaque IDs, no spaces — which blocks name-like values).
Upload errors name the first failing file line and column, e.g.
`Row 14, column close_date: expected YYYY-MM-DD, got '3/4/24'`, and **nothing
is stored** on failure. Every load is a **full replace**: a new
`dataset_batches` row is created, the previous active batch is soft-deleted and
rows hang off the batch with `ON DELETE CASCADE`. Views read this stored copy;
adapters run on the ingestion side only, so viewers can never trigger a
warehouse query. Uploads are capped at 4 MB (Netlify Functions request limit).

## Publish it with Netlify Drop

Pick this project on [Netlify Drop](https://app.netlify.com/drop?example=dashboard).
Drop detects the TanStack Start setup and builds it for you. This project needs
a build, so you will be asked to sign up or log in first; your project is kept
and deploys as soon as you have an account. Your copy is not the public demo:
it uses Netlify Database and needs `DATA_ENCRYPTION_KEY` and Netlify Identity
before it shows any data (it fails closed until then), so read
[After deploying to your account](#after-deploying-to-your-account) next.

## One-command deploy

```bash
netlify init      # links this repo to a new or existing Netlify project
netlify deploy --build --prod
```

Or click:

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy)

The build (`npm run build`) and publish directory (`dist/client`) are already
configured in `netlify.toml`. The canonical `app-pack-template` project stays
in demo mode for public evaluation; your own deployed project uses the real
Netlify Database path automatically.

## After deploying to your account

Your deployed project is no longer the public demo. It uses live data, so it
**fails closed**: until Netlify Identity is enabled, the dashboard and `/data`
show a "Netlify Identity must be enabled" error instead of any data. Set
`DATA_ENCRYPTION_KEY` too (see Environment variables), or loads and reads
fail.

1. Open the Netlify project overview:
   `https://app.netlify.com/projects/{sitename}`
2. Confirm Netlify Database is connected under **Data & storage**. The app
   uses the database automatically; you do not need to set `NETLIFY_DB_URL`
   by hand. If you connect the database after the first deploy, redeploy the
   site so migrations run before you add records.
3. Enable Identity in the Netlify dashboard, then redeploy. This is
   required, not optional: the data is Tier 2, so nothing is served without
   it. After that, visitors are sent to `/login` until they sign in.
4. Set `DEFAULT_ROLE` on the environment variables page before enabling
   signups: `https://app.netlify.com/projects/{sitename}/configuration/env`.
   Then sign up yourself at `/login` right away, **before** sharing the URL
   with anyone else — the first person to sign up automatically becomes the
   site admin (see "Roles" below), so signing up first is how you claim that
   account. After that, invite everyone else from the Identity tab, or leave
   public signups on if that's what your site needs.
5. Optional setup lives on that same environment variables page:
   `ALLOWED_SIGNUP_DOMAIN` for signup restrictions,
   `PURGE_ENABLED`/`RECORD_RETENTION_DAYS` for permanent deletion of
   soft-deleted records, and notification keys for Slack or email.

## Base template guarantees

What this template gives you out of the box, before you fork it for a
vertical — full detail is in the linked section, this is just orientation.

- **[Roles](#roles)**: role membership lives in Identity's `app_metadata`
  (never `user_metadata` — that's user-editable via the Identity API, so a
  role there is a privilege-escalation hole). `requireRole(allowedRoles)`
  gates TanStack Start loaders/server functions; `checkRole(allowedRoles)`
  gates raw Netlify Functions. Neither knows or cares what role strings are
  valid — **the base template does not define a role taxonomy**; your
  vertical decides what roles exist.
- **[Soft delete](#soft-delete)**: on by default, not configurable. Deleting
  a record marks it (`deletedAt`), it's never actually removed. Every
  entity that opts in shares the same `softDeleteColumns`/`notDeleted`/
  `isNotDeleted` primitives instead of reimplementing filtering per table.
- **[Hard purge](#soft-delete)**: opt-in and off by default via
  `PURGE_ENABLED` + `RECORD_RETENTION_DAYS`. There is no default retention
  window — a retention period is a compliance decision the deploying team
  makes explicitly, not a number this template guesses.
- **Not provided (yet)** — don't assume these exist:
  - **Audience/targeting** (who a resource is visible to, as distinct from
    what a role permits) — deferred pending a second vertical to design
    against.
  - **Bulk/CSV export** from the data table.
  - **Reidentification thresholds** (minimum group sizes before a figure is
    shown). This dashboard shows aggregates but does not suppress small groups
    (e.g. a one-deal owner); see Data classification (Tier 2) below.

## Environment variables

| Variable                                                 | Default | Purpose                                                                                                                                                      |
| -------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NETLIFY_DB_URL`                                         | —       | Set automatically by `@netlify/database` / `netlify database init`. Don't set by hand.                                                                       |
| `AUTH_DEV_USER`                                          | —       | Local-dev-only fake session, e.g. `{"email":"you@example.com","roles":["admin"]}`. Turns auth on only when running under `netlify dev` (`NETLIFY_DEV=true`). |
| `DEFAULT_ROLE`                                           | —       | Required once signups are enabled — the role assigned to new users at signup. See "Roles" below. No default; signups fail loudly until this is set.          |
| `ALLOWED_SIGNUP_DOMAIN`                                  | —       | Optional — restricts signups to one exact email domain (no subdomains). Unset means no restriction. See "Roles" below.                                       |
| `DATA_ENCRYPTION_KEY`                                    | —       | **Required outside demo mode** (fails closed). 32 bytes, base64 (`openssl rand -base64 32`). Encrypts owner/amount/ARR columns and raw uploads. **Secret.** See Data classification (Tier 2).                |
| `SNOWFLAKE_ACCOUNT`, `_USER`, `_PRIVATE_KEY`, `_WAREHOUSE`, `_ROLE`, `_DATABASE`, `_SCHEMA` | — | Optional. Snowflake refresh turns on only when **all seven** are set. `SNOWFLAKE_PRIVATE_KEY` is a PKCS#8 PEM (literal `\n` allowed) and a **secret**. See Snowflake below. |
| `SALESFORCE_INSTANCE_URL`, `_CLIENT_ID`, `_CLIENT_SECRET` | — | Optional. Salesforce opportunities refresh (manual + nightly) turns on only when **all three** are set. `SALESFORCE_INSTANCE_URL` is your My Domain URL (`https://<domain>.my.salesforce.com`); `SALESFORCE_CLIENT_SECRET` is a **secret**. See Salesforce below. |
| `PURGE_ENABLED`                                          | `false` | `true` turns on permanent deletion of already soft-deleted dataset batches (and, by cascade, their rows). Off is genuinely inert — no purge job runs. See "Soft delete" below.                     |
| `RECORD_RETENTION_DAYS`                                  | —       | Required once `PURGE_ENABLED=true` — days a soft-deleted batch is kept before permanent purge. No default; purge fails loudly until this is set.            |
| `SLACK_WEBHOOK_URL`                                      | —       | Enables the `slack` notify channel.                                                                                                                          |
| `RESEND_API_KEY`, `NOTIFY_EMAIL_FROM`, `NOTIFY_EMAIL_TO` | —       | Enables the `email` notify channel (via [Resend](https://resend.com)).                                                                                       |

See `env.example` for a copy-pasteable starting point. It is not a dotfile, so
Netlify Drop can fetch it; copy it to `.env` if you want a local env file.

> **Note on demo mode:** demo mode is automatic. Local development and the
> canonical `app-pack-template` project and this dashboard's public demo
> (`dashboard-app-pack`, site `0572e062-b021-497b-babf-b653423e3c9a`) use
> in-memory synthetic data; any
> other deployed Netlify project uses the real database path. The app never
> infers demo mode from whether `NETLIFY_DB_URL` happens to be set, because
> `@netlify/database` may create that value during local development before
> migrations have been applied.

## Enable auth

The app ships with auth **off**. To turn it on:

1. In the Netlify dashboard, enable Identity for your site (Site
   configuration → Identity → Enable Identity) — see
   [Netlify's Identity setup guide](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/get-started/#enable-identity).
2. Redeploy the site. The app detects the project's Identity configuration
   automatically; there is no auth env var to set.
3. Set `DEFAULT_ROLE` (e.g. `member`) as a site environment variable —
   `netlify/functions/identity.mts` assigns it to every new signup's
   `app_metadata.roles`. Signups fail loudly until this is set.
4. Sign up yourself at `/login` before inviting anyone else — the very first
   signup automatically becomes the admin instead of getting `DEFAULT_ROLE`
   (see "Roles" below). After that, invite users from the Identity tab, or
   let them sign up directly if signups are enabled in your Identity
   settings. Promote specific users beyond the default role from the
   Identity tab (`roles` land in `app_metadata.roles`, never
   `user_metadata` — see "Roles" below).

With auth on:

- `/login` handles login, signup, "forgot password," and any OAuth providers
  you've enabled in Identity settings.
- `/reset-password` is the shared "set a password" screen for both password
  recovery and invite links — reached via redirect, not linked directly.
  Recovery finishes with `updateUser({ password })`; invites finish with
  `acceptInvite(token, password)`. See `src/auth/client.tsx`'s
  `useAuthCallback`/`ResetPasswordForm` for how the two flows are told apart.
- Every new signup gets `DEFAULT_ROLE` in `app_metadata.roles` automatically,
  except the very first, which becomes the admin (see "Roles" below) — no
  manual dashboard step required for the common case.
- Every dashboard route, `/data` and `/admin` redirects anonymous visitors to
  `/login` — but the **real** authorization boundary is `requireUser()` /
  `requireRole()` inside each server function (`src/server/*.ts`), which runs
  regardless of how the request got there.
- Mutations get audit-logged (actor, action, before/after) — see
  `/admin/audit`. Read-level logging exists too, but is opt-in per call
  site — see "Audit logging" below.

If Identity is unavailable but an auth flow is reached, `/login` shows a
persistent alert instead of failing silently through a generic error on
submit — `LoginForm` detects this via `getSettings()` throwing
`MissingIdentityError` and tells the visitor exactly what's missing and where
to fix it.

**Local development:** `@netlify/identity` only works against a real Netlify
deploy — there's no local Identity emulator. To develop with auth on locally,
run `netlify dev` and set:

```bash
AUTH_DEV_USER='{"email":"you@example.com","roles":["admin"]}'
```

This fake session is only honored when `NETLIFY_DEV=true` (i.e. under
`netlify dev`), never in a real deploy. Password reset and invite acceptance
can't be exercised locally either way — Identity's own email links only
work against a real deploy.

## Roles

The base template ships a generic role-checking _mechanism_, not a fixed
role taxonomy — it has no opinion on what role strings your vertical uses
(`admin`/`respondent`, `hr_admin`/`employee`, etc.), only on how roles are
stored and checked.

**Storage convention:** role membership always lives in Identity's
`app_metadata.roles` (a string array), **never `user_metadata`**.
`user_metadata` is user-editable via the Identity API — a role stored there
would let any signed-in user grant themselves roles, which is a
privilege-escalation hole. This is also the only role storage location that
works with Netlify's own tooling with zero custom code: it's what the
Identity dashboard's "Roles" field writes, and what `netlify.toml`'s
`Role`-based redirect gating (see the commented-out example there) reads.

**Assigning roles:**

- **At signup**: `netlify/functions/identity.mts` is an Identity signup
  event hook that assigns `DEFAULT_ROLE` (required, see "Environment
  variables" above) to every new user's `app_metadata.roles` automatically.
  Identity event hooks only fire against a real deploy with Identity
  enabled — not under `netlify dev`.
- **The first signup becomes the admin**: the same hook checks
  `hasAnyUsers()` (`src/auth/first-user.ts`, backed by the Identity admin
  API's `listUsers()`) and assigns `appConfig.adminRole` instead of
  `DEFAULT_ROLE` when nobody has signed up yet. This exists so a
  non-technical person deploying the template can administer their own site
  without ever opening the Identity dashboard. It has a race window (two
  people signing up in the same instant could both become admin) and, on
  open signups, a land-grab window (whoever signs up first — not necessarily
  the deployer — claims it) — see "After deploying to your account" above
  for closing the second one by signing up immediately. If the `listUsers()`
  check itself fails, the hook falls back to `DEFAULT_ROLE` rather than risk
  granting admin on an unconfirmed read. `/login`'s signup form shows a
  "you'll be the site admin" notice while this condition holds (see
  `src/server/first-user.ts` / `src/auth/client.tsx`).
- **Restricting who can sign up**: the same hook optionally enforces
  `ALLOWED_SIGNUP_DOMAIN` — set it to one exact email domain (e.g.
  `acme.com`) and any signup whose email domain doesn't match exactly (no
  subdomains) is denied via `event.deny()` before a role is ever assigned.
  Unlike `DEFAULT_ROLE`, this is optional rather than fail-loud: the hook
  has no way to know whether Identity's "open signups" setting is even on,
  so it can't force every deployment to configure it. Unset (the default)
  means no restriction — correct for invite-only setups, where every
  signup already comes from a trusted invite rather than open self-signup.
- **Beyond the first admin and the default**: promote specific users to
  additional roles from the Identity tab in the Netlify dashboard (Users →
  select a user → edit their Roles). There is no in-app role-management UI
  by design — this is base-layer infrastructure, not a vertical feature.

**Checking roles:**

- `requireRole(allowedRoles: string[])`, from `src/auth/server.ts` — for
  TanStack Start route loaders and server functions. Throws a 403 error
  (rendered via the route's `errorComponent`) if the session's roles don't
  intersect `allowedRoles`; no-op when Identity auth is off. Example:
  `requireRole(['admin', 'editor'])`.
- `checkRole(allowedRoles: string[])`, from `src/auth/session.ts` — for raw
  Netlify Functions, which have no router to catch a thrown error. Returns
  `null` on success, or a `Response` (401/403) to return immediately on
  failure. Deliberately lives in a separate, dependency-light module from
  `requireRole` so a function importing it doesn't pull in the TanStack
  Router/DB dependencies `src/auth/server.ts` needs for other exports. See
  `netlify/functions/example-protected.mts` for a complete reference
  implementation — copy it, change the path and `allowedRoles`, done.

Both helpers have zero knowledge of what role strings are valid — only the
`allowedRoles` array you pass in varies per call site. This is pure
boilerplate that shouldn't need to change per vertical.

**The one hardcoded role name in the base template** is
`appConfig.adminRole` (`src/config/app.ts`, defaults to `'admin'`), which
gates the built-in demo `/admin` section (audit log, usage events) and its
nav links. Rename it, or remove the admin section entirely, when forking
for a vertical with its own taxonomy.

`appConfig.uploadAllowedRoles` (`src/config/app.ts`, defaults to `[]`) is a
second, separate role list gating `/api/upload` and `/api/files/:key` (see
"Uploads" below) — it deliberately does **not** default to `[appConfig.adminRole]`,
so every vertical picks its own attachment roles explicitly, e.g.
`['admin', 'recruiter']`.

## Audit logging

Like Roles, this is a _mechanism_, not a policy — the base template has no
opinion on which reads or writes are sensitive enough to log; that judgment
belongs to whatever vertical is built on top.

**Mutations are always logged, not configurable:** `audit(action, entity,
entityId, before?, after?)`, from `src/auth/server.ts`, writes an entry
(actor, action, before/after) for every create/update/delete. Dataset loads log
`dataset.uploaded` (CSV) and `dataset.refreshed` (Snowflake/Salesforce) with only the
dataset name, row count and source for the old and new batch — never row
contents; raw-file downloads log `dataset.raw_downloaded`. Raw Netlify
Functions use `auditFromFunction()` (`src/auth/function-audit.ts`) because
`audit()` pulls in TanStack Router. No-ops when Identity auth is off.

**Reads are opt-in, per call site:** `auditRead(action, entity, entityId)`,
also from `src/auth/server.ts`, is the read counterpart — same persistence
path and actor resolution as `audit()`, just no before/after. **Nothing calls
this automatically.** In this app **every dashboard server function** in
`src/server/dashboard.ts` calls it (`dashboard.viewed`, entity `dashboard`,
id like `pipeline?from=…&to=…&breakdown=owner`) because the dataset is Tier 2;
the data-layer getters themselves stay unlogged. Action strings end in
`.viewed` — `/admin/audit` uses that suffix for its Read/Change badge.

## Soft delete

Two distinct concepts, kept strictly separate, with different default postures:

1. **Soft delete** — marking a record deleted and excluding it from default
   queries, while keeping it recoverable in the database. **Always on, not
   configurable.** There's no vertical for which "deletions are silently
   unrecoverable" is the right default.
2. **Hard purge** — permanently destroying a soft-deleted record after a
   retention window elapses. **Opt-in, off by default**, gated by two
   separate settings so the safe default (off) can never be confused with an
   unsafe default retention number.

**Soft delete**, from `src/db/soft-delete.ts`:

- `softDeleteColumns` — spread into a `pgTable(...)` definition (see
  `datasetBatches` in `src/db/schema.ts`) rather than repeating a `deletedAt`
  column by hand.
- `notDeleted(column)` / `isNotDeleted(row)` — the shared query filter
  (DB mode) and predicate (demo mode) every entity's `list`/`get` functions
  use instead of an ad hoc `WHERE`/`.filter()` per call site.
- A full-replace load sets `deletedAt` on the previous batch; it never
  issues a real `DELETE`. Replaced batches stay recoverable at the DB layer
  until purge (no restore UI ships). Purge is not itself audit-logged (see
  scope below).

**Hard purge:**

- `PURGE_ENABLED` (default `false`) — when off, no purge job runs, ever;
  `RECORD_RETENTION_DAYS` is never even read.
- `RECORD_RETENTION_DAYS` — only read (and only required) once
  `PURGE_ENABLED=true`. No default: a retention period is a compliance
  decision the deploying team has to make explicitly, not a number this
  template should guess.
- `netlify/functions/purge-deleted-records.mts` is a scheduled Netlify
  Function (daily, `0 3 * * *`) that no-ops unless `PURGE_ENABLED=true`,
  then hard-deletes batches soft-deleted longer than `RECORD_RETENTION_DAYS`
  ago via `purgeExpiredBatches()` in `src/data/datasets.ts`; the rows go with
  them via `ON DELETE CASCADE`. It runs as the `system` database role, the
  only role with a `DELETE` policy.

**Scope, explicitly:** one global `RECORD_RETENTION_DAYS` (no per-table
overrides), no audit trail beyond `deletedAt` itself (purge's only
observability is its own function return), and no restore/undelete UI —
recoverability at the data layer is the goal, not a build-out of tooling to
use it.

## Snowflake (second data source)

Refresh is **manual** (a button on `/data`, shown only when all seven
`SNOWFLAKE_*` variables are set) — no schedule. It calls
`POST /api/datasets/refresh` (`netlify/functions/snowflake-refresh.mts`), which
is editor/admin-only and fail-closed, runs the adapter, then loads the result
as a new `snowflake` batch. Credentials never leave that function.

- **Adapter**: the Snowflake SQL REST API with key-pair JWT (`fetch` +
  `node:crypto`, zero dependencies) rather than `snowflake-sdk`, which pulls in
  AWS/Azure/GCP clients for stage transfers we don't use. Long queries return
  `202` and are polled for ~25 s; result partitions are fetched and validated
  against the same contract as CSV. Only single statements are sent (bindings
  aren't allowed in multi-statement requests).
- **Saved queries only**: the client sends `{ queryId, params }`; the id must
  exist in `src/config/saved-queries.ts` and params must pass its zod schema.
  SQL is never taken from a request. The SELECT must return exactly the contract
  columns. **The view names there (`OPPORTUNITIES_V`, `ARR_SNAPSHOTS_V`) are
  placeholders (inferred) — edit them.** Dates are formatted in SQL
  (`TO_VARCHAR(.., 'YYYY-MM-DD')`) and params are bound as text +
  `TO_DATE(?)`.
- **Limits**: the refresh runs in a synchronous function, so it must finish
  within the function timeout — use an aggregated or reasonably sized view.
  Real-world latency against a live account has **not** been verified.

Set up a **read-only** Snowflake role and a service user:

```sql
CREATE ROLE DASH_RO;
GRANT USAGE ON WAREHOUSE <wh> TO ROLE DASH_RO;
GRANT USAGE ON DATABASE <db> TO ROLE DASH_RO;
GRANT USAGE ON SCHEMA <db>.<schema> TO ROLE DASH_RO;
GRANT SELECT ON VIEW <db>.<schema>.OPPORTUNITIES_V TO ROLE DASH_RO;  -- only the views you expose
GRANT SELECT ON VIEW <db>.<schema>.ARR_SNAPSHOTS_V TO ROLE DASH_RO;
CREATE USER DASH_SVC DEFAULT_ROLE = DASH_RO RSA_PUBLIC_KEY = '<public key body>';
GRANT ROLE DASH_RO TO USER DASH_SVC;
```

```bash
openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out snowflake_key.p8   # SNOWFLAKE_PRIVATE_KEY
openssl rsa -in snowflake_key.p8 -pubout -out snowflake_key.pub             # RSA_PUBLIC_KEY (body only)
```

Store `SNOWFLAKE_PRIVATE_KEY` as a **secret** environment variable.

## Salesforce (opportunities source)

Salesforce can load the **opportunities** dataset (ARR snapshots stay on CSV or
Snowflake). It turns on when all three `SALESFORCE_*` variables are set:

- **Manual**: a "Refresh from Salesforce" button on the `/data` opportunities
  card calls `POST /api/datasets/refresh/salesforce`
  (`netlify/functions/salesforce-refresh.mts`). It is editor/admin-only and
  fails closed, like the Snowflake refresh.
- **Nightly**: `netlify/functions/salesforce-scheduled-refresh.mts` runs at
  04:00 UTC as the `system` DB role and no-ops when Salesforce isn't
  configured. It **replaces** whatever is loaded, including a CSV upload. The
  audit entry has no actor.

Both paths share `src/datasets/salesforce-refresh.ts`. Each loads the result
as a new `salesforce` batch and audits `dataset.refreshed` with counts only.

- **Adapter** (`src/datasets/adapters/salesforce.ts`): the REST API with the
  OAuth 2.0 **client credentials flow** (plain `fetch`, no SDK). It follows
  `nextRecordsUrl` pages for up to ~25 s. Errors carry only the HTTP status
  and Salesforce error code.
- **Fixed SOQL**: the query lives in `salesforceQueries` in
  `src/config/saved-queries.ts`. The request has no body, so the client can't
  influence the query. It loads opportunities with a non-null `Amount` and a
  `CloseDate` on or after Jan 1 `lookbackYears` ago.
- **Mapping** (`dashboardConfig.salesforce` in `src/config/dashboard.ts`,
  **inferred** — confirm it for your org):

  | Contract column | Salesforce source |
  | --- | --- |
  | `stage` | `stageMap[StageName]` for open deals; `closedStage` for closed ones. Defaults cover the standard stage picklist. |
  | `status` | `IsWon` ⇒ `won`, else `IsClosed` ⇒ `lost`, else `open`. |
  | `segment` | `segmentField` (default `Account.Type`). Most orgs use a custom field such as `Account.Segment__c`. |
  | `source` | `LeadSource`, or `Unknown` when it's empty. |
  | Other columns | `Id`, `Owner.Name`, `Amount`, and the date part of `CreatedDate` and `CloseDate`. |

  An open deal whose stage isn't in `stageMap` fails the whole refresh, and
  nothing is stored. The `/data` alert names the stage.

Setup:

1. In Salesforce Setup, create an **External Client App**, or a Connected App
   in older orgs. Enable OAuth and add the `api` scope.
2. Turn on **Enable Client Credentials Flow**, then set a **Run As** user. Use a
   dedicated integration user with a read-only permission set: Read on
   Opportunity and Account, and access to the fields above.
3. Copy the consumer key and secret into `SALESFORCE_CLIENT_ID` and
   `SALESFORCE_CLIENT_SECRET`. Store the secret as a **secret** environment
   variable. Set `SALESFORCE_INSTANCE_URL` to your My Domain URL.

Real-world behavior against a live org has **not** been verified.

## Data classification (Tier 2)

The dataset is **Tier 2 — Confidential business data** under the App Packs PII
& Access Sensitivity Framework (`dashboardConfig.dataClassification`, shown in
the methodology panel). `owner` is the one person-attributable field. Where each
requirement lives:

| Requirement | Implementation |
| --- | --- |
| RLS with FORCE beneath role checks | `netlify/database/migrations/*_dataset_rls` enables **and forces** RLS on `dataset_batches`, `opportunities`, `arr_snapshots`. Policies key off `current_setting('app.role', true)`: SELECT for viewer/editor/admin/system, INSERT/UPDATE for editor/admin/system, DELETE for system only (purge); no setting ⇒ no policy matches ⇒ deny. `withDbRole()` (`src/db/rls.ts`) sets it per transaction; all dataset data access goes through it. Seed and purge use `system`. |
| Field-level encryption | `src/lib/crypto.ts`: AES-256-GCM, key from `DATA_ENCRYPTION_KEY`; required outside demo mode (fails closed). Covers `owner`, `amount`, `arr`. Encrypting amount and ARR is a judgment call: the dollar figures are what a project member browsing the DB editor shouldn't see. Aggregation happens in JS after decryption — fine at this scale. Raw uploads are encrypted with the same key. |
| Synthetic seed | `src/data/demo/seed.ts` — fictional company, fictional owners, opaque account IDs. |
| Read-level audit | `auditRead('dashboard.viewed', …)` in every dashboard server function; dataset upload/refresh/raw-download are mutation-audited (counts only). |
| Secrets Controller | `DATA_ENCRYPTION_KEY`, `SNOWFLAKE_PRIVATE_KEY` and `SALESFORCE_CLIENT_SECRET` are documented as **secret** site env vars; never `VITE_*`, read only in `src/config/flags.ts`. |
| No public access | Dashboard routes live under `_app` (guarded); every server function calls `requireDataAccess()`, which also **fails closed when Identity is not enabled on a real deployment**. Demo mode (synthetic data) is the only unauthenticated path. |

**Verify these on your deployment — they are not provable from the code alone:**

1. **The connecting database role must not be a superuser or have `BYPASSRLS`**
   (those bypass RLS even with FORCE):
   `select rolbypassrls, rolsuper from pg_roles where rolname = current_user;`
   (also exposed as `checkRlsEnforced()` in `src/db/rls.ts`). Both must be
   `false`. If either is `true`, RLS is not protecting you — treat that as a
   finding, not a footnote.
2. **Interactive transactions**: `withDbRole()` needs `db.transaction()`. The
   installed `drizzle-orm/netlify-db` driver implements it over a WebSocket pool
   (read from the driver source, and the RLS SQL was exercised on an in-process
   Postgres), but it has **not** been run against a live Netlify Database. If
   the driver can't open transactions in your environment, fall back to the
   pooled client from `@netlify/database` for this path.
3. Run `npm run db:seed` (needs `DATA_ENCRYPTION_KEY`) only if you want sample
   data in a real database.

**Deploy checklist**

- [ ] `DATA_ENCRYPTION_KEY` set as a secret env var (back it up — losing it makes stored data unreadable).
- [ ] Netlify Identity enabled; signups **invite-only** or restricted with `ALLOWED_SIGNUP_DOMAIN`.
- [ ] `DEFAULT_ROLE=viewer` (recommended). Promote builders to `editor` / `admin` in the Netlify Identity dashboard (app metadata roles) — there is no in-app user management; admins get a "Manage users" link to it.
- [ ] Project visibility set to private where available; no public links to deploy previews of a deployment holding real data (previews of the demo site use synthetic data only).
- [ ] The DB role check above passes.
- [ ] Decide whether `PURGE_ENABLED` / `RECORD_RETENTION_DAYS` apply to you.

Known limits: no small-group suppression (a one-deal owner is visible in owner
breakdowns), and the `.viewed` audit rows record the range and view, not the
numbers shown.

## Roles (dashboard)

`appConfig.roles` defines `viewer`, `editor`, `admin` and `dataEditorRoles =
['editor', 'admin']` (`src/config/app.ts`). **Viewers** see the dashboard;
**editors** also get `/data` (upload, Snowflake refresh, raw downloads);
**admins** also get the audit log and usage events. A signed-in user with none
of these roles sees nothing. Roles live in `app_metadata.roles` (see Roles
above).

## Use Netlify Database

1. `netlify database init` — provisions a database and scaffolds Drizzle if
   you haven't already (this repo already has schema + migrations).
2. Deploy. Netlify applies every migration in
   `netlify/database/migrations/` before the deploy goes live.
3. Optionally seed the same data demo mode uses:
   ```bash
   npm run db:seed
   ```
   This inserts `src/data/demo/seed.ts` via Drizzle (`onConflictDoNothing`,
   safe to re-run).

To change the schema: edit `src/db/schema.ts`, run `npm run db:generate` to
emit a migration, commit the migration, and deploy.

## Notifications

`src/lib/notify.ts` exports one function: `notify({ channel, subject, body, to? })`.
It POSTs to `/api/notify`, a **background** Netlify Function
(`netlify/functions/notify.mts`) that does the actual send — so the caller
doesn't block on a third-party API.

- **Slack**: set `SLACK_WEBHOOK_URL` (an incoming webhook URL).
- **Email**: set `RESEND_API_KEY`, `NOTIFY_EMAIL_FROM`, and optionally
  `NOTIFY_EMAIL_TO` (or pass `to` per-call).

Missing config logs a warning and returns — it never throws. To add a
channel: create `src/lib/notify-channels/<channel>.ts` exporting a
`notify<Channel>({ subject, body, to? })` function, then add one line to the
map in `netlify/functions/notify.mts`.

## Uploads

`src/components/upload/file-upload.tsx` is a drag/drop uploader wired to
`/api/upload` (`netlify/functions/upload.mts`), which stores files in a
Netlify Blobs store named `uploads` (4 MB cap — the Netlify Functions request
body limit). `/api/files/:key` (`netlify/functions/files.mts`) streams a
file back out.

**Both endpoints fail closed, unconditionally** — they touch real Netlify
Blobs storage, so unlike the rest of the app they never treat "auth off" as
"open to everyone." Both apply the same three guards, in order, before doing
anything else:

1. Netlify Identity must be enabled for the project — if it isn't, every
   request gets `403`, even in demo mode.
2. `appConfig.uploadAllowedRoles` (`src/config/app.ts`) must be a non-empty
   array — it defaults to `[]`, so every request gets `403` until you set it
   to your vertical's own attachment roles, e.g. `['admin', 'recruiter']`.
   It deliberately does not default to `[appConfig.adminRole]`.
3. `checkRole(appConfig.uploadAllowedRoles)` — the requesting user's session
   must have one of those roles, or they get `401`/`403`.

The uploader's client code shows a specific "uploads are disabled" message
when step 1 or 2 is the reason for a `403`, distinct from a plain
authorization failure at step 3.

It isn't attached to any entity by default. To attach an upload to a record,
store the returned `{ key, url }` on the record (add a column in
`src/db/schema.ts`, thread it through your `src/data/<entity>.ts`, and render it
in your detail route).

**This app does not use `/api/upload` for datasets** — it stays fail-closed
(`uploadAllowedRoles` is `[]`). Dataset CSVs go through the role-gated
`uploadDatasetServer` (`src/server/datasets.ts`): validated first, then
AES-256-GCM encrypted with `DATA_ENCRYPTION_KEY` and written to the dedicated
`dataset-uploads` Blobs store. Editors/admins can download the original file
via `GET /api/datasets/:batchId/raw` (decrypted, audited).

## Extension points

- **Add an entity**: `src/db/schema.ts` (table + `$inferSelect`/`$inferInsert`
  types) → `src/data/<entity>.ts` (demo/DB branches, same pattern as
  `datasets.ts`) → `src/server/<entity>.ts` (`createServerFn` wrappers with
  Zod validation) → `src/routes/_app/<entity>/` (list/detail/new routes). If
  the entity needs retention, spread `softDeleteColumns` into its table and
  use `notDeleted`/`isNotDeleted` in its `list`/`get` functions — see "Soft
  delete" above.
- **Branding**: edit `src/config/app.ts` only — product name, tagline, logo
  path, and brand colors. `src/components/brand-theme.tsx` and
  `src/components/app-shell.tsx` read from it; nothing else should hardcode
  a product name or color.
- **Roles**: see the dedicated "Roles" section above — `requireRole(allowedRoles)`
  / `checkRole(allowedRoles)` are pure boilerplate; only the role strings you
  pass in are vertical-specific.
- **Data table**: `src/components/data-table/` — pass new columns to
  `<DataTable columns data />`; sorting, filtering, search, and pagination
  are already wired via `features.ts`'s shared `dataTableFeatures`.
- **Forms**: `src/components/forms/use-app-form.ts` — add a new field type
  under `fields/` and register it in `fieldComponents`.

**Do not touch:**

- `src/config/flags.ts` — flag logic is intentionally centralized; don't
  read Netlify site/auth environment variables anywhere else.
- `src/routeTree.gen.ts` — auto-generated by the TanStack Router Vite plugin.
  Never edit by hand.
- `netlify/database/migrations/` — never edit an already-applied migration
  (Netlify detects and rejects the drift). Write a new one instead.

## Testing, linting, formatting

```bash
npm run typecheck
npm run lint
npm test
npm run format
```

Tests run with no Netlify site metadata, which keeps the data layer in demo
mode. They cover the data contract and CSV adapter, metric formulas, crypto,
the Snowflake adapter (JWT claims, bindings, polling, partitions — with a mocked
`fetch`), the Salesforce adapter (token flow, pagination, stage mapping), role gating of the dataset functions, "aggregates only" payloads,
flag parsing, the submission state machine, and notify's input validation.

## Project layout

See `AGENTS.md` for a short orientation aimed at coding agents forking this
repo, and the folder-by-folder breakdown in the original implementation plan
for the full picture. The short version:

```
src/config/app.ts        # branding — the only file you edit to rebrand
src/config/flags.ts       # Demo mode / Identity detection — server-only
src/db/schema.ts          # Drizzle schema (source of truth for the DB shape)
src/db/soft-delete.ts      # deletedAt column mixin + shared query filter helpers
src/config/dashboard.ts    # stages, churn/fiscal policy, classification (with Inferred metadata)
src/config/saved-queries.ts # server-only Snowflake query + Salesforce SOQL allowlist
src/datasets/             # data contract, CSV + Snowflake + Salesforce adapters
src/lib/metrics.ts        # pure KPI / ARR-movement / fiscal-range logic
src/lib/crypto.ts         # AES-256-GCM field + file encryption
src/db/rls.ts             # withDbRole(): sets app.role for row-level security
src/data/                 # datasets.ts (+ audit/events), demo/DB branches inside
src/server/                # createServerFn wrappers (Zod validation, auth, audit)
                              # dashboard (aggregates only, role-checked, read-audited), datasets (upload)
src/auth/                  # session resolution, route guards, login UI
src/routes/                 # file-based routes (TanStack Router)
src/components/              # shadcn ui/, data-table/, forms/, states/
netlify/functions/            # notify, upload, files, events (background/HTTP)
                              # snowflake-refresh, salesforce-refresh, dataset-raw (editor/admin only)
                              # salesforce-scheduled-refresh (nightly opportunities load)
                              # identity (signup role hook), example-protected (role-gate reference)
                              # purge-deleted-records (scheduled hard purge of replaced batches)
```
