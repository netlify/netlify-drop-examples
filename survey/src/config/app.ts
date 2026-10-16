/**
 * Single source of truth for product branding.
 *
 * Downstream forks (HR, Finance, etc.) should only need to edit THIS file to
 * rebrand the app. Nothing else in the codebase should hardcode a product
 * name, tagline, or color — grep for them before adding new UI copy.
 */
export const appConfig = {
  productName: 'Pulse',
  tagline: 'Quick, honest check-ins with your team.',
  // Where "Deploy to Netlify" / "Make this app yours" send people: this
  // project on Netlify Drop (the directory name in netlify-drop-examples is
  // the `example` parameter, so don't rename the directory without updating
  // this). Used by GoLiveChecklist and SetupPrompt's deploy badge.
  dropUrl: 'https://app.netlify.com/drop?example=survey',
  // The Netlify site ID of the official hosted demo (Site configuration >
  // General > Site details). Compared against `process.env.SITE_ID` (see
  // `isOfficialDemoSite` in src/config/flags.ts) to decide whether
  // `SetupPrompt` shows the "Make this app yours" badge instead of the
  // Go-Live Checklist, and `isDemoMode()` stays on sample data.
  // Every other deploy of this fork — including your own — has a different
  // SITE_ID, so this only ever matches the one site above. If your fork has no
  // hosted demo, delete this, `isOfficialDemoSite()` in
  // `src/config/flags.ts`, and `netlify-deploy-badge.tsx`.
  officialDemoSiteId: 'fd335b1f-975f-4dc4-b929-166671d26c6a',
  // Completes "This is a starting point for ..." on the About page (demo site
  // only). Describe what the pack does for the team, lowercase, no full stop.
  packDescription:
    'running internal HR surveys, with pulse check-ins, results dashboards, sign-in, role-based permissions and an audit log',
  // This pack's page on netlify.com/templates. The About page links to it and
  // every Finish setting up row's "Learn more" points at one of its anchors
  // (#before-you-share, #works-with-[service]). To confirm: the live slug.
  templatePageUrl: 'https://www.netlify.com/templates/hr-survey',
  logo: {
    // Path relative to /public. Swap the file and keep the same path, or
    // change the path here. Still the base template's placeholder mark —
    // swap /public/logo.svg for a real one whenever you have it.
    src: '/logo.svg',
    alt: 'Pulse logo',
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
      { label: 'Surveys', to: '/surveys' as const },
    ],
    // Shown in the account menu (under the user's email) for `adminRole` only.
    admin: [
      { label: 'Manage surveys', to: '/admin/surveys' as const },
      { label: 'Responses', to: '/admin/responses' as const },
      { label: 'Results', to: '/admin/results' as const },
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
  // Roles allowed to upload/download files via `/api/upload` and
  // `/api/files/:key` (see `netlify/functions/upload.mts` /
  // `netlify/functions/files.mts`). Defaults to `[]` ("not configured
  // yet"), which makes both endpoints fail-closed with 403 even when
  // Netlify Identity auth is enabled — these endpoints touch real Netlify Blobs storage,
  // so they never fall back to a guessed role like `adminRole`. Set this to
  // your vertical's own attachment roles, e.g. `['admin', 'recruiter']`.
  // See README > Uploads.
  uploadAllowedRoles: [] as string[],
  // The role assigned to every new sign-in (see
  // netlify/functions/identity.mts). Hardcoded here rather than a required
  // env var: this vertical's taxonomy is fixed to exactly two roles (see
  // README > Roles), so there's no deployment-time decision to make, and a
  // missing env var can't silently break every signup. Always the
  // least-privileged role in your taxonomy.
  defaultRole: 'respondent',
  // Display labels for this vertical's role values, keyed by the generic
  // role string stored in Identity's app_metadata.roles. UI-only — never
  // used for authorization (requireRole()/checkRole() compare against the
  // generic role strings, not these labels), so other verticals can swap
  // this map without touching any auth code.
  roleLabels: {
    admin: 'HR Admin',
    respondent: 'Employee',
  },
} as const

export type AppConfig = typeof appConfig
