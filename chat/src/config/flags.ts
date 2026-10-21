import { appConfig } from './app'

/**
 * Server-only environment helpers.
 *
 * Always read `process.env` INSIDE these functions, never at module scope:
 * some server runtimes reuse a module across invocations with different env.
 * The results reach the client through `getAppContext()`
 * (src/server/context.ts), never through `VITE_*` variables.
 */

/**
 * True on a real Netlify deploy (production, previews, branch deploys), false
 * on a laptop, including `netlify dev` and `vite dev` with a linked site
 * (both set `SITE_ID`). `CONTEXT` and `NETLIFY` are build-time only, so
 * they can't be used here.
 */
export function isDeployed(): boolean {
  return (
    !!process.env.SITE_ID &&
    process.env.NETLIFY_DEV !== 'true' &&
    process.env.NODE_ENV !== 'development'
  )
}

/** True only on the canonical public demo project (`appConfig.officialDemoSiteId`). */
export function isOfficialDemoSite(): boolean {
  return process.env.SITE_ID === appConfig.officialDemoSiteId
}

/**
 * Whether the chat can reach a model. On Netlify, AI Gateway sets
 * `ANTHROPIC_API_KEY` automatically; setting your own key overrides it.
 */
export function isAIConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}
