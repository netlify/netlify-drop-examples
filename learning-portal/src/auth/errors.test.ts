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
})
