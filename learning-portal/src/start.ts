import { createStart, createCsrfMiddleware } from '@tanstack/react-start'

// Rejects cross-site requests to server functions (same-origin RPC
// endpoints, not a public API) via the Sec-Fetch-Site/Origin/Referer checks
// TanStack Start's CSRF middleware runs by default.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
})

// Global TanStack Start configuration hook. See:
// https://tanstack.com/start/latest/docs/framework/react/middleware
export const startInstance = createStart(() => {
  return {
    requestMiddleware: [csrfMiddleware],
  }
})
