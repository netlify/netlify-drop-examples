import { describe, it, expect, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSubmission } from './submission'

describe('useSubmission', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useSubmission(async () => 'ok'))
    expect(result.current.state).toEqual({ status: 'idle' })
  })

  it('transitions idle -> submitting -> success', async () => {
    let resolveFn: (value: string) => void = () => {}
    const fn = vi.fn(() => new Promise<string>((resolve) => (resolveFn = resolve)))
    const { result } = renderHook(() => useSubmission(fn))

    act(() => {
      void result.current.run()
    })
    expect(result.current.state.status).toBe('submitting')

    act(() => resolveFn('done'))

    await waitFor(() => {
      expect(result.current.state).toEqual({ status: 'success', data: 'done' })
    })
  })

  it('transitions to error on rejection', async () => {
    const fn = vi.fn(async () => {
      throw new Error('nope')
    })
    const { result } = renderHook(() => useSubmission(fn))

    await act(async () => {
      await expect(result.current.run()).rejects.toThrow('nope')
    })

    expect(result.current.state).toEqual({ status: 'error', error: 'nope' })
  })

  it('reset returns to idle', async () => {
    const { result } = renderHook(() => useSubmission(async () => 'ok'))

    await act(async () => {
      await result.current.run()
    })
    expect(result.current.state.status).toBe('success')

    act(() => result.current.reset())
    expect(result.current.state).toEqual({ status: 'idle' })
  })
})
