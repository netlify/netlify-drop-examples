import type { UserLoginEvent, UserSignupEvent } from '@netlify/functions'
import { isAllowedEmail } from '../lib/domains.mts'

// Identity event functions. They only enforce the optional ALLOWED_EMAIL_DOMAINS
// restriction (netlify/lib/domains.mts); with it unset they let everyone through.
// Edits and notes check the domain again on every request, so this is the early,
// friendly refusal and that is the backstop.
export default {
  userSignup(event: UserSignupEvent) {
    if (!isAllowedEmail(event.user.email))
      return event.deny()
  },
  userLogin(event: UserLoginEvent) {
    if (!isAllowedEmail(event.user.email))
      return event.deny()
  },
}
