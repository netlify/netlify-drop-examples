import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Info } from 'lucide-react'
import { appConfig } from '@/config/app'
import { useAppContext } from '@/server/context'
import { ModeToggle } from '@/components/mode-toggle'
import { SetupPrompt } from '@/components/setup-prompt'
import { UserMenu } from '@/components/user-menu'
import { Button } from 'app-packs-ui'
import { cn } from '@/lib/utils'

/**
 * App-wide chrome: header, nav, and content container. Reads branding from
 * `src/config/app.ts` only — never hardcode a product name here.
 */
// Carries the dashboard date range (`from`/`to`) across nav links. Routes
// without those search params simply ignore them (undefined values are dropped).
const keepRange = ((prev: { from?: string; to?: string }) => ({ from: prev.from, to: prev.to })) as never

export function AppShell({ children }: { children: ReactNode }) {
  const { authEnabled, demoMode, user } = useAppContext()
  // The demo site shows About to everyone; a deployed copy only to its admins.
  const showAbout = demoMode || !!user?.roles?.includes(appConfig.adminRole)

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:gap-6 sm:px-4">
          <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold">
            {/* width/height keep the logo 24px even if the stylesheet hasn't applied
              yet (the SVG has no intrinsic size and would fill its container). */}
            <img
              src={appConfig.logo.src}
              alt={appConfig.logo.alt}
              width={24}
              height={24}
              className="size-6"
            />
            <span className="hidden sm:inline">{appConfig.productName}</span>
          </Link>

          {/* Up to five links don't fit beside the controls on a phone, so the nav
            scrolls sideways there instead of pushing the header past the screen. */}
          <nav className="flex min-w-0 items-center gap-3 overflow-x-auto text-sm whitespace-nowrap text-muted-foreground [scrollbar-width:none] sm:gap-4">
            {appConfig.nav.primary.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                search={keepRange}
                className="hover:text-foreground [&.active]:font-medium [&.active]:text-foreground"
                activeProps={{ className: 'active' }}
              >
                {item.label}
              </Link>
            ))}
            {user?.roles?.some((r) => appConfig.dataEditorRoles.includes(r))
              ? appConfig.nav.editor.map((item) => (
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

          <div className="ml-auto flex shrink-0 items-center sm:gap-3">
            {showAbout ? (
              <Button asChild variant="outline" size="small" className="max-sm:px-2.5">
                <Link to="/about" search={keepRange}>
                  <Info className="size-4 min-[360px]:hidden" aria-hidden="true" />
                  <span className="max-[359px]:sr-only sm:hidden">About</span>
                  <span className="hidden sm:inline">About this app</span>
                </Link>
              </Button>
            ) : null}
            <ModeToggle />
            {user ? (
              <UserMenu />
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
