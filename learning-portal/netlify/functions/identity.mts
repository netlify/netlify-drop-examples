import type { UserSignupHandler } from '@netlify/functions'
import { getAllowedSignupDomain } from '../../src/config/flags'
import { appConfig } from '../../src/config/app'
import { hasAnyUsers } from '../../src/auth/first-user'

/**
 * Netlify Identity signup event hook. Assigns `appConfig.memberRole` to every
 * new user's `app_metadata.roles` at signup time, so a vertical never has to
 * manually assign a starting role to every signup from the Identity
 * dashboard. Also enforces `ALLOWED_SIGNUP_DOMAIN`, if set — see
 * `getAllowedSignupDomain()` (`src/config/flags.ts`) for why that check is
 * optional.
 *
 * The very first successful signup gets `appConfig.adminRole` instead of
 * `appConfig.memberRole` (see `hasAnyUsers()`), so a non-technical person deploying
 * this template doesn't have to find Identity → Users → Roles in the Netlify
 * dashboard just to administer their own site. This has two windows worth
 * knowing about: two people signing up in the same instant could both read
 * zero existing users and both become admin, and — on open signups — whoever
 * signs up first (not necessarily the deployer) claims it. README > Roles
 * tells deployers to sign up immediately after deploying, before sharing the
 * URL, to close the second window.
 *
 * Role membership always lives in `app_metadata` (never `user_metadata`) —
 * `user_metadata` is user-editable via the Identity API, so a role stored
 * there would be a privilege-escalation hole. This hook only ever touches
 * `appMetadata` (the camelCase field name in this event payload, which maps
 * to `app_metadata` in the Identity API).
 *
 * A role set here is in place for the user's first sign-in. Roles ride in
 * the JWT, so any later change (Identity tab, `admin.updateUser()`) only takes
 * effect on the user's next login or token refresh, not immediately.
 */
const userSignup: UserSignupHandler = async (event) => {
  const allowedDomain = getAllowedSignupDomain()
  if (allowedDomain) {
    const emailDomain = event.user.email?.split('@')[1]?.toLowerCase()
    if (emailDomain !== allowedDomain) {
      return event.deny()
    }
  }

  let alreadyHasUsers: boolean
  try {
    alreadyHasUsers = await hasAnyUsers()
  } catch {
    // If the admin API call fails for any reason, fail toward the safe
    // default (a regular member) rather than risk granting admin on a
    // read we couldn't actually confirm.
    alreadyHasUsers = true
  }

  const role = alreadyHasUsers ? appConfig.memberRole : appConfig.adminRole
  return {
    user: {
      ...event.user,
      appMetadata: { ...event.user.appMetadata, roles: [role] },
    },
  }
}

export default { userSignup }
