import { appConfig } from '@/config/app'
import { useAppContext } from '@/server/context'
import { GoLiveChecklist } from '@/components/go-live-checklist'
import { NetlifyDeployBadge } from '@/components/netlify-deploy-badge'

/**
 * The single owner of which floating setup widget shows:
 *
 * - official demo site → `NetlifyDeployBadge`
 * - otherwise, an admin → `GoLiveChecklist`
 * - otherwise, a deployed copy without Identity → `GoLiveChecklist` (nobody
 *   can be an admin yet, and the dashboard fails closed, so this is the
 *   only way the deployer sees what's left to do)
 * - otherwise nothing
 *
 * This is UX, not access control: the checklist only links to dashboard pages
 * and exposes no data (setup state is booleans only), and everything it
 * points at is authorized separately.
 *
 * To remove the feature, delete this file, `go-live-checklist.tsx` and
 * `netlify-deploy-badge.tsx`, plus the `<SetupPrompt />` line in
 * `app-shell.tsx`.
 */
export function SetupPrompt() {
  const { authEnabled, deployed, officialDemoSite, user } = useAppContext()

  if (officialDemoSite) return <NetlifyDeployBadge />
  if (user?.roles.includes(appConfig.adminRole)) return <GoLiveChecklist />
  if (deployed && !authEnabled) return <GoLiveChecklist />
  return null
}
