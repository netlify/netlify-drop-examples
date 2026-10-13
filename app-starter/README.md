# App Pack Starter

A TanStack Start + shadcn/ui application starter that deploys to Netlify in one
command, runs on sample data locally and on the canonical public demo
project (in-memory, no database or auth required), and turns on real
authentication automatically when Netlify Identity is enabled for a deployed
project. Built to be forked by HR, Finance, and other internal teams — and by
AI coding agents working on their behalf.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. You're on sample data: the dashboard, records table,
and forms all work against an in-memory dataset with a built-in demo user.
Data resets on every cold start. Nothing to configure.

## Publish it with Netlify Drop

Pick this project on [Netlify Drop](https://app.netlify.com/drop?example=app-starter).
Drop detects the TanStack Start setup and builds it for you. This project needs
a build, so you will be asked to sign up or log in first; your project is kept
and deploys as soon as you have an account. Your copy is not the public demo:
it uses Netlify Database and is open to anyone with the URL until you enable
Identity, so read [After deploying to your account](#after-deploying-to-your-account)
next.

## One-command deploy

```bash
netlify init      # links this repo to a new or existing Netlify project
netlify deploy --build --prod
```

Or click:

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy)

The build (`npm run build`) and publish directory (`dist/client`) are already
configured in `netlify.toml`. The canonical public demo stays on sample data
for public evaluation; your own deployed project uses Netlify Database
automatically.

## After deploying to your account

Your deployed project is no longer the public demo. It uses live data, and it
is open to anyone with the URL until you enable Identity. The in-app
[Go live checklist](#go-live-checklist) walks through the steps below.

1. Open the Netlify project overview:
   `https://app.netlify.com/projects/{sitename}`
2. Confirm Netlify Database is connected under **Data & storage**. The app
   uses the database automatically; you do not need to set `NETLIFY_DB_URL`
   by hand. If you connect the database after the first deploy, redeploy the
   site so migrations run before you add records.
3. If this app should be private, enable Identity in the Netlify dashboard.
   The app notices within about a minute, with no redeploy, and visitors are
   then sent to `/login` until they sign in.
4. Sign up yourself at `/login` right away, **before** sharing the URL with
   anyone else — the first person to sign up automatically becomes the site
   admin (see "Roles" below), so signing up first is how you claim that
   account. Everyone after gets the `member` role with no configuration.
   Invite everyone else from the Identity tab, or leave public signups on if
   that's what your site needs.
5. Optional setup lives on the environment variables page,
   `https://app.netlify.com/projects/{sitename}/configuration/env`:
   `DEFAULT_ROLE` to change the role new signups get,
   `ALLOWED_SIGNUP_DOMAIN` for signup restrictions,
   `PURGE_ENABLED`/`RECORD_RETENTION_DAYS` for permanent deletion of
   soft-deleted records, and notification keys for Slack or email.

## Go live checklist

A small checklist floats in the corner of the app for **admins only**. It is a
UX nudge, not access control: it links to dashboard pages and exposes no data.

- **Visible only to admins.** Everyone else, and logged-out visitors, sees
  nothing. With sign-in off, the stand-in demo user counts as an admin, so it
  also shows in local dev.
- **Hides itself** once every checkable step is done, and the dismiss button
  stays dismissed across reloads (stored in `localStorage`). Clear site
  storage to bring it back.
- **On the official demo site** the "Make this app yours" badge shows instead.

Steps:

1. **Sign in** — enable Identity in the Netlify dashboard, then sign up
   before sharing the URL; the first signup becomes the admin.
2. **Domain** — decide who can sign up: set `ALLOWED_SIGNUP_DOMAIN` (exact
   domain, enforced by the signup hook in `netlify/functions/identity.mts`),
   and/or turn off open signups and invite people from the Identity tab.
3. **Rebrand** — edit `src/config/app.ts` and swap `public/logo.svg`.

To remove it, delete `src/components/setup-prompt.tsx`,
`src/components/go-live-checklist.tsx` and
`src/components/netlify-deploy-badge.tsx`, plus the `<SetupPrompt />` line in
`src/components/app-shell.tsx`.

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
  - **PII/data-sensitivity tiering** (field-level encryption, reidentification
    thresholds, etc.) — a vertical's own responsibility if it needs this; see
    the note in "Soft delete" on how that interacts with `deletedAt`/purge.

## Environment variables

| Variable                                                 | Default  | Purpose                                                                                                                                                        |
| -------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NETLIFY_DB_URL`                                         | —        | Set automatically by `@netlify/database` / `netlify database init`. Don't set by hand.                                                                         |
| `AUTH_DEV_USER`                                          | —        | Local-dev-only fake session, e.g. `{"email":"you@example.com","roles":["admin"]}`. Turns auth on only when running under `netlify dev` (`NETLIFY_DEV=true`).   |
| `DEFAULT_ROLE`                                           | `member` | Optional — the role assigned to new users at signup (the very first signup becomes the admin instead). Defaults to `appConfig.defaultRole`. See "Roles" below. |
| `ALLOWED_SIGNUP_DOMAIN`                                  | —        | Optional — restricts signups to one exact email domain (no subdomains). Unset means no restriction. See "Roles" below.                                         |
| `PURGE_ENABLED`                                          | `false`  | `true` turns on permanent deletion of already soft-deleted records. Off is genuinely inert — no purge job runs. See "Soft delete" below.                       |
| `RECORD_RETENTION_DAYS`                                  | —        | Required once `PURGE_ENABLED=true` — days a soft-deleted record is kept before permanent purge. No default; purge fails loudly until this is set.              |
| `SLACK_WEBHOOK_URL`                                      | —        | Enables the `slack` notify channel.                                                                                                                            |
| `RESEND_API_KEY`, `NOTIFY_EMAIL_FROM`, `NOTIFY_EMAIL_TO` | —        | Enables the `email` notify channel (via [Resend](https://resend.com)).                                                                                         |

See `env.example` for a copy-pasteable starting point. It is not a dotfile, so
Netlify Drop can fetch it; copy it to `.env` if you want a local env file.

> **Note on sample data:** there is no env var for it. Local development
> (including a linked `netlify dev`) and the official demo site use in-memory
> sample data; every other deploy, previews and branch deploys included, uses
> Netlify Database. The app never
> infers this from whether `NETLIFY_DB_URL` happens to be set, because
> `@netlify/database` may create that value during local development before
> migrations have been applied.

## Enable auth

The app ships with auth **off**. To turn it on:

1. In the Netlify dashboard, enable Identity for your site (Site
   configuration → Identity → Enable Identity) — see
   [Netlify's Identity setup guide](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/get-started/#enable-identity).
2. That's it for detection. The app asks Netlify whether Identity is on (the
   project's Identity settings endpoint answers 404 when it's off) and picks
   it up within about a minute, no redeploy needed. There is no auth env var
   to set. If that check can't be completed (an outage, a password-protected
   deploy), the app assumes Identity is on rather than leave itself open.
3. Sign up yourself at `/login` before inviting anyone else — the very first
   signup automatically becomes the admin (see "Roles" below). Everyone after
   gets the `member` role, assigned by `netlify/functions/identity.mts`. No
   environment variable is needed; set `DEFAULT_ROLE` only to use a
   different role name. After that, invite users from the Identity tab, or
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
- Every new signup gets the default role in `app_metadata.roles` automatically,
  except the very first, which becomes the admin (see "Roles" below) — no
  manual dashboard step required for the common case.
- Every route under `/records` and `/admin` redirects anonymous visitors to
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
  event hook that assigns the default role to every new user's
  `app_metadata.roles` automatically: `DEFAULT_ROLE` if set (see "Environment
  variables" above), otherwise `appConfig.defaultRole` (`member`).
  Identity event hooks only fire against a real deploy with Identity
  enabled — not under `netlify dev`.
- **The first signup becomes the admin**: the same hook checks
  `hasAnyUsers()` (`src/auth/first-user.ts`, backed by the Identity admin
  API's `listUsers()`) and assigns `appConfig.adminRole` instead of
  the default role when nobody has signed up yet. This exists so a
  non-technical person deploying the template can administer their own site
  without ever opening the Identity dashboard. The app can't tell who
  deployed it (that takes a Netlify API token a running site doesn't have),
  so "first signup" is the claim. It has a race window (two
  people signing up in the same instant could both become admin) and, on
  open signups, a land-grab window (whoever signs up first — not necessarily
  the deployer — claims it) — see "After deploying to your account" above
  for closing the second one by signing up immediately. If the `listUsers()`
  check itself fails, the hook falls back to the default role rather than risk
  granting admin on an unconfirmed read. `/login`'s signup form shows a
  "you'll be the site admin" notice while this condition holds (see
  `src/server/first-user.ts` / `src/auth/client.tsx`).
- **Restricting who can sign up**: the same hook optionally enforces
  `ALLOWED_SIGNUP_DOMAIN` — set it to one exact email domain (e.g.
  `acme.com`) and any signup whose email domain doesn't match exactly (no
  subdomains) is denied via `event.deny()` before a role is ever assigned.
  It's optional: the hook has no way to know whether Identity's "open
  signups" setting is even on. Unset (the default) means no restriction — correct for invite-only setups, where every
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
(actor, action, before/after) for every create/update/delete. It's already
called from the three `src/server/records.ts` server functions
(`record.created`/`record.updated`/`record.deleted`) — copy that call
pattern for any new entity's mutations. No-ops when Identity auth is off.

**Reads are opt-in, per call site:** `auditRead(action, entity, entityId)`,
also from `src/auth/server.ts`, is the read counterpart — same persistence
path and actor resolution as `audit()`, just no before/after (a read has no
diff). **Nothing calls this automatically.** In particular, `records`'
`getRecord`/`listRecords` do not call it — `records` is reference demo data,
not sensitive, and logging every view of it would just be noise that trains
people to ignore `/admin/audit`. Call `auditRead()` explicitly from the
specific getter(s) that need a "who viewed this" trail (e.g. EEO fields,
attributed survey responses), using an action string ending in `.viewed`
(mirroring `audit()`'s `.created`/`.updated`/`.deleted` convention — see
`/admin/audit`'s Read/Change badge, which keys off that suffix). See
`src/server/example-audited-getter.ts` for a complete reference
implementation — copy it, point it at your real sensitive getter, done.

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
  `records` in `src/db/schema.ts`) rather than repeating a `deletedAt`
  column by hand.
- `notDeleted(column)` / `isNotDeleted(row)` — the shared query filter
  (DB mode) and predicate (demo mode) every entity's `list`/`get` functions
  use instead of an ad hoc `WHERE`/`.filter()` per call site.
- `deleteRecord`/`deleteRecordServer` set `deletedAt`; they never issue a
  real `DELETE`. `record.deleted` audit entries (see `/admin/audit`) mean
  the record was soft-deleted (recoverable via `deletedAt`, at the DB layer
  only — no restore UI ships in the base template), **not** physically
  destroyed; only an actual purge run removes the row, and purge is not
  itself audit-logged (see scope below).

**Hard purge:**

- `PURGE_ENABLED` (default `false`) — when off, no purge job runs, ever;
  `RECORD_RETENTION_DAYS` is never even read.
- `RECORD_RETENTION_DAYS` — only read (and only required) once
  `PURGE_ENABLED=true`. No default: a retention period is a compliance
  decision the deploying team has to make explicitly, not a number this
  template should guess.
- `netlify/functions/purge-deleted-records.mts` is a scheduled Netlify
  Function (daily, `0 3 * * *`) that no-ops unless `PURGE_ENABLED=true`,
  then hard-deletes records soft-deleted longer than `RECORD_RETENTION_DAYS`
  ago via `purgeExpiredRecords()` in `src/data/records.ts`. Copy this file
  for any other entity that opts into soft delete.

**Scope, explicitly:** one global `RECORD_RETENTION_DAYS` (no per-table
overrides), no audit trail beyond `deletedAt` itself (purge's only
observability is its own function return), and no restore/undelete UI —
recoverability at the data layer is the goal, not a build-out of tooling to
use it.

**This base template has no concept of data-sensitivity tiers or
reidentification thresholds**, and this mechanism doesn't invent one. If
your vertical layers field-level encryption, minimum-group-size reveal
thresholds, or similar sensitivity handling on top (e.g. a survey results
dashboard), you're responsible for defining how that logic interacts with
`deletedAt`/purge — the base template doesn't assume anything about it.

**Opting `records` out:** `records` ships with soft delete already wired in
as the _reference_ implementation for the mechanism above, not as
load-bearing infrastructure you're required to keep. If a vertical
genuinely doesn't want soft delete on `records`, revert these three touch
points:

1. Remove the `...softDeleteColumns` spread (and its index) from the
   `records` table in `src/db/schema.ts`, and run `npm run db:generate` for
   the migration that drops the column.
2. Remove the `notDeleted`/`isNotDeleted` filters from `listRecords`,
   `getRecord`, and `updateRecord` in `src/data/records.ts`.
3. Change `deleteRecord` back to a real `db.delete(records).where(eq(records.id, id))`
   (DB branch) / array splice (demo branch), and delete
   `purgeExpiredRecords` and `netlify/functions/purge-deleted-records.mts`
   along with it — a hard-delete-only entity has nothing left to purge.

## Database

Automatic. Every deploy except the official demo uses Netlify Database;
Netlify provisions it and applies every migration in
`netlify/database/migrations/` before the deploy goes live. There is nothing to
switch on. Locally you stay on sample data.

Optionally seed a deployed database with the same sample data (safe to
re-run, via `onConflictDoNothing`):

```bash
npm run db:seed
```

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
`src/db/schema.ts`, thread it through `src/data/records.ts`, and render it in
`src/routes/_app/records/$id.tsx`).

## Extension points

- **Add an entity**: `src/db/schema.ts` (table + `$inferSelect`/`$inferInsert`
  types) → `src/data/<entity>.ts` (demo/DB branches, same pattern as
  `records.ts`) → `src/server/<entity>.ts` (`createServerFn` wrappers with
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

Tests run with `SITE_ID` unset, which keeps the data layer on in-memory
sample data. They cover the demo data layer, flag parsing, the submission state
machine, and notify's input validation.

## Project layout

See `AGENTS.md` for a short orientation aimed at coding agents forking this
repo, and the folder-by-folder breakdown in the original implementation plan
for the full picture. The short version:

```
src/config/app.ts        # branding — the only file you edit to rebrand
src/config/flags.ts       # Sample-data / Identity detection — server-only
src/db/schema.ts          # Drizzle schema (source of truth for the DB shape)
src/db/soft-delete.ts      # deletedAt column mixin + shared query filter helpers
src/data/                 # one file per entity, demo/DB branches inside
src/server/                # createServerFn wrappers (Zod validation, auth, audit)
                              # example-audited-getter (opt-in read-audit reference)
src/auth/                  # session resolution, route guards, login UI
src/routes/                 # file-based routes (TanStack Router)
src/components/              # shadcn ui/, data-table/, forms/, states/
netlify/functions/            # notify, upload, files, events (background/HTTP)
                              # identity (signup role hook), example-protected (role-gate reference)
                              # purge-deleted-records (scheduled hard-purge reference)
```
