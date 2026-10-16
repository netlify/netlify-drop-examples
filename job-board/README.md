# Northstar Careers — HR job board

A TanStack Start + shadcn/ui application, forked from the
[App starter](../app-starter/) base template, for posting open roles and
hiring against them. Candidates browse open roles and apply with a resume;
recruiters manage roles, move applications through a pipeline, and leave
private notes. It runs on sample data locally and on the canonical public demo
project (in-memory, no database or auth required), and turns on real
authentication automatically when Netlify Identity is enabled for a deployed
project.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. You're on sample data: the careers page, the
recruiting pipeline and every form work against an in-memory dataset with a
built-in demo user. Data resets on every cold start. Nothing to configure.

## Publish it with Netlify Drop

Pick this project on [Netlify Drop](https://app.netlify.com/drop?example=job-board).
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
   site so migrations run before you add jobs.
3. If this app should be private, enable Identity in the Netlify dashboard.
   The app notices within about a minute, with no redeploy, and visitors are
   then sent to `/login` until they sign in.
4. Sign up yourself at `/login` right away, **before** sharing the URL
   with anyone else — the first person to sign up automatically becomes the
   site admin (see "Roles" below), so signing up first is how you claim that
   account. After that, invite everyone else from the Identity tab, or leave
   public signups on if that's what your site needs.
5. Optional setup lives on the environment variables page,
   `https://app.netlify.com/projects/{sitename}/configuration/env`:
   `ALLOWED_SIGNUP_DOMAIN` for signup restrictions, and notification keys for
   Slack or email.

## Go live checklist

A "Finish setting up" card floats in the corner of the app for **admins
only**. It is a UX nudge, not access control: it links to dashboard pages and
exposes no data. It directs (one action per row); the template page explains
and the About page orients, so setup steps live here and nowhere else in the
app.

- **Visible only to admins.** Everyone else, and logged-out visitors, sees
  nothing. With sign-in off, the stand-in demo user counts as an admin, so it
  also shows in local dev.
- **Hides itself** once every _required_ row is done. The X dismisses it for
  good (stored in `localStorage`); clear site storage to bring it back.
- **Manual rows** are ones the app can't detect. The admin ticks "I've done
  this" (also stored in `localStorage`), and they never block the card from
  hiding.
- **On the official demo site** the "Make this app yours" badge shows instead.

Each row has a title, why, action (a dashboard link or an "Ask your agent"
prompt), done when, required, and a "Learn more" link to a section of the
template page (`appConfig.templatePageUrl`, anchor `#before-you-share`).

1. **Check who can open your app** (manual, optional) — project visibility in
   the Netlify dashboard decides who can load the page at all.
2. **Turn on app sign-in (Netlify Identity)** (required) — done when Identity
   is on. Separate from project visibility.
3. **Make yourself the admin** (required) — the first signup becomes the
   admin; done when Identity is on and you hold the admin role.
4. **Choose who can sign up** (manual, optional) — set
   `ALLOWED_SIGNUP_DOMAIN` (exact domain, enforced by the signup hook in
   `netlify/functions/identity.mts`), and/or turn off open signups and invite
   people from the Identity tab.

To remove it, delete `src/components/setup-prompt.tsx`,
`src/components/go-live-checklist.tsx` and
`src/components/netlify-deploy-badge.tsx`, plus the `<SetupPrompt />` line in
`src/components/app-shell.tsx`.

## About this app

The "About this app" button in the header opens `/about`: one paragraph and a
link to the template page. The demo site shows the button to everyone; a
deployed copy shows it to admins only. The demo site says what the app is a starting point
for (`appConfig.packDescription`) and that its sample data isn't saved; a
deployed copy says its records are saved in Netlify Database. Nothing else
goes on that page.

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
  a job, application or note marks it (`deletedAt`); it's never actually
  removed. Every table shares the same `softDeleteColumns`/`notDeleted`/
  `isNotDeleted` primitives instead of reimplementing filtering per table.
- **Not provided (yet)** — don't assume these exist:
  - **Audience/targeting** (who a resource is visible to, as distinct from
    what a role permits) — deferred pending a second vertical to design
    against.
  - **Bulk/CSV export** from the data table.
  - **PII/data-sensitivity tiering** (field-level encryption, reidentification
    thresholds, etc.) — a vertical's own responsibility if it needs this; see
    the note in "Soft delete" on how that interacts with `deletedAt`.
  - **Permanent deletion** of soft-deleted rows, or a retention policy.

## Environment variables

| Variable                                                 | Default | Purpose                                                                                                                                                      |
| -------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NETLIFY_DB_URL`                                         | —       | Set automatically by `@netlify/database` / `netlify database init`. Don't set by hand.                                                                       |
| `AUTH_DEV_USER`                                          | —       | Local-dev-only fake session, e.g. `{"email":"you@example.com","roles":["admin"]}`. Turns auth on only when running under `netlify dev` (`NETLIFY_DEV=true`). |
| `ALLOWED_SIGNUP_DOMAIN`                                  | —       | Optional — restricts signups to one exact email domain (no subdomains). Unset means no restriction. See "Roles" below.                                       |
| `SLACK_WEBHOOK_URL`                                      | —       | Enables the `slack` notify channel.                                                                                                                          |
| `RESEND_API_KEY`, `NOTIFY_EMAIL_FROM`, `NOTIFY_EMAIL_TO` | —       | Enables the `email` notify channel (via [Resend](https://resend.com)).                                                                                       |

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
   signup automatically becomes the admin instead of getting the `member`
   role (see "Roles" below). After that, invite users from the Identity tab,
   or let them sign up directly if signups are enabled in your Identity
   settings. Promote specific users beyond `member` from the Identity tab
   (`roles` land in `app_metadata.roles`, never `user_metadata` — see "Roles"
   below).

With auth on:

- `/login` handles login, signup, "forgot password," and any OAuth providers
  you've enabled in Identity settings.
- `/reset-password` is the shared "set a password" screen for both password
  recovery and invite links — reached via redirect, not linked directly.
  Recovery finishes with `updateUser({ password })`; invites finish with
  `acceptInvite(token, password)`. See `src/auth/client.tsx`'s
  `useAuthCallback`/`ResetPasswordForm` for how the two flows are told apart.
- Every new signup gets the `member` role in `app_metadata.roles` automatically,
  except the very first, which becomes the admin (see "Roles" below) — no
  manual dashboard step required for the common case.
- Every route under `/recruiting` and `/admin` redirects anonymous visitors to
  `/login` — but the **real** authorization boundary is `requireUser()` /
  `requireRole()` inside each server function (`src/server/*.ts`), which runs
  regardless of how the request got there.
- Mutations get audit-logged (actor, action, before/after) — see
  `/admin/audit`. Read-level logging exists too, but is opt-in per call
  site — see "Audit logging" below.

**What the form does for each Identity setting.** `LoginForm` asks
`getSettings()` and adapts; change these under Identity, Registration in the
Netlify dashboard:

| Setting                                                 | What the person sees                                                                                                                                                                                                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email confirmation on (the default)                     | After signing up, a "Check your email" screen. They log in after opening the link. The first admin becomes admin when they confirm. Logging in before confirming says to confirm first.                                                                          |
| Email confirmation off (autoconfirm)                    | Signing up logs them straight in.                                                                                                                                                                                                                                |
| Email and password on, no provider                      | The email form only.                                                                                                                                                                                                                                             |
| Google (or another provider) on, email and password off | Just a "Continue with Google" button: no email form, no sign-up toggle, no forgot-password link. The first admin notice still shows, without the email-confirmation line. If Identity doesn't report email as off, the email form stays so nobody is locked out. |
| Google (or another provider) on                         | A button for each enabled provider, on both the login and signup forms. A refused login or an expired link shows a message instead of failing silently.                                                                                                          |
| Sign-up off (invite only)                               | The Sign up option is hidden and the form says sign-up is by invitation only. If nobody has an account yet, it tells the deployer to invite themselves from the Identity tab.                                                                                    |

**When Identity isn't on yet for a deployed copy**, every visitor is treated
as the admin, so the app says so, gently: a banner under the header on every
page ("Sign-in isn't on yet. Turn it on before you share this link…") and a
"Let's turn on sign-in" notice at `/login`, instead of a silent redirect. Both
go away on their own once Identity is on. They never show in demo mode.

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
  event hook that assigns `appConfig.memberRole` (`'member'`, nothing to
  configure) to every new user's `app_metadata.roles` automatically.
  Identity event hooks only fire against a real deploy with Identity
  enabled — not under `netlify dev`.
- **The first signup becomes the admin**: the same hook checks
  `hasOtherConfirmedUser()` (`src/auth/first-user.ts`, backed by the Identity
  admin API's `listUsers()`) and assigns `appConfig.adminRole` instead of
  `appConfig.memberRole` when nobody has signed up yet. This exists so a
  non-technical person deploying the template can administer their own site
  without ever opening the Identity dashboard. It has a race window (two
  people signing up in the same instant could both become admin) and, on
  open signups, a land-grab window (whoever signs up first — not necessarily
  the deployer — claims it) — see "After deploying to your account" above
  for closing the second one by signing up immediately. If the `listUsers()`
  check itself fails, the hook falls back to `member` rather than risk
  granting admin on an unconfirmed read. With email confirmation on, the hook
  runs when the person confirms, when their own record is already in Identity,
  so the check ignores the signing-up user and accounts that never confirmed:
  the first person to confirm is the admin. (Unverified against a real
  deploy; Identity doesn't run under `netlify dev`.) `/login`'s signup form shows a
  "you'll be the site admin" notice while this condition holds (see
  `src/server/first-user.ts` / `src/auth/client.tsx`).
- **Restricting who can sign up**: the same hook optionally enforces
  `ALLOWED_SIGNUP_DOMAIN` — set it to one exact email domain (e.g.
  `acme.com`) and any signup whose email domain doesn't match exactly (no
  subdomains) is denied via `event.deny()` before a role is ever assigned.
  This is optional rather than fail-loud: the hook
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

**The two hardcoded role names in the base template** are
`appConfig.adminRole` (`src/config/app.ts`, defaults to `'admin'`) and
`appConfig.memberRole` (defaults to `'member'`, the role every signup after
the first gets). `adminRole` gates the built-in demo `/admin` section (audit log, usage events) and its
account-menu links. Rename them, or remove the admin section entirely, when
forking for a vertical with its own taxonomy.

A role set at signup is in place for the user's first sign-in. Roles ride in
the JWT, so a later change from the Identity tab takes effect on the user's
next login or token refresh, not immediately.

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
called from every mutation in `src/server/recruiting.ts` (`job.created`,
`application.updated`, `application-note.deleted` and so on) — copy that
call pattern for any new entity's mutations. No-ops when Identity auth is off.

**Reads are opt-in, per call site:** `auditRead(action, entity, entityId)`,
also from `src/auth/server.ts`, is the read counterpart — same persistence
path and actor resolution as `audit()`, just no before/after (a read has no
diff). **Nothing calls this automatically.** Job listings aren't logged:
they're public, and logging every view would be noise that trains people to
ignore `/admin/audit`. Opening an application is: `getApplicationServer` in
`src/server/recruiting.ts` calls `auditRead('application.viewed', …)`
because it shows a candidate's contact details, resume and private notes.
Copy that call into any other getter that needs a "who viewed this" trail,
using an action string ending in `.viewed` (mirroring `audit()`'s
`.created`/`.updated`/`.deleted` convention — see `/admin/audit`'s
Read/Change badge, which keys off that suffix).

## Soft delete

**Always on, not configurable.** Deleting marks a row deleted (`deletedAt`)
and excludes it from every query, while keeping it in the database. There's
no vertical for which "deletions are silently unrecoverable" is the right
default.

From `src/db/soft-delete.ts`:

- `softDeleteColumns` — spread into a `pgTable(...)` definition (see `jobs`
  in `src/db/schema.ts`) rather than repeating a `deletedAt` column by hand.
- `notDeleted(column)` / `isNotDeleted(row)` — the shared query filter
  (DB mode) and predicate (demo mode) every `list`/`get`/`update` function in
  `src/data/recruiting.ts` uses instead of an ad hoc `WHERE`/`.filter()`.

What each delete covers:

- **Job** — the job, its applications and their notes, in one transaction,
  so a deleted role never leaves orphaned candidates in the pipeline.
  Closing a job (status `closed`) is the way to stop applications but keep
  the candidates.
- **Application** — the application and its notes. Setting the status to
  Rejected is the way to keep a record of the decision.
- **Note** — just the note.

`job.deleted`, `application.deleted` and `application-note.deleted` audit
entries mean the row was soft-deleted, not destroyed. Resumes stay in Netlify
Blobs. There is no restore UI and no permanent purge: if your team needs a
retention policy (for example, deleting candidate data after a set period),
that's a compliance decision to make and build explicitly.

**This app has no concept of data-sensitivity tiers**, and this mechanism
doesn't invent one. If you layer field-level encryption or similar on top,
you're responsible for defining how it interacts with `deletedAt`.

## Database

Automatic. Every deploy except the official demo uses Netlify Database;
Netlify provisions it and applies every migration in
`netlify/database/migrations/` before the deploy goes live. There is nothing to
switch on. Locally you stay on sample data.

Optionally seed a deployed database with the same sample jobs, applications
and notes (safe to re-run, via `onConflictDoNothing`). Seeded applications
point at resume files that don't exist, so "Open resume" 404s for them:

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

Candidate resumes don't use this endpoint: applicants have no account, so
they upload through `/api/candidate-resume`
(`netlify/functions/candidate-resume.mts`), which accepts one PDF or Word
file up to 4 MB and stores it under `candidate-resumes/`.
`submitApplicationServer` refuses any other key. Recruiters then download
resumes through `/api/files/:key`, gated by `uploadAllowedRoles` as above.

## Extension points

- **Add an entity**: `src/db/schema.ts` (table + `$inferSelect`/`$inferInsert`
  types) → `src/data/<entity>.ts` (demo/DB branches, same pattern as
  `recruiting.ts`) → `src/server/<entity>.ts` (`createServerFn` wrappers with
  Zod validation) → `src/routes/_app/<area>/` (list/detail/new routes, like
  `src/routes/_app/recruiting/`). Spread `softDeleteColumns` into its table
  and use `notDeleted`/`isNotDeleted` in its `list`/`get` functions — see
  "Soft delete" above.
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
src/auth/                  # session resolution, route guards, login UI
src/routes/                 # file-based routes (TanStack Router)
src/components/              # shadcn ui/, data-table/, forms/, states/
netlify/functions/            # notify, upload, files, events (background/HTTP)
                              # identity (signup role hook), example-protected (role-gate reference)
                              # candidate-resume (public resume upload)
```
