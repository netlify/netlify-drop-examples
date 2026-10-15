import { useCallback, useRef, useState } from 'react'

/**
 * Uniform lifecycle for any async submission (form save, upload, delete...).
 * Shared by SubmitButton, FileUpload, and any component that needs to show
 * idle/submitting/success/error UI without reinventing the state machine.
 */
export type SubmissionState<T = unknown> =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }

export function useSubmission<Args extends unknown[], T>(fn: (...args: Args) => Promise<T>) {
  const [state, setState] = useState<SubmissionState<T>>({ status: 'idle' })
  // Guards against setting state after unmount / after a newer call resolved.
  const callId = useRef(0)

  const run = useCallback(
    async (...args: Args) => {
      const id = ++callId.current
      setState({ status: 'submitting' })
      try {
        const data = await fn(...args)
        if (callId.current === id) setState({ status: 'success', data })
        return data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong'
        if (callId.current === id) setState({ status: 'error', error: message })
        throw err
      }
    },
    [fn],
  )

  const reset = useCallback(() => {
    callId.current++
    setState({ status: 'idle' })
  }, [])

  return { state, run, reset }
}
