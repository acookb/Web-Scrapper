import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchPageLinks, fetchPages } from './api/pagesApi'
import { AppRoutes } from './App'
import { buildLink, buildPage, pageLinks, paginated } from './test/fixtures'

vi.mock('./api/pagesApi')
const fetchPagesMock = vi.mocked(fetchPages)
const fetchPageLinksMock = vi.mocked(fetchPageLinks)

function renderApp(initialUrl = '/') {
  render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <AppRoutes />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

describe('navigation', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    fetchPagesMock.mockImplementation((page) =>
      Promise.resolve(
        paginated(
          [buildPage({ id: `page-${page}`, title: `Page from list ${page}` })],
          { page, total: 30, totalPages: 3 },
        ),
      ),
    )
    fetchPageLinksMock.mockResolvedValue(
      pageLinks(buildPage({ title: 'Details' }), [buildLink()]),
    )
  })

  it('opens the list page given in the URL', async () => {
    renderApp('/?page=3')

    expect(await screen.findByText('Page from list 3')).toBeInTheDocument()
    expect(fetchPagesMock).toHaveBeenCalledWith(3)
  })

  it('falls back to the first page for an invalid page parameter', async () => {
    renderApp('/?page=abc')

    expect(await screen.findByText('Page from list 1')).toBeInTheDocument()
  })

  it('returns to the same list page after viewing a page’s details', async () => {
    const user = renderApp()
    await screen.findByText('Page from list 1')

    await user.click(screen.getByRole('button', { name: 'Page 2' }))
    await user.click(await screen.findByRole('link', { name: 'Page from list 2' }))
    expect(
      await screen.findByRole('heading', { name: 'Details' }),
    ).toBeInTheDocument()
    expect(fetchPageLinksMock).toHaveBeenCalledWith('page-2', 1)

    await user.click(screen.getByRole('link', { name: '< Back' }))

    expect(await screen.findByText('Page from list 2')).toBeInTheDocument()
    await waitFor(() => expect(fetchPagesMock).toHaveBeenLastCalledWith(2))
  })

  it('redirects unknown routes to the list', async () => {
    renderApp('/nope')

    expect(await screen.findByText('Page from list 1')).toBeInTheDocument()
  })
})
