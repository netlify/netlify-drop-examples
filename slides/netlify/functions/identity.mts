import type { UserSignupEvent } from '@netlify/functions'

// Everyone who signs up can edit text. Set Registration to "Invite only" in the
// Identity settings so only people you invite can sign up.
// Roles ride in the JWT, so they apply from the user's first login.
export default {
  userSignup(event: UserSignupEvent) {
    return { user: { ...event.user, appMetadata: { ...event.user.appMetadata, roles: ['editor'] } } }
  },
}
