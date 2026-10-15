import { useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { appConfig } from '@/config/app'
import { useAppContext } from '@/server/context'
import { ModeToggle } from '@/components/mode-toggle'
import { SetupPrompt } from '@/components/setup-prompt'
import { UserMenu } from '@/components/user-menu'
import { Badge, Button } from 'app-packs-ui'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

type NavItem = {
  label: string
  to: (typeof appConfig.nav)[keyof typeof appConfig.nav][number]['to'] | '/about'
}

/**
 * App-wide chrome: header, nav, and content container. Reads branding from
 * `src/config/app.ts` only — never hardcode a product name here.
 *
 * Desktop shows the nav inline; below `lg` it collapses into a slide-out
 * drawer so long labels never overflow on phones. A skip link lets keyboard
 * and screen-reader users jump straight to the page content.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { authEnabled, demoMode, user } = useAppContext()
  const [menuOpen, setMenuOpen] = useState(false)

  const roles = user?.roles ?? []
  // UX only — the real check is `requireRole()` inside each server function.
  const isManager = !authEnabled || appConfig.learning.managerRoles.some((role) => roles.includes(role))
  // The demo site shows About to everyone; a deployed copy only to its admins.
  const showAbout = demoMode || roles.includes(appConfig.adminRole)

  // Admin pages live in the account menu (`UserMenu`), not here.
  const groups: Array<{ label: string; items: ReadonlyArray<NavItem> }> = [
    { label: 'Learn', items: appConfig.nav.primary },
    ...(isManager ? [{ label: 'Manage', items: appConfig.nav.manager }] : []),
  ]

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main-content"
        className="sr-only z-[60] rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:gap-6">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <img src={appConfig.logo.src} alt="" className="size-7" />
            <span className="whitespace-nowrap">{appConfig.productName}</span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 text-sm lg:flex">
            {groups
              .flatMap((group) => group.items)
              .map((item) => (
                <NavLink key={item.to} item={item} />
              ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {showAbout ? (
              <Button asChild variant="outline" size="small" className="hidden lg:inline-flex">
                <Link to="/about">About this app</Link>
              </Button>
            ) : null}
            <ModeToggle />
            {user ? (
              <UserMenu />
            ) : authEnabled ? (
              <Link to="/login" className="hidden text-sm font-medium hover:underline lg:inline">
                Log in
              </Link>
            ) : null}

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="size-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{appConfig.productName}</SheetTitle>
                  {user?.email ? <SheetDescription>{user.email}</SheetDescription> : null}
                </SheetHeader>
                <nav aria-label="Main" className="flex flex-col gap-5 px-4">
                  {groups.map((group) => (
                    <div key={group.label} className="space-y-1">
                      <p className="px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {group.label}
                      </p>
                      {group.items.map((item) => (
                        <NavLink key={item.to} item={item} onNavigate={() => setMenuOpen(false)} block />
                      ))}
                    </div>
                  ))}
                  {showAbout ? (
                    <div className="space-y-1">
                      <NavLink
                        item={{ label: 'About this app', to: '/about' }}
                        onNavigate={() => setMenuOpen(false)}
                        block
                      />
                    </div>
                  ) : null}
                </nav>
                <div className="mt-auto border-t p-4">
                  {!user && authEnabled ? (
                    <Link
                      to="/login"
                      className="text-sm font-medium hover:underline"
                      onClick={() => setMenuOpen(false)}
                    >
                      Log in
                    </Link>
                  ) : demoMode ? (
                    <Badge variant="secondary">Sample data</Badge>
                  ) : null}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className={cn('mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-16 outline-none sm:py-8')}
      >
        {children}
      </main>
      <SetupPrompt />
    </div>
  )
}

function NavLink({ item, onNavigate, block }: { item: NavItem; onNavigate?: () => void; block?: boolean }) {
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      activeOptions={{ exact: item.to === '/' }}
      className={cn(
        'rounded-md px-3 py-2 whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        '[&.active]:bg-primary/10 [&.active]:font-medium [&.active]:text-primary',
        block && 'block py-2.5 text-base',
      )}
      activeProps={{ className: 'active', 'aria-current': 'page' }}
    >
      {item.label}
    </Link>
  )
}
