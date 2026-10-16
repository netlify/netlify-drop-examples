/**
 * Plain-language messages for the Identity failures people actually hit on
 * the login and signup forms. Pattern-matches the message loosely (Identity's
 * wording isn't a stable contract) and falls back to the original message,
 * so an unrecognised error is never hidden.
 *
 * `@netlify/identity` wraps the underlying gotrue-js error, which often has an
 * empty `message` (the HTTP status text is blank over HTTP/2) and keeps the
 * useful parts on `status`, `json` or `data`. `describeAuthError` digs those
 * out, so a refused signup or a failing signup hook says more than "Something
 * went wrong".
 */
export type AuthFormMode = 'login' | 'signup' | 'forgot'

/**
 * Checked in the forms before any request is made. Not the browser's
 * `minLength`, which shows a native popup only after the person has tried to
 * submit and can't carry our wording. Login doesn't check it: an existing
 * account may predate the rule.
 */
export const MIN_PASSWORD_LENGTH = 8
export const PASSWORD_TOO_SHORT_MESSAGE = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`

type AuthErrorDetails = { message: string; status?: number }

const MAX_DETAIL_LENGTH = 200

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_DETAIL_LENGTH) : ''
}

/**
 * Best available message and HTTP status for an auth error, looking through
 * `cause` (the wrapper has the library's message; the original has the body).
 */
function describeAuthError(err: unknown): AuthErrorDetails {
  let message = ''
  let status: number | undefined
  let current: unknown = err
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth++) {
    const e = current as {
      message?: unknown
      status?: unknown
      json?: Record<string, unknown> | null
      data?: unknown
      cause?: unknown
    }
    if (status === undefined && typeof e.status === 'number') status = e.status
    // The server's own words win over the library's, which may just be the
    // status text.
    message ||=
      asText(e.json?.msg) ||
      asText(e.json?.message) ||
      asText(e.json?.error_description) ||
      asText(e.json?.error) ||
      asText(e.message)
    current = e.cause
  }
  return { message, status }
}

export function friendlyAuthError(err: unknown, mode: AuthFormMode): string {
  const { message, status } = describeAuthError(err)

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
  const networkFailure = /^(failed to fetch|load failed|networkerror)/i.test(message)
  if (message && !networkFailure) return message

  // No usable message: fall back on what the status and the form say.
  if (networkFailure) return "We couldn't reach the sign-in service. Check your connection and try again."
  if (!status) return 'Something went wrong. Try again.'
  if (status === 429) return 'Too many attempts. Wait a minute and try again.'
  if (mode === 'signup' && (status === 400 || status === 403 || status === 422)) {
    return `Sign-up was refused (error ${status}). This app may only allow certain email domains, or sign-up by invitation. Ask an admin to invite you.`
  }
  if (status >= 500) {
    return mode === 'signup'
      ? `Sign-up failed on the server (error ${status}). Try again in a moment. If it keeps happening, an admin should check the Identity signup function's logs.`
      : `The sign-in service had a problem (error ${status}). Try again in a moment.`
  }
  return `Something went wrong (error ${status}). Try again.`
}
