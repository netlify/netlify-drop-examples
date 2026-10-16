import { describe, it, expect } from 'vitest'
import { friendlyAuthError } from './errors'

describe('friendlyAuthError', () => {
  it('explains an unconfirmed email', () => {
    expect(friendlyAuthError(new Error('Email not confirmed'), 'login')).toMatch(/Confirm your email first/)
  })

  it('explains invite-only signups', () => {
    expect(friendlyAuthError(new Error('Signups not allowed for this instance'), 'signup')).toMatch(
      /invitation only/,
    )
  })

  it('explains a duplicate email on signup only', () => {
    const message = 'A user with this email address has already been registered'
    expect(friendlyAuthError(new Error(message), 'signup')).toMatch(/already exists/)
    expect(friendlyAuthError(new Error(message), 'login')).toBe(message)
  })

  it('explains bad credentials on login', () => {
    expect(friendlyAuthError(new Error('Invalid login credentials'), 'login')).toBe(
      'Email or password is incorrect.',
    )
  })

  it('falls back to the original message', () => {
    expect(friendlyAuthError(new Error('Network down'), 'login')).toBe('Network down')
  })

  it('handles non-errors', () => {
    expect(friendlyAuthError('boom', 'login')).toBe('Something went wrong. Try again.')
  })

  describe('when the message is empty', () => {
    // What gotrue-js throws over HTTP/2: blank status text, details on the body.
    const gotrueError = (status: number, json?: Record<string, unknown>) =>
      Object.assign(new Error(''), { name: 'JSONHTTPError', status, json })
    const wrapped = (inner: Error) => Object.assign(new Error(inner.message), { cause: inner })

    it('uses the message from the response body, through the wrapper', () => {
      const err = wrapped(gotrueError(422, { msg: 'Password is too short, at least 8 characters' }))
      expect(friendlyAuthError(err, 'signup')).toBe('Password is too short, at least 8 characters')
    })

    it('reads error_description when there is no msg', () => {
      const err = wrapped(gotrueError(400, { error_description: 'Something specific' }))
      expect(friendlyAuthError(err, 'signup')).toBe('Something specific')
    })

    it('explains a refused signup', () => {
      const message = friendlyAuthError(wrapped(gotrueError(403)), 'signup')
      expect(message).toMatch(/Sign-up was refused \(error 403\)/)
      expect(message).toMatch(/email domains/)
    })

    it('explains a signup that fails on the server', () => {
      expect(friendlyAuthError(wrapped(gotrueError(500)), 'signup')).toMatch(/error 500.*signup function/)
    })

    it('does not blame the signup hook on a failed login', () => {
      const message = friendlyAuthError(wrapped(gotrueError(500)), 'login')
      expect(message).toMatch(/error 500/)
      expect(message).not.toMatch(/signup/)
    })

    it('explains rate limiting', () => {
      expect(friendlyAuthError(wrapped(gotrueError(429)), 'login')).toMatch(/Too many attempts/)
    })

    it('includes the status in an unrecognised failure', () => {
      expect(friendlyAuthError(wrapped(gotrueError(418)), 'login')).toBe(
        'Something went wrong (error 418). Try again.',
      )
    })

    it('explains a network failure', () => {
      expect(friendlyAuthError(new TypeError('Failed to fetch'), 'signup')).toMatch(/couldn't reach/)
    })
  })
})
