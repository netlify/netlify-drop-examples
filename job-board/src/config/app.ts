/**
 * Single source of truth for product branding.
 *
 * Downstream forks (HR, Finance, etc.) should only need to edit THIS file to
 * rebrand the app. Nothing else in the codebase should hardcode a product
 * name, tagline, or color — grep for them before adding new UI copy.
 */
export const appConfig = {
  productName: 'Northstar Careers',
  tagline: 'Find the work that moves you forward.',
  // Finishes the sentence "This is a starting point for …" on the About page
  // of the demo site.
  packDescription: 'an HR job board: post open roles, take applications, and review candidates',
  // This pack's page in the Netlify template catalog. About links to it, and
  // each setup checklist row's "Learn more" points at one of its anchors
  // (`#before-you-share`, `#works-with-<service>`).
  templatePageUrl: 'https://www.netlify.com/templates/job-board/',
  // Publishes a fresh copy of this pack through Netlify Drop. The "Make this
  // app yours" badge on the official demo site links here.
  dropUrl: 'https://app.netlify.com/drop?example=job-board',
  logo: {
    // Path relative to /public. Swap the file and keep the same path, or
    // change the path here.
    src: '/logo.svg',
    alt: 'Northstar Careers logo',
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
      { label: 'Open roles', to: '/' as const },
      { label: 'About', to: '/about' as const },
    ],
    internal: [{ label: 'Recruiting', to: '/records' as const }],
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
  officialDemoSiteId: 'a63c09e6-1dfd-4c51-981f-fe938e043ca5',
  // Roles allowed to upload/download files via `/api/upload` and
  // `/api/files/:key` (see `netlify/functions/upload.mts` /
  // `netlify/functions/files.mts`). Defaults to `[]` ("not configured
  // yet"), which makes both endpoints fail-closed with 403 even when
  // Netlify Identity auth is enabled — these endpoints touch real Netlify Blobs storage,
  // so they never fall back to a guessed role like `adminRole`. Set this to
  // your vertical's own attachment roles, e.g. `['admin', 'recruiter']`.
  // See README > Uploads.
  uploadAllowedRoles: ['admin', 'recruiter'] as string[],
} as const

export type AppConfig = typeof appConfig
