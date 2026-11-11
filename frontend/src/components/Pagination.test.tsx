import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('calls onPageChange when navigating', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()

    render(
      <Pagination page={2} totalPages={5} onPageChange={onPageChange} />,
    )

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(onPageChange).toHaveBeenCalledWith(3)

    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('hides itself when there is only one page', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onPageChange={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
