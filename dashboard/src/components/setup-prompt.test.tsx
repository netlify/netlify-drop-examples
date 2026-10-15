import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { appConfig } from '@/config/app'
import type { AppContext } from '@/server/context'
import { SetupPrompt } from './setup-prompt'

const { mockUseAppContext } = vi.hoisted(() => ({
  mockUseAppContext: vi.fn(),
}))

vi.mock('@/server/context', () => ({
  useAppContext: mockUseAppContext,
}))

const admin = { id: 'u1', email: 'admin@example.com', roles: [appConfig.adminRole] }
const viewer = { id: 'u2', email: 'person@example.com', roles: ['viewer'] }

function setContext(overrides: Partial<AppContext>) {
  mockUseAppContext.mockReturnValue({
    authEnabled: false,
    demoMode: true,
    deployed: false,
    officialDemoSite: false,
    encryptionKeySet: false,
    snowflakeEnabled: false,
    salesforceEnabled: false,
    identityUsersUrl: null,
    user: admin,
    ...overrides,
  })
}

describe('SetupPrompt', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setContext({})
  })

  afterEach(() => {
    cleanup()
    mockUseAppContext.mockReset()
  })

  it('shows the checklist to an admin', () => {
    render(<SetupPrompt />)

    expect(screen.getByRole('complementary', { name: 'Setup checklist' })).toBeTruthy()
  })

  it('shows nothing to a viewer', () => {
    setContext({ user: viewer })
    const { container } = render(<SetupPrompt />)

    expect(container.innerHTML).toBe('')
  })

  it('shows nothing to a logged-out visitor', () => {
    setContext({ authEnabled: true, user: null })
    const { container } = render(<SetupPrompt />)

    expect(container.innerHTML).toBe('')
  })

  it('shows the checklist on a deployed copy before Identity is on, when nobody can be admin yet', () => {
    setContext({ deployed: true, demoMode: false, user: null })
    render(<SetupPrompt />)

    expect(screen.getByRole('complementary', { name: 'Setup checklist' })).toBeTruthy()
  })

  it('shows only the badge on the official demo site', () => {
    setContext({ officialDemoSite: true, deployed: true })
    render(<SetupPrompt />)

    expect(screen.getByRole('link', { name: 'Make this app yours on Netlify' })).toBeTruthy()
    expect(screen.queryByRole('complementary', { name: 'Setup checklist' })).toBeNull()
  })

  it('hides itself once every required row is done', () => {
    setContext({
      authEnabled: true,
      encryptionKeySet: true,
      deployed: true,
      demoMode: false,
    })
    const { container } = render(<SetupPrompt />)

    expect(container.innerHTML).toBe('')
  })

  it('has no Deploy row', () => {
    render(<SetupPrompt />)

    expect(screen.queryByRole('button', { name: /Deploy your app/ })).toBeNull()
  })

  it('lists the standard rows in order', () => {
    render(<SetupPrompt />)
    const titles = screen
      .getAllByRole('button')
      .map((button) => button.textContent ?? '')
      .filter((text) => text && !text.includes('Dismiss'))

    expect(titles).toEqual([
      'Check who can open your appOptional',
      'Set the data encryption key',
      'Turn on app sign-in (Netlify Identity)',
      'Choose who can sign upOptional',
      'Connect your dataOptional',
    ])
  })

  it('ticking a manual row never hides the card while a required row is open', () => {
    setContext({ authEnabled: false })
    render(<SetupPrompt />)
    fireEvent.click(screen.getByRole('button', { name: /Check who can open your app/ }))
    fireEvent.click(screen.getByRole('button', { name: "I've done this" }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0])

    expect(screen.getByRole('complementary', { name: 'Setup checklist' })).toBeTruthy()
  })

  it('stays up while the encryption key is missing, even with Identity on', () => {
    setContext({ authEnabled: true })
    render(<SetupPrompt />)

    expect(screen.getByRole('complementary', { name: 'Setup checklist' })).toBeTruthy()
  })

  it('hides once the required rows are done even if optional rows are not', () => {
    setContext({ authEnabled: true, encryptionKeySet: true })
    const { container } = render(<SetupPrompt />)

    expect(container.innerHTML).toBe('')
  })

  it('remembers a manual tick across reloads', () => {
    const { unmount } = render(<SetupPrompt />)
    fireEvent.click(screen.getByRole('button', { name: /Choose who can sign up/ }))
    fireEvent.click(screen.getByRole('button', { name: "I've done this" }))
    expect(screen.getByRole('button', { name: 'Mark as not done' })).toBeTruthy()

    unmount()
    render(<SetupPrompt />)
    fireEvent.click(screen.getByRole('button', { name: /Choose who can sign up/ }))
    expect(screen.getByRole('button', { name: 'Mark as not done' })).toBeTruthy()
  })

  it('points Learn more at the template page anchor', () => {
    render(<SetupPrompt />)
    fireEvent.click(screen.getByRole('button', { name: /Turn on app sign-in/ }))

    const link = screen.getByRole('link', { name: 'Learn more' })
    expect(link.getAttribute('href')).toBe(`${appConfig.templatePageUrl}#before-you-share`)
  })

  it('stays hidden once dismissed, including after a reload', () => {
    const { unmount } = render(<SetupPrompt />)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss setup checklist' }))

    expect(screen.queryByRole('complementary', { name: 'Setup checklist' })).toBeNull()
    expect(window.localStorage.getItem('go-live-checklist-dismissed')).toBe('true')

    unmount()
    render(<SetupPrompt />)
    expect(screen.queryByRole('complementary', { name: 'Setup checklist' })).toBeNull()
  })

  it('links to Identity settings when deployed', () => {
    setContext({ deployed: true, demoMode: false })
    render(<SetupPrompt />)
    fireEvent.click(screen.getByRole('button', { name: /Turn on app sign-in/ }))

    const link = screen.getByRole('link', { name: 'Open Identity settings' })
    expect(link.getAttribute('href')).toBe('https://app.netlify.com/projects/~/identity')
  })

  it('links to project visibility when deployed', () => {
    setContext({ deployed: true, demoMode: false })
    render(<SetupPrompt />)
    fireEvent.click(screen.getByRole('button', { name: /Check who can open your app/ }))

    const link = screen.getByRole('link', { name: 'Open project visibility' })
    expect(link.getAttribute('href')).toBe(
      'https://app.netlify.com/projects/~/configuration/general#project-visibility',
    )
  })

  it('links to environment variables when deployed', () => {
    setContext({ deployed: true, demoMode: false })
    render(<SetupPrompt />)
    fireEvent.click(screen.getByRole('button', { name: /Set the data encryption key/ }))

    const link = screen.getByRole('link', { name: 'Open environment variables' })
    expect(link.getAttribute('href')).toBe('https://app.netlify.com/projects/~/configuration/env')
  })

  it('lists both data sources on one Connect your data row', () => {
    render(<SetupPrompt />)
    fireEvent.click(screen.getByRole('button', { name: /Connect your data/ }))

    expect(screen.getByText(/SNOWFLAKE_ACCOUNT/)).toBeTruthy()
    expect(screen.getByText(/SALESFORCE_INSTANCE_URL/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Learn more' }).getAttribute('href')).toBe(
      `${appConfig.templatePageUrl}#connect-your-data`,
    )
  })

  it('ticks Connect your data when either source is configured', () => {
    setContext({ salesforceEnabled: true })
    render(<SetupPrompt />)

    expect(
      screen.getByRole('button', { name: /Connect your data/ }).querySelector('.line-through'),
    ).toBeTruthy()
  })

  it('has no dashboard links when not deployed', () => {
    render(<SetupPrompt />)
    for (const title of [
      /Check who can open your app/,
      /Set the data encryption key/,
      /Turn on app sign-in/,
      /Choose who can sign up/,
      /Connect your data/,
    ]) {
      fireEvent.click(screen.getByRole('button', { name: title }))
      expect(
        screen.queryByRole('link', {
          name: /Open (Identity settings|project visibility|environment variables)/,
        }),
      ).toBeNull()
      fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0])
    }
  })
})
