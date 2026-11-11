import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPage, fetchPages } from '../api/pagesApi'
import { buildPage, paginated } from '../test/fixtures'
import { LandingPage } from './LandingPage'

vi.mock('../api/pagesApi')
const fetchPagesMock = vi.mocked(fetchPages)
const createPageMock = vi.mocked(createPage)

function renderPage() {
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

describe('LandingPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    fetchPagesMock.mockResolvedValue(
      paginated([buildPage({ title: 'Google product', linkCount: 20 })], {
        total: 25,
        totalPages: 3,
      }),
    )
  })

  it('shows a loading state, then the scraped pages', async () => {
    renderPage()

    expect(screen.getByText('Loading pages…')).toBeInTheDocument()
    expect(await screen.findByText('Google product')).toBeInTheDocument()
    expect(fetchPagesMock).toHaveBeenCalledWith(1)
  })

  it('loads another page when the user paginates', async () => {
    const user = renderPage()
    await screen.findByText('Google product')

    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => expect(fetchPagesMock).toHaveBeenLastCalledWith(2))
  })

  it('adds a page and refreshes the list', async () => {
    createPageMock.mockResolvedValue(buildPage({ status: 'IN_PROGRESS' }))
    const user = renderPage()
    await screen.findByText('Google product')

    await user.type(screen.getByPlaceholderText('Add new page'), 'https://example.com')
    await user.click(screen.getByRole('button', { name: 'Scrape' }))

    expect(createPageMock).toHaveBeenCalledWith('https://example.com')
    await waitFor(() => expect(fetchPagesMock).toHaveBeenCalledTimes(2))
  })

  it('shows the API error when a page cannot be added', async () => {
    createPageMock.mockRejectedValue(new Error('Only HTTP and HTTPS URLs are supported'))
    const user = renderPage()
    await screen.findByText('Google product')

    await user.type(screen.getByPlaceholderText('Add new page'), 'https://example.com')
    await user.click(screen.getByRole('button', { name: 'Scrape' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only HTTP and HTTPS URLs are supported',
    )
  })

  it('shows an error when the list cannot be loaded', async () => {
    fetchPagesMock.mockRejectedValue(new Error('Network down'))
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Network down')
  })
})
