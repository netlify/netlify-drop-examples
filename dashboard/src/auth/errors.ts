/**
 * Plain-language messages for the Identity failures people actually hit on
 * the login and signup forms. Pattern-matches the message loosely (Identity's
 * wording isn't a stable contract) and falls back to the original message,
 * so an unrecognised error is never hidden.
 */
export type AuthFormMode = 'login' | 'signup' | 'forgot'

export function friendlyAuthError(err: unknown, mode: AuthFormMode): string {
  const message = err instanceof Error ? err.message : ''
  if (!message) return 'Something went wrong. Try again.'

  if (/not confirmed|confirm your email|unconfirmed/i.test(message)) {
    return 'Confirm your email first. Use the link we sent when you signed up.'
  }
  if (/signups? (are |is )?(not allowed|disabled)|signup.*disabled/i.test(message)) {
    return 'Sign-up is by invitation only. Ask an admin to invite you.'
  }
  if (mode === 'signup' && /already (been )?registered|already exists|already in use/i.test(message)) {
    return 'An account with that email already exists. Log in instead.'
  }
  if (mode === 'login' && /invalid (login )?credentials|invalid.*(email|password)|incorrect/i.test(message)) {
    return 'Email or password is incorrect.'
  }
  return message
}
