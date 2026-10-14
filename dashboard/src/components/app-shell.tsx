import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { appConfig } from '@/config/app'
import { useAppContext } from '@/server/context'
import { ModeToggle } from '@/components/mode-toggle'
import { LogoutButton } from '@/auth/client'
import { Badge } from 'app-packs-ui'
import { cn } from '@/lib/utils'

/**
 * App-wide chrome: header, nav, and content container. Reads branding from
 * `src/config/app.ts` only — never hardcode a product name here.
 */
// Carries the dashboard date range (`from`/`to`) across nav links. Routes
// without those search params simply ignore them (undefined values are dropped).
const keepRange = ((prev: { from?: string; to?: string }) => ({ from: prev.from, to: prev.to })) as never

export function AppShell({ children }: { children: ReactNode }) {
  const { authEnabled, demoMode, identityUsersUrl, user } = useAppContext()

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
            {user?.roles?.includes(appConfig.adminRole) && identityUsersUrl ? (
              <a
                href={identityUsersUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                Manage users
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            ) : null}
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
      <NetlifyDeployCard href="https://app.netlify.com/drop" />
    </div>
  )
}

function NetlifyDeployCard({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="fixed right-4 bottom-4 z-50 inline-flex min-h-11 max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-[#24434b] bg-[#0b2930] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:bg-[#103740] focus-visible:ring-2 focus-visible:ring-[#32e6e2] focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      style={{ fontFamily: "'Figtree', sans-serif" }}
      aria-label="Make this app yours on Netlify"
    >
      <img src="/netlify-monogram-darkmode.svg" alt="" className="size-4 shrink-0" />
      <span className="whitespace-nowrap">Make this app yours</span>
      <ExternalLink className="size-4 shrink-0 text-[#32e6e2]" aria-hidden="true" />
    </a>
  )
}
