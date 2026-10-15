/**
 * Single source of truth for product branding.
 *
 * Downstream forks (HR, Finance, etc.) should only need to edit THIS file to
 * rebrand the app. Nothing else in the codebase should hardcode a product
 * name, tagline, or color — grep for them before adding new UI copy.
 */
export const appConfig = {
  productName: 'Pipeline',
  tagline: 'Pipeline and recurring revenue, at a glance.',
  // Completes "This is a starting point for ..." on the About page (demo site
  // only). Describe what the pack does for the team, lowercase, no full stop.
  packDescription:
    'a read-only pipeline and ARR dashboard your team loads from CSV, Snowflake or Salesforce, with sign-in, role-based permissions and an audit log',
  // This pack's page on netlify.com/templates. The About page links to it and
  // every Finish setting up row's "Learn more" points at one of its anchors.
  templatePageUrl: 'https://www.netlify.com/templates/dashboard/',
  logo: {
    // Path relative to /public. Swap the file and keep the same path, or
    // change the path here.
    src: '/logo.svg',
    alt: 'Pipeline logo',
  },
  colors: {
    // HSL channel triples (no `hsl()` wrapper) so they can be interpolated
    // directly into CSS custom properties for both light and dark themes.
    light: {
      primary: '222 89% 55%',
      primaryForeground: '0 0% 100%',
    },
    dark: {
      primary: '222 89% 65%',
      primaryForeground: '222 47% 11%',
    },
  },
  nav: {
    primary: [
      { label: 'Overview', to: '/' as const },
      { label: 'Pipeline', to: '/pipeline' as const },
      { label: 'ARR', to: '/arr' as const },
      { label: 'Breakdown', to: '/breakdown' as const },
    ],
    // Visible to `dataEditorRoles` only.
    editor: [{ label: 'Data', to: '/data' as const }],
    // Shown in the account menu (under the user's email) for `adminRole` only.
    admin: [
      { label: 'Audit log', to: '/admin/audit' as const },
      { label: 'Usage events', to: '/admin/events' as const },
    ],
  },
  // The role required to see the built-in demo admin section (audit log,
  // usage events) and its account-menu links above. This is the only hardcoded role
  // name in the base template — change it to whatever your vertical's
  // taxonomy calls its top role, or remove the admin section entirely. See
  // README > Roles for the generic RBAC mechanism this plugs into.
  adminRole: 'admin',
  // Dashboard roles. Viewers (stakeholders) only view; editors and admins
  // also load data. Promote users in the Netlify Identity dashboard (app
  // metadata roles) — there is no in-app user management. See README > Roles.
  roles: { viewer: 'viewer', editor: 'editor', admin: 'admin' },
  // The role every signup after the first gets in `app_metadata.roles` (see
  // `netlify/functions/identity.mts`; the first signup gets `adminRole`). A
  // fixed name, not an env var: there's nothing to configure before enabling
  // signups. Read-only by design — promote people who load data to `editor`
  // from the Identity tab.
  memberRole: 'viewer',
  // Roles that may upload datasets, refresh from Snowflake and download raw files.
  dataEditorRoles: ['editor', 'admin'] as string[],
  // Roles allowed to upload/download files via `/api/upload` and
  // `/api/files/:key` (see `netlify/functions/upload.mts` /
  // `netlify/functions/files.mts`). Defaults to `[]` ("not configured
  // yet"), which makes both endpoints fail-closed with 403 even when
  // Netlify Identity auth is enabled — these endpoints touch real Netlify Blobs storage,
  // so they never fall back to a guessed role like `adminRole`. Set this to
  // your vertical's own attachment roles, e.g. `['admin', 'recruiter']`.
  // See README > Uploads.
  uploadAllowedRoles: [] as string[],
} as const

export type AppConfig = typeof appConfig
