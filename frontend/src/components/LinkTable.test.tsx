import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildLink } from '../test/fixtures'
import { LinkTable } from './LinkTable'

describe('LinkTable', () => {
  it('shows each link name next to its URL', () => {
    render(
      <LinkTable
        links={[
          buildLink({ id: '1', name: 'Home page', href: 'https://www.google.com/' }),
          buildLink({
            id: '2',
            name: 'This is a product',
            href: 'https://www.google.com/products/1',
          }),
        ]}
      />,
    )

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'URL' })).toBeInTheDocument()
    expect(screen.getByText('This is a product')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'https://www.google.com/products/1' }),
    ).toHaveAttribute('href', 'https://www.google.com/products/1')
  })

  it('renders HTML fragments as text instead of markup', () => {
    const { container } = render(
      <LinkTable links={[buildLink({ name: '<img src="something.png">' })]} />,
    )

    expect(screen.getByText('<img src="something.png">')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('shows an empty state', () => {
    render(<LinkTable links={[]} />)

    expect(screen.getByText(/no links found/i)).toBeInTheDocument()
  })
})
