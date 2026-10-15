import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { appConfig } from '@/config/app'
import type { AppContext } from '@/server/context'
import { IdentityOffBanner } from './identity-off-banner'

const { mockUseAppContext } = vi.hoisted(() => ({
  mockUseAppContext: vi.fn(),
}))

vi.mock('@/server/context', () => ({
  useAppContext: mockUseAppContext,
}))

function setContext(overrides: Partial<AppContext>) {
  mockUseAppContext.mockReturnValue({
    authEnabled: false,
    demoMode: false,
    deployed: true,
    officialDemoSite: false,
    user: null,
    ...overrides,
  })
}

describe('IdentityOffBanner', () => {
  afterEach(() => {
    cleanup()
    mockUseAppContext.mockReset()
  })

  it('tells everyone on a deployed copy where Identity is off', () => {
    setContext({})
    render(<IdentityOffBanner />)

    expect(screen.getByText("Sign-in isn't on yet")).toBeTruthy()
    expect(screen.getByText(/won't show any data until it is/)).toBeTruthy()
  })

  it('links to Identity settings and the template page', () => {
    setContext({})
    render(<IdentityOffBanner />)

    expect(screen.getByRole('link', { name: /Open Identity settings/ }).getAttribute('href')).toBe(
      'https://app.netlify.com/projects/~/identity',
    )
    expect(screen.getByRole('link', { name: /Learn more/ }).getAttribute('href')).toBe(
      `${appConfig.templatePageUrl}#before-you-share`,
    )
  })

  it('is gone once Identity is on', () => {
    setContext({ authEnabled: true })
    const { container } = render(<IdentityOffBanner />)

    expect(container.innerHTML).toBe('')
  })

  it('never shows in demo mode', () => {
    setContext({ demoMode: true, deployed: false })
    const { container } = render(<IdentityOffBanner />)

    expect(container.innerHTML).toBe('')
  })
})
