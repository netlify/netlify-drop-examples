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
  // Completes "This is a starting point for ..." on the About page (demo site
  // only). Describe what the pack does for the team, lowercase, no full stop.
  packDescription:
    'tracking records for an internal team, with a dashboard, sign-in, role-based permissions and an audit log',
  // This pack's page on netlify.com/templates. The About page links to it and
  // every Finish setting up row's "Learn more" points at one of its anchors
  // (#before-you-share, #works-with-[service]). To confirm: the live slug.
  templatePageUrl: 'https://www.netlify.com/templates/app-pack-template',
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
    ],
    // Shown in the account menu (under the user's email) for `adminRole` only.
    admin: [
      { label: 'Audit log', to: '/admin/audit' as const },
      { label: 'Usage events', to: '/admin/events' as const },
    ],
  },
  // The role required to see the built-in demo admin section (audit
  // log, usage events) and its account-menu links above. This is the only hardcoded role
  // name in the base template — change it to whatever your vertical's
  // taxonomy calls its top role, or remove the admin section entirely. See
  // README > Roles for the generic RBAC mechanism this plugs into.
  adminRole: 'admin',
  // The role every signup after the first gets in `app_metadata.roles` (see
  // `netlify/functions/identity.mts`). A fixed name, not an env var: there's
  // nothing to configure before enabling signups. Promote people beyond it
  // from the Identity tab. Rename it if your vertical calls its base role
  // something else.
  memberRole: 'member',
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
