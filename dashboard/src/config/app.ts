/**
 * Single source of truth for product branding.
 *
 * Downstream forks (HR, Finance, etc.) should only need to edit THIS file to
 * rebrand the app. Nothing else in the codebase should hardcode a product
 * name, tagline, or color — grep for them before adding new UI copy.
 */
export const appConfig = {
  productName: 'Pipeline & ARR',
  tagline: 'Pipeline and recurring revenue, at a glance.',
  logo: {
    // Path relative to /public. Swap the file and keep the same path, or
    // change the path here.
    src: '/logo.svg',
    alt: 'Pipeline & ARR logo',
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
      { label: 'About', to: '/about' as const },
    ],
    // Visible to `dataEditorRoles` only.
    editor: [{ label: 'Data', to: '/data' as const }],
    admin: [
      { label: 'Audit log', to: '/admin/audit' as const },
      { label: 'Usage events', to: '/admin/events' as const },
    ],
  },
  // The role required to see the built-in demo admin section (audit log,
  // usage events) and its nav links above. This is the only hardcoded role
  // name in the base template — change it to whatever your vertical's
  // taxonomy calls its top role, or remove the admin section entirely. See
  // README > Roles for the generic RBAC mechanism this plugs into.
  adminRole: 'admin',
  // Dashboard roles. Viewers (stakeholders) only view; editors and admins
  // also load data. Promote users in the Netlify Identity dashboard (app
  // metadata roles) — there is no in-app user management. See README > Roles.
  roles: { viewer: 'viewer', editor: 'editor', admin: 'admin' },
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
