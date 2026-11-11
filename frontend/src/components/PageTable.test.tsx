import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { buildPage } from '../test/fixtures'
import type { ScrapedPage } from '../types/pages'
import { PageTable } from './PageTable'

function renderTable(pages: ScrapedPage[]) {
  return render(
    <MemoryRouter>
      <PageTable pages={pages} />
    </MemoryRouter>,
  )
}

function rows() {
  return within(screen.getByRole('table', { name: 'Scraped pages' }))
    .getAllByRole('row')
    .map((row) =>
      Array.from(row.querySelectorAll('th, td'), (cell) => cell.textContent),
    )
}

describe('PageTable', () => {
  it('lists each page name with its total links', () => {
    renderTable([
      buildPage({ id: '1', title: 'Google product', linkCount: 20 }),
      buildPage({ id: '2', title: 'Amazon DYI page', linkCount: 6 }),
    ])

    expect(rows()).toEqual([
      ['Name', 'Total links'],
      ['Google product', '20'],
      ['Amazon DYI page', '6'],
    ])
  })

  it('shows "in progress" for pages that are still being scraped', () => {
    renderTable([buildPage({ title: null, status: 'IN_PROGRESS', linkCount: 0 })])

    expect(rows()[1]).toEqual(['https://example.com/', 'in progress'])
  })

  it('shows failed pages with the error as a tooltip', () => {
    renderTable([buildPage({ status: 'FAILED', errorMessage: 'timeout' })])

    expect(screen.getByText('failed')).toHaveAttribute('title', 'timeout')
  })

  it('links each page to its details view', () => {
    renderTable([buildPage({ id: 'abc' })])

    expect(screen.getByRole('link', { name: 'Google product' })).toHaveAttribute(
      'href',
      '/pages/abc',
    )
  })

  it('shows an empty state', () => {
    renderTable([])

    expect(screen.getByText(/no pages scraped yet/i)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
