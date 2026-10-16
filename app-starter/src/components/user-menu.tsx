import { Link } from '@tanstack/react-router'
import { ChevronDown, CircleUser, LogOut } from 'lucide-react'
import { Button } from 'app-packs-ui'
import { appConfig } from '@/config/app'
import { useAppContext } from '@/server/context'
import { logoutAndRedirect } from '@/auth/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * The signed-in user's email in the header, opening a menu with the admin
 * pages (`appConfig.nav.admin`, admins only) and log out. UX only — each
 * admin page and server function still enforces the role itself.
 */
export function UserMenu() {
  const { authEnabled, user } = useAppContext()
  if (!user) return null

  const adminItems = user.roles.includes(appConfig.adminRole) ? appConfig.nav.admin : []
  const label = user.email ?? user.name ?? 'Account'

  if (adminItems.length === 0 && !authEnabled) {
    return <span className="hidden text-sm text-muted-foreground sm:inline">{label}</span>
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="small" aria-label="Account menu" className="gap-1.5">
          <CircleUser className="size-4 sm:hidden" aria-hidden="true" />
          <span className="hidden max-w-48 truncate text-muted-foreground sm:inline">{label}</span>
          <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
          {label}
        </DropdownMenuLabel>
        {adminItems.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            {adminItems.map((item) => (
              <DropdownMenuItem key={item.to} asChild>
                <Link to={item.to}>{item.label}</Link>
              </DropdownMenuItem>
            ))}
          </>
        ) : null}
        {authEnabled ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void logoutAndRedirect()}>
              <LogOut aria-hidden="true" />
              Log out
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
