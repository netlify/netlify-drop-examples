/**
 * Single source of truth for product branding. Edit this file (and the
 * `--ap-*` tokens in `src/styles.css`) to rebrand the chat app.
 */
export const appConfig = {
  productName: 'Newt',
  tagline:
    'You can ask me about anything, I might or might not have a good answer, but you can still ask.',
  assistantName: 'Claude',
  // Base URL for the setup checklist's "Learn more" links (README anchors).
  docsUrl: 'https://github.com/netlify/netlify-drop-examples/tree/main/chat',
  // The Netlify site ID of the canonical public demo
  // (https://tanstack-starter.netlify.app). That one deploy shows a "Make
  // this app yours" badge (see `src/components/SetupPrompt.tsx`); every other
  // copy shows the setup checklist instead. If your fork has no hosted demo,
  // delete this, `isOfficialDemoSite()` in `src/config/flags.ts`, and
  // `NetlifyDeployBadge.tsx`.
  officialDemoSiteId: '4cf688bb-daf9-47df-8b2f-1ff1f0840c62',
} as const

export type AppConfig = typeof appConfig
