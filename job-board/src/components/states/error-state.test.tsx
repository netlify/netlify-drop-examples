import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ErrorState, friendlyError } from './error-state'

afterEach(cleanup)

describe('friendlyError', () => {
  it('keeps messages the app throws on purpose', () => {
    expect(friendlyError(new Error('403: you need one of these roles'))).toEqual({
      message: '403: you need one of these roles',
    })
  })

  it('hides technical messages behind details', () => {
    const result = friendlyError(
      new Error('This function can now be called only as a tagged-template function'),
      'the dashboard',
    )

    expect(result.message).toMatch(/couldn't load the dashboard/)
    expect(result.message).not.toMatch(/tagged-template/)
    expect(result.details).toMatch(/tagged-template/)
  })

  it('copes with non-Error values', () => {
    expect(friendlyError(undefined).details).toBeUndefined()
  })
})

describe('ErrorState', () => {
  it('shows details collapsed, never as the headline', () => {
    render(<ErrorState message="Calm message" details="ECONNREFUSED" />)

    expect(screen.getByText('Calm message')).toBeTruthy()
    expect(screen.getByText('Details')).toBeTruthy()
    expect(screen.queryByText('Something went wrong')).toBeNull()
  })
})
