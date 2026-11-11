import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UrlForm } from './UrlForm'

function setup(onSubmit = vi.fn().mockResolvedValue(true)) {
  render(<UrlForm onSubmit={onSubmit} />)
  return {
    user: userEvent.setup(),
    input: screen.getByPlaceholderText('Add new page'),
    button: screen.getByRole('button', { name: 'Scrape' }),
    onSubmit,
  }
}

describe('UrlForm', () => {
  it('submits the trimmed URL and clears the input once accepted', async () => {
    const { user, input, button, onSubmit } = setup()

    await user.type(input, '  https://example.com  ')
    await user.click(button)

    expect(onSubmit).toHaveBeenCalledWith('https://example.com')
    expect(input).toHaveValue('')
  })

  it('keeps the URL when it was rejected so the user can fix it', async () => {
    const { user, input, button } = setup(vi.fn().mockResolvedValue(false))

    await user.type(input, 'https://example.com')
    await user.click(button)

    expect(input).toHaveValue('https://example.com')
  })

  it('disables the button while the request is in flight', async () => {
    let resolve: (accepted: boolean) => void = () => {}
    const { user, input, button } = setup(
      vi.fn(() => new Promise<boolean>((r) => (resolve = r))),
    )

    await user.type(input, 'https://example.com')
    await user.click(button)
    expect(screen.getByRole('button', { name: 'Scraping…' })).toBeDisabled()

    resolve(true)
    expect(await screen.findByRole('button', { name: 'Scrape' })).toBeEnabled()
    expect(button).toBeEnabled()
  })

  it('does not submit an empty value', async () => {
    const { user, button, onSubmit } = setup()

    await user.click(button)

    expect(onSubmit).not.toHaveBeenCalled()
  })
})
