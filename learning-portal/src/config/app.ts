/**
 * Single source of truth for product branding.
 *
 * Downstream forks (HR, Finance, etc.) should only need to edit THIS file to
 * rebrand the app. Nothing else in the codebase should hardcode a product
 * name, tagline, or color — grep for them before adding new UI copy.
 */
export const appConfig = {
  productName: 'Acme Academy',
  tagline: 'The learning portal for everyone at Acme.',
  // Finishes the sentence "This is a starting point for …" on the About page
  // of the demo site.
  packDescription:
    'an employee learning portal: publish short courses, let everyone work through them, and track team progress',
  // This pack's page in the Netlify template catalog. About links to it, and
  // each setup checklist row's "Learn more" points at one of its anchors
  // (`#before-you-share`, `#works-with-<service>`). To confirm: the live slug.
  templatePageUrl: 'https://www.netlify.com/templates/learning-portal/',
  // Publishes a fresh copy of this pack through Netlify Drop. The "Make this
  // app yours" badge on the official demo site links here.
  dropUrl: 'https://app.netlify.com/drop?example=learning-portal',
  logo: {
    // Path relative to /public. Swap the file and keep the same path, or
    // change the path here.
    src: '/logo.svg',
    alt: 'Acme Academy logo',
  },
  colors: {
    // HSL channel triples (no `hsl()` wrapper) so they can be interpolated
    // directly into CSS custom properties for both light and dark themes.
    // Teal primary — 30% lightness keeps white text above WCAG AA (4.5:1).
    light: {
      primary: '173 70% 28%',
      primaryForeground: '0 0% 100%',
    },
    dark: {
      primary: '170 60% 55%',
      primaryForeground: '200 50% 10%',
    },
  },
  nav: {
    primary: [
      { label: 'My learning', to: '/' as const },
      { label: 'Course catalog', to: '/courses' as const },
    ],
    // Shown to `learning.managerRoles` (see below).
    manager: [
      { label: 'Manage courses', to: '/manage/courses' as const },
      { label: 'Team progress', to: '/manage/progress' as const },
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
  officialDemoSiteId: '0b06729f-158f-4c37-8a3b-4bddc6326628',
  // Roles allowed to upload/download files via `/api/upload` and
  // `/api/files/:key` (see `netlify/functions/upload.mts` /
  // `netlify/functions/files.mts`). Defaults to `[]` ("not configured
  // yet"), which makes both endpoints fail-closed with 403 even when
  // Netlify Identity auth is enabled — these endpoints touch real Netlify Blobs storage,
  // so they never fall back to a guessed role like `adminRole`. Set this to
  // your vertical's own attachment roles, e.g. `['admin', 'recruiter']`.
  // See README > Uploads.
  uploadAllowedRoles: [] as string[],
  // Learning hub copy and permissions. Edit freely when forking — this is
  // content, not code.
  learning: {
    // Roles allowed to create/edit/publish courses and view the team
    // progress report. Every signed-in user can take published courses.
    managerRoles: ['admin', 'hr_admin'] as string[],
    // Who you are whenever sign-in is off (local dev, the public demo): the
    // dashboard greets this name and progress is recorded against them.
    demoUser: { name: 'Alex Morgan', email: 'alex.morgan@example.com' },
    welcomeTitle: 'Welcome back',
    welcomeSubtitle: 'Complete your learning checklist to get started.',
    gettingStarted: [
      'Acme Academy is where every Acme employee learns how we work — from our mission, values, and culture to setting up the systems and tools you’ll use every day.',
      'Each course is a short checklist of lessons. Open the linked resource, work through it, and tick the lesson off. Your progress saves automatically, so you can come back any time.',
    ],
    tips: [
      'Start with lessons marked high priority, then move to medium and low.',
      'Required lessons are marked with an asterisk (*); optional ones deepen your knowledge.',
      'Spread lessons out over your first few weeks — understanding beats speed.',
      'Bookmark resources you’ll want to reference on the job.',
      'Questions? Ask your manager or reach out to the contacts under “Need help?”.',
    ],
    helpContacts: [
      {
        topic: 'Questions about a course',
        contact: 'Acme Academy team',
        detail: 'learning@example.com',
      },
      {
        topic: 'Policies, benefits & your role',
        contact: 'Your manager or People team',
        detail: 'people@example.com',
      },
      { topic: 'Accounts, devices & tool access', contact: 'IT help desk', detail: 'helpdesk@example.com' },
    ],
  },
} as const

export type AppConfig = typeof appConfig
