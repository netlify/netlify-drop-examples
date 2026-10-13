/**
 * Single source of truth for product branding.
 *
 * Downstream forks (HR, Finance, etc.) should only need to edit THIS file to
 * rebrand the app. Nothing else in the codebase should hardcode a product
 * name, tagline, or color — grep for them before adding new UI copy.
 */
export const appConfig = {
  productName: 'App Pack',
  tagline: 'A starter you can actually ship.',
  logo: {
    // Path relative to /public. Swap the file and keep the same path, or
    // change the path here.
    src: '/logo.svg',
    alt: 'App Pack logo',
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
      { label: 'Dashboard', to: '/' as const },
      { label: 'Records', to: '/records' as const },
      { label: 'About', to: '/about' as const },
    ],
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
  // The Netlify site ID of the canonical public demo. That one deploy runs on
  // sample data and shows a "Make this app yours" badge (see
  // `src/components/setup-prompt.tsx`); every other deploy uses the real
  // database and shows the admin-only setup checklist instead. If your fork
  // has no hosted demo, delete this, `isOfficialDemoSite()` in
  // `src/config/flags.ts`, and `netlify-deploy-badge.tsx`.
  officialDemoSiteId: '480ddca5-1fd1-4784-b8c7-c889474b8cf9',
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
