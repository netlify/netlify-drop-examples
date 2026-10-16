import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { appConfig } from '@/config/app'
import { useAppContext } from '@/server/context'
import { ModeToggle } from '@/components/mode-toggle'
import { UserMenu } from '@/components/user-menu'
import { SetupPrompt } from '@/components/setup-prompt'
import { IdentityOffBanner } from '@/components/identity-off-banner'
import { Button } from 'app-packs-ui'
import { cn } from '@/lib/utils'

/**
 * App-wide chrome: header, nav, and content container. Reads branding from
 * `src/config/app.ts` only — never hardcode a product name here.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { authEnabled, demoMode, user } = useAppContext()
  const roleLabel = user ? roleLabelFor(user.roles) : null
  // The demo site shows About to everyone; a deployed copy only to its admins.
  const showAbout = demoMode || !!user?.roles.includes(appConfig.adminRole)

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
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-3">
            {showAbout ? (
              <Button asChild variant="outline" size="small">
                <Link to="/about">
                  <span className="sm:hidden">About</span>
                  <span className="hidden sm:inline">About this app</span>
                </Link>
              </Button>
            ) : null}
            <ModeToggle />
            {/* `requireRole()`/`checkRole()` no-op when auth is off, so
                every /admin/* route is already reachable to anyone in that
                state — hiding the admin links in the menu below would just
                make a working page undiscoverable. `user` is always
                non-null here when auth is off (see `getAppContext`'s
                `DEMO_SESSION_USER` fallback), so the menu — and the admin
                links inside it — renders in demo mode too, not just once a
                real admin signs in. */}
            {user ? (
              <UserMenu user={user} roleLabel={roleLabel} authEnabled={authEnabled} />
            ) : authEnabled ? (
              <Link to="/login" className="text-sm font-medium hover:underline">
                Log in
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <IdentityOffBanner />

      <main className={cn('mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-36')}>{children}</main>
      <SetupPrompt />
    </div>
  )
}

// Looks up the display label (src/config/app.ts) for whichever of the
// user's roles has one. Generic over the label map's keys, so it doesn't
// hardcode 'admin'/'respondent' — a different vertical's roleLabels map
// (different keys entirely) works here without touching this function.
function roleLabelFor(roles: string[]): string | null {
  const labels: Record<string, string> = appConfig.roleLabels
  const role = roles.find((r) => r in labels)
  return role ? labels[role] : null
}
