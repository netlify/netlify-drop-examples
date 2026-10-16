import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import type { Settings } from '@netlify/identity'

const { mockLogin, mockSignup, mockGetSettings, mockNeedsFirstAdmin } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockSignup: vi.fn(),
  mockGetSettings: vi.fn(),
  mockNeedsFirstAdmin: vi.fn(),
}))

vi.mock('@netlify/identity', () => ({
  login: mockLogin,
  signup: mockSignup,
  logout: vi.fn(),
  oauthLogin: vi.fn(),
  getSettings: mockGetSettings,
  handleAuthCallback: vi.fn(),
  requestPasswordRecovery: vi.fn(),
  updateUser: vi.fn(),
  acceptInvite: vi.fn(),
  MissingIdentityError: class MissingIdentityError extends Error {},
}))

vi.mock('@/server/first-user', () => ({
  needsFirstAdminServer: mockNeedsFirstAdmin,
}))

vi.mock('@tanstack/react-router', () => ({
  useSearch: vi.fn(),
}))

const { LoginForm } = await import('./client')

const baseSettings: Settings = {
  autoconfirm: true,
  disableSignup: false,
  providers: { google: false, github: false, gitlab: false, bitbucket: false, facebook: false, email: true },
}

function setSettings(overrides: Partial<Settings> = {}) {
  mockGetSettings.mockResolvedValue({ ...baseSettings, ...overrides })
}

async function submitSignup() {
  fireEvent.click(await screen.findByRole('button', { name: 'Sign up' }))
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse' } })
  fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))
}

describe('LoginForm', () => {
  const originalLocation = window.location

  beforeEach(() => {
    // Assigning `location.href` isn't implemented in jsdom; a plain object
    // lets the tests see whether the form tried to navigate.
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost/login', hash: '', pathname: '/login', search: '' },
      writable: true,
    })
    mockNeedsFirstAdmin.mockResolvedValue(false)
    setSettings()
  })

  afterEach(() => {
    cleanup()
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true })
    vi.resetAllMocks()
  })

  it('explains a too-short password on submit, without attempting signup', async () => {
    setSettings()
    render(<LoginForm />)
    fireEvent.click(await screen.findByRole('button', { name: 'Sign up' }))
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }))

    expect(await screen.findByText('Password must be at least 8 characters.')).toBeTruthy()
    expect(mockSignup).not.toHaveBeenCalled()
  })

  it('asks the person to check their email when signup needs confirmation', async () => {
    setSettings({ autoconfirm: false })
    mockSignup.mockResolvedValue({ id: 'u1', email: 'new@example.com' })
    render(<LoginForm />)

    await submitSignup()

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeTruthy()
    expect(screen.getByText('new@example.com')).toBeTruthy()
    expect(window.location.href).toBe('http://localhost/login')
  })

  it('goes straight to the app when signup is auto-confirmed', async () => {
    mockSignup.mockResolvedValue({ id: 'u1', email: 'new@example.com', confirmedAt: '2026-10-15T00:00:00Z' })
    render(<LoginForm />)

    await submitSignup()

    await waitFor(() => expect(window.location.href).toBe('/'))
    expect(screen.queryByRole('heading', { name: 'Check your email' })).toBeNull()
  })

  it('says the first admin account becomes admin on confirmation when email is confirmed', async () => {
    setSettings({ autoconfirm: false })
    mockNeedsFirstAdmin.mockResolvedValue(true)
    render(<LoginForm />)

    fireEvent.click(await screen.findByRole('button', { name: 'Sign up' }))

    expect(await screen.findByText(/It happens once you confirm your email/)).toBeTruthy()
  })

  it('hides Sign up and explains when signups are turned off', async () => {
    setSettings({ disableSignup: true })
    render(<LoginForm />)

    expect(await screen.findByText(/Sign-up is by invitation only/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Sign up' })).toBeNull()
  })

  it('tells the first admin to invite themselves when signups are off and nobody exists', async () => {
    setSettings({ disableSignup: true })
    mockNeedsFirstAdmin.mockResolvedValue(true)
    render(<LoginForm />)

    expect(await screen.findByText('No accounts exist yet')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Open Identity settings/ }).getAttribute('href')).toBe(
      'https://app.netlify.com/projects/~/identity',
    )
  })

  it('shows a button for each enabled provider, and none when only email is on', async () => {
    setSettings({ providers: { ...baseSettings.providers, google: true } })
    const { unmount } = render(<LoginForm />)
    expect(await screen.findByRole('button', { name: 'Google' })).toBeTruthy()
    unmount()

    setSettings()
    render(<LoginForm />)
    await screen.findByRole('button', { name: 'Log in' })
    expect(screen.queryByRole('button', { name: 'Google' })).toBeNull()
  })

  it('supports Google without email: just provider buttons', async () => {
    setSettings({ providers: { ...baseSettings.providers, google: true, email: false } })
    render(<LoginForm />)

    expect(await screen.findByRole('button', { name: 'Continue with Google' })).toBeTruthy()
    expect(screen.queryByLabelText('Email')).toBeNull()
    expect(screen.queryByLabelText('Password')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Sign up' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Forgot password?' })).toBeNull()
    expect(screen.queryByText('or continue with')).toBeNull()
  })

  it('supports email without Google: just the form', async () => {
    render(<LoginForm />)

    expect(await screen.findByLabelText('Email')).toBeTruthy()
    expect(screen.queryByText('or continue with')).toBeNull()
    expect(screen.queryByRole('button', { name: /Continue with/ })).toBeNull()
  })

  it('supports both together', async () => {
    setSettings({ providers: { ...baseSettings.providers, google: true } })
    render(<LoginForm />)

    expect(await screen.findByLabelText('Email')).toBeTruthy()
    expect(screen.getByText('or continue with')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Google' })).toBeTruthy()
  })

  it('keeps the email form when settings report email off but no provider is on', async () => {
    setSettings({ providers: { ...baseSettings.providers, email: false } })
    render(<LoginForm />)

    expect(await screen.findByLabelText('Email')).toBeTruthy()
  })

  it('keeps the email form when settings cannot be read', async () => {
    mockGetSettings.mockRejectedValue(new Error('network'))
    render(<LoginForm />)

    expect(await screen.findByLabelText('Email')).toBeTruthy()
  })

  it('does not mention email confirmation to a Google-only first admin', async () => {
    setSettings({ autoconfirm: false, providers: { ...baseSettings.providers, google: true, email: false } })
    mockNeedsFirstAdmin.mockResolvedValue(true)
    render(<LoginForm />)

    expect(await screen.findByText("You'll be the site admin")).toBeTruthy()
    expect(screen.queryByText(/confirm your email/)).toBeNull()
  })

  it('still says sign-up is by invitation for a Google-only site with signups off', async () => {
    setSettings({
      disableSignup: true,
      providers: { ...baseSettings.providers, google: true, email: false },
    })
    render(<LoginForm />)

    expect(await screen.findByText(/Sign-up is by invitation only/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeTruthy()
  })

  it('explains an unconfirmed account when login fails', async () => {
    mockLogin.mockRejectedValue(new Error('Email not confirmed'))
    render(<LoginForm />)

    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse' } })
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByText(/Confirm your email first/)).toBeTruthy()
  })
})
