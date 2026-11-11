import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('renders Previous, the page numbers and Next', () => {
    render(<Pagination page={2} totalPages={3} onPageChange={vi.fn()} />)

    expect(
      screen.getAllByRole('button').map((button) => button.textContent),
    ).toEqual(['Previous', '1', '2', '3', 'Next'])
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('navigates with Previous, Next and the page numbers', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination page={2} totalPages={3} onPageChange={onPageChange} />)

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    await user.click(screen.getByRole('button', { name: 'Page 3' }))

    expect(onPageChange.mock.calls).toEqual([[3], [1], [3]])
  })

  it('disables Previous on the first page and Next on the last', () => {
    const { rerender } = render(
      <Pagination page={1} totalPages={3} onPageChange={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()

    rerender(<Pagination page={3} totalPages={3} onPageChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('renders nothing when everything fits in one page', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onPageChange={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
