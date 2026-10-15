import { useEffect, useRef } from 'react'
import { createRootRoute, HeadContent, Outlet, Scripts, useRouter } from '@tanstack/react-router'
import { ThemeProvider, Toaster } from 'app-packs-ui'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BrandTheme } from '@/components/brand-theme'
import { AppShell } from '@/components/app-shell'
import { appConfig } from '@/config/app'
import { getAppContext, type AppContext } from '@/server/context'
import { useAuthCallback } from '@/auth/client'
import { trackEvent } from '@/lib/track-event'
import appPackUiCss from 'app-packs-ui/styles.css?url'
import appCss from '@/styles.css?url'

export const Route = createRootRoute({
  beforeLoad: async (): Promise<AppContext> => {
    return getAppContext()
  },
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: appConfig.productName },
      { name: 'description', content: appConfig.tagline },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'stylesheet', href: appPackUiCss },
      { rel: 'stylesheet', href: appCss },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <BrandTheme />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system">
          <TooltipProvider>
            <RootShell />
          </TooltipProvider>
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}

function RootShell() {
  const { authEnabled } = Route.useRouteContext()
  useAuthCallback(authEnabled)
  usePageViewTracking()

  return (
    <AppShell>
      <Outlet />
      <Toaster />
    </AppShell>
  )
}

/** Emits a `page_view` event on every client-side navigation, deduped by pathname. */
function usePageViewTracking() {
  const router = useRouter()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    return router.subscribe('onResolved', (event) => {
      const pathname = event.toLocation.pathname
      if (pathname === lastPath.current) return
      lastPath.current = pathname
      trackEvent('page_view', { path: pathname })
    })
  }, [router])
}
