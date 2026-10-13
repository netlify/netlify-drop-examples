import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { appConfig } from '@/config/app'
import { useAppContext } from '@/server/context'
import { ModeToggle } from '@/components/mode-toggle'
import { SetupPrompt } from '@/components/setup-prompt'
import { LogoutButton } from '@/auth/client'
import { Badge } from 'app-packs-ui'
import { cn } from '@/lib/utils'

/**
 * App-wide chrome: header, nav, and content container. Reads branding from
 * `src/config/app.ts` only — never hardcode a product name here.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { authEnabled, demoMode, user } = useAppContext()

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:gap-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <img src={appConfig.logo.src} alt={appConfig.logo.alt} className="size-6" />
            <span className="hidden sm:inline">{appConfig.productName}</span>
          </Link>

          <nav className="flex items-center gap-3 text-sm text-muted-foreground sm:gap-4">
            {appConfig.nav.primary.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="hover:text-foreground [&.active]:font-medium [&.active]:text-foreground"
                activeProps={{ className: 'active' }}
              >
                {item.label}
              </Link>
            ))}
            {user?.roles?.includes(appConfig.adminRole)
              ? appConfig.nav.admin.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="hover:text-foreground [&.active]:font-medium [&.active]:text-foreground"
                    activeProps={{ className: 'active' }}
                  >
                    {item.label}
                  </Link>
                ))
              : null}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {demoMode ? (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                Sample data
              </Badge>
            ) : null}
            <ModeToggle />
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden text-sm text-muted-foreground sm:inline">{user.email}</span>
                {authEnabled ? <LogoutButton /> : null}
              </div>
            ) : authEnabled ? (
              <Link to="/login" className="text-sm font-medium hover:underline">
                Log in
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <main className={cn('mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-24')}>{children}</main>
      <SetupPrompt />
    </div>
  )
}
