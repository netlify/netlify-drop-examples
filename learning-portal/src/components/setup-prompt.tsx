import { appConfig } from '@/config/app'
import { useAppContext } from '@/server/context'
import { GoLiveChecklist } from '@/components/go-live-checklist'
import { NetlifyDeployBadge } from '@/components/netlify-deploy-badge'

/**
 * The single owner of which floating setup widget shows:
 *
 * - official demo site → `NetlifyDeployBadge`
 * - otherwise, an admin → `GoLiveChecklist`
 * - otherwise nothing
 *
 * This is UX, not access control: the checklist only links to dashboard pages
 * and exposes no data, and everything it points at is authorized separately.
 *
 * To remove the feature, delete this file, `go-live-checklist.tsx` and
 * `netlify-deploy-badge.tsx`, plus the `<SetupPrompt />` line in
 * `app-shell.tsx`.
 */
export function SetupPrompt() {
  const { officialDemoSite, user } = useAppContext()

  if (officialDemoSite) return <NetlifyDeployBadge href={appConfig.dropUrl} />
  if (user?.roles.includes(appConfig.adminRole)) return <GoLiveChecklist />
  return null
}
