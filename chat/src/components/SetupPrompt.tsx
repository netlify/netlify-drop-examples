import { useAppContext } from '../server/context'
import { GoLiveChecklist } from './GoLiveChecklist'
import { NetlifyDeployBadge } from './NetlifyDeployBadge'

/**
 * The single owner of which floating setup widget shows:
 *
 * - official demo site → `NetlifyDeployBadge`
 * - everywhere else → `GoLiveChecklist`
 *
 * This app has no sign-in, so there's no admin to limit the checklist to
 * (the base App Pack template shows it to admins only). It's UX, not access
 * control: it only links to dashboard pages and exposes no data.
 *
 * To remove the feature, delete this file, `GoLiveChecklist.tsx` and
 * `NetlifyDeployBadge.tsx`, plus the `<SetupPrompt />` line in
 * `src/routes/__root.tsx`.
 */
export function SetupPrompt() {
  const { officialDemoSite } = useAppContext()

  if (officialDemoSite) return <NetlifyDeployBadge />
  return <GoLiveChecklist />
}
