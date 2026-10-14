import { useNavigate } from '@tanstack/react-router'
import { Avatar, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from 'app-packs-ui'
import { signOut } from '@/auth/client'
import { appConfig } from '@/config/app'
import type { AppContextUser } from '@/server/context'

/**
 * Account menu shown in the header nav — see `Settings`
 * (src/routes/_app/settings.tsx) for the linked page. Also the one place
 * the admin section (survey authoring, responses, results, audit log,
 * usage events) is discoverable from: `requireRole()`/`checkRole()` no-op
 * (grant) whenever auth is off, so those routes are already reachable by
 * URL in demo mode — this just surfaces that instead of hiding it behind a
 * menu that only ever rendered once a real admin signed in.
 *
 * `authEnabled` decides whether "Settings"/"Log out" make sense to show at
 * all — in demo mode `user` is a cosmetic stand-in (see
 * `DEMO_SESSION_USER`/`getAppContext`) with no real session to manage or
 * sign out of, so this menu is admin-links-only in that state.
 */
export function UserMenu({
  user,
  roleLabel,
  authEnabled,
}: {
  user: AppContextUser
  roleLabel: string | null
  authEnabled: boolean
}) {
  const navigate = useNavigate()
  const displayName = user.name ?? user.email ?? 'Account'
  const isAdmin = user.roles.includes(appConfig.adminRole)

  return (
    <Menu>
      <MenuTrigger aria-label="Account menu">
        <Avatar name={displayName} className="size-7" />
      </MenuTrigger>
      <MenuContent className="right-0 left-auto">
        <MenuLabel>
          <span className="block truncate font-medium normal-case tracking-normal text-foreground">
            {displayName}
          </span>
          {user.email && user.email !== displayName ? (
            <span className="block truncate normal-case tracking-normal">{user.email}</span>
          ) : null}
          {roleLabel ? <span className="block normal-case tracking-normal">{roleLabel}</span> : null}
        </MenuLabel>
        {isAdmin ? (
          <>
            <MenuSeparator />
            {appConfig.nav.admin.map((item) => (
              <MenuItem key={item.to} onClick={() => navigate({ to: item.to })}>
                {item.label}
              </MenuItem>
            ))}
          </>
        ) : null}
        {authEnabled ? (
          <>
            <MenuSeparator />
            <MenuItem onClick={() => navigate({ to: '/settings' })}>Settings</MenuItem>
            <MenuItem onClick={() => void signOut()}>Log out</MenuItem>
          </>
        ) : null}
      </MenuContent>
    </Menu>
  )
}
