import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LinkTable } from './LinkTable'

describe('LinkTable', () => {
  it('renders link names and URLs', () => {
    render(
      <LinkTable
        links={[
          {
            id: '1',
            name: 'IANA',
            href: 'https://iana.org',
          },
        ]}
      />,
    )

    expect(screen.getByText('IANA')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'https://iana.org' })).toHaveAttribute(
      'href',
      'https://iana.org',
    )
  })

  it('shows loading state', () => {
    render(<LinkTable links={[]} isLoading />)
    expect(screen.getByTestId('links-loading')).toBeInTheDocument()
  })
})
