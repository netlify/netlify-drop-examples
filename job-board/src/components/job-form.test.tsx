import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { JobForm } from './job-form'

describe('JobForm', () => {
  afterEach(cleanup)

  // app-packs-ui's Button renders type="button" unless told otherwise, so a
  // form button without type="submit" silently does nothing.
  it('submits when the Create job button is clicked', () => {
    const onSubmit = vi.fn()
    const { container } = render(<JobForm submitting={false} onSubmit={onSubmit} />)
    for (const input of container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input:not([type=date]), textarea',
    )) {
      fireEvent.change(input, { target: { value: 'Filled in by the test' } })
    }

    const button = screen.getByRole('button', { name: 'Create job' })
    expect(button.getAttribute('type')).toBe('submit')
    fireEvent.click(button)

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ title: 'Filled in by the test', status: 'open' })
  })
})
