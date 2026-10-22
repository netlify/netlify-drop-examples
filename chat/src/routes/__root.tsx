import {
  createRootRoute,
  Outlet,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ThemeProvider, Toaster } from 'app-packs-ui'
import { ConvexClientProvider } from '../convex'
import { SetupPrompt } from '../components/SetupPrompt'
import { appConfig } from '../config/app'
import { getAppContext, type AppContext } from '../server/context'

import appPackUiCss from 'app-packs-ui/styles.css?url'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  beforeLoad: async (): Promise<AppContext> => {
    return getAppContext()
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: appConfig.productName,
      },
      {
        name: 'description',
        content: appConfig.tagline,
      },
      // Link previews. Swap /public/og.png (1200×630) when you rebrand.
      { property: 'og:title', content: appConfig.productName },
      { property: 'og:description', content: appConfig.tagline },
      { property: 'og:image', content: '/og.png' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg',
      },
      {
        rel: 'manifest',
        href: '/site.webmanifest',
      },
      {
        rel: 'stylesheet',
        href: appPackUiCss,
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  component: () => (
    <RootDocument>
      <Outlet />
      <TanStackRouterDevtools />
    </RootDocument>
  ),
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system">
          <ConvexClientProvider>
            {children}
          </ConvexClientProvider>
          <Toaster />
          <SetupPrompt />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}
