import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PageTable } from './PageTable'
import type { ScrapedPageSummary } from '../types/pages'

const samplePages: ScrapedPageSummary[] = [
  {
    id: '1',
    url: 'https://example.com',
    title: 'Example Domain',
    status: 'COMPLETED',
    linkCount: 3,
    errorMessage: null,
    displayValue: '3',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    url: 'https://slow.example.com',
    title: null,
    status: 'IN_PROGRESS',
    linkCount: 0,
    errorMessage: null,
    displayValue: 'in progress',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

describe('PageTable', () => {
  it('renders page names, link counts and in-progress state', () => {
    render(
      <MemoryRouter>
        <PageTable pages={samplePages} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Example Domain')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('in progress')).toBeInTheDocument()
  })

  it('shows a loading state', () => {
    render(
      <MemoryRouter>
        <PageTable pages={[]} isLoading />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('pages-loading')).toBeInTheDocument()
  })
})
