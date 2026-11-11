import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPageLinks } from '../api/pagesApi'
import { buildLink, buildPage, pageLinks } from '../test/fixtures'
import { PageDetails } from './PageDetails'

vi.mock('../api/pagesApi')
const fetchPageLinksMock = vi.mocked(fetchPageLinks)

function renderDetails() {
  render(
    <MemoryRouter initialEntries={['/pages/page-1']}>
      <Routes>
        <Route path="/" element={<p>Landing</p>} />
        <Route path="/pages/:id" element={<PageDetails />} />
      </Routes>
    </MemoryRouter>,
  )
  return userEvent.setup()
}

describe('PageDetails', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    fetchPageLinksMock.mockResolvedValue(
      pageLinks(
        buildPage({ title: 'Google Product' }),
        [buildLink({ name: 'Home page', href: 'https://www.google.com/' })],
        { total: 12, totalPages: 2 },
      ),
    )
  })

  it('shows the page name as the heading and its links', async () => {
    renderDetails()

    expect(
      await screen.findByRole('heading', { name: 'Google Product' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Home page')).toBeInTheDocument()
    expect(fetchPageLinksMock).toHaveBeenCalledWith('page-1', 1)
  })

  it('loads the next page of links', async () => {
    const user = renderDetails()
    await screen.findByText('Home page')

    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() =>
      expect(fetchPageLinksMock).toHaveBeenLastCalledWith('page-1', 2),
    )
  })

  it('goes back to the landing page', async () => {
    const user = renderDetails()

    await user.click(screen.getByRole('link', { name: '< Back' }))

    expect(screen.getByText('Landing')).toBeInTheDocument()
  })

  it('explains when the page is still being scraped', async () => {
    fetchPageLinksMock.mockResolvedValue(
      pageLinks(buildPage({ title: null, status: 'IN_PROGRESS' }), []),
    )
    renderDetails()

    expect(await screen.findByText(/still being scraped/i)).toBeInTheDocument()
  })

  it('shows why scraping failed', async () => {
    fetchPageLinksMock.mockResolvedValue(
      pageLinks(buildPage({ status: 'FAILED', errorMessage: 'timeout' }), []),
    )
    renderDetails()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Scraping failed: timeout',
    )
  })
})
