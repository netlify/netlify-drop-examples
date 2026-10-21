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
    ],
    links: [
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
