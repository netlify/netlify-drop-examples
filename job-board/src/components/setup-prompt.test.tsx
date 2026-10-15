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
const recruiter = { id: 'u2', email: 'person@example.com', roles: ['recruiter'] }

function setContext(overrides: Partial<AppContext>) {
  mockUseAppContext.mockReturnValue({
    authEnabled: false,
    demoMode: true,
    deployed: false,
    officialDemoSite: false,
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

  it('shows nothing to a non-admin', () => {
    setContext({ user: recruiter })
    const { container } = render(<SetupPrompt />)

    expect(container.innerHTML).toBe('')
  })

  it('shows nothing to a logged-out visitor', () => {
    setContext({ authEnabled: true, user: null })
    const { container } = render(<SetupPrompt />)

    expect(container.innerHTML).toBe('')
  })

  it('shows only the badge on the official demo site', () => {
    setContext({ officialDemoSite: true, deployed: true })
    render(<SetupPrompt />)

    expect(screen.getByRole('link', { name: 'Make this app yours on Netlify' }).getAttribute('href')).toBe(
      appConfig.dropUrl,
    )
    expect(screen.queryByRole('complementary', { name: 'Setup checklist' })).toBeNull()
  })

  it('hides itself once every required row is done, ignoring optional rows', () => {
    setContext({ authEnabled: true, deployed: true, demoMode: false })
    const { container } = render(<SetupPrompt />)

    expect(container.innerHTML).toBe('')
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

  it('has no Identity link when not deployed', () => {
    render(<SetupPrompt />)
    for (const title of [/Check who can open your app/, /Turn on app sign-in/, /Choose who can sign up/]) {
      fireEvent.click(screen.getByRole('button', { name: title }))
      expect(screen.queryByRole('link', { name: /^Open / })).toBeNull()
      fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0])
    }
  })

  it('has no Deploy row, since the card only matters on a real deploy', () => {
    render(<SetupPrompt />)

    expect(screen.queryByRole('button', { name: /Deploy/ })).toBeNull()
  })

  it("points every row's Learn more at a template page anchor", () => {
    render(<SetupPrompt />)
    for (const title of [
      /Check who can open your app/,
      /Turn on app sign-in/,
      /Make yourself the admin/,
      /Choose who can sign up/,
    ]) {
      fireEvent.click(screen.getByRole('button', { name: title }))
      expect(screen.getByRole('link', { name: 'Learn more' }).getAttribute('href')).toBe(
        `${appConfig.templatePageUrl}#before-you-share`,
      )
      fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0])
    }
  })

  it('lets an admin tick a manual row, and remembers it', () => {
    const { unmount } = render(<SetupPrompt />)
    fireEvent.click(screen.getByRole('button', { name: /Check who can open your app/ }))
    fireEvent.click(screen.getByRole('button', { name: "I've done this" }))

    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy()
    expect(window.localStorage.getItem('go-live-checklist-manual')).toBe('["visibility"]')

    unmount()
    render(<SetupPrompt />)
    fireEvent.click(screen.getByRole('button', { name: /Check who can open your app/ }))
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy()
  })

  it('stays visible when only the manual rows are ticked', () => {
    window.localStorage.setItem('go-live-checklist-manual', '["visibility","domain"]')
    render(<SetupPrompt />)

    expect(screen.getByRole('complementary', { name: 'Setup checklist' })).toBeTruthy()
  })
})
