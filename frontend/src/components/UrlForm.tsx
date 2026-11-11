import { useState } from 'react'
import type { FormEvent } from 'react'

interface UrlFormProps {
  onSubmit: (url: string) => Promise<void>
  isSubmitting?: boolean
}

export function UrlForm({ onSubmit, isSubmitting = false }: UrlFormProps) {
  const [url, setUrl] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) {
      return
    }
    await onSubmit(trimmed)
    setUrl('')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 flex flex-col gap-3 sm:flex-row"
      data-testid="url-form"
    >
      <input
        type="url"
        required
        placeholder="https://example.com"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        className="w-full flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none ring-sky-500 focus:ring-2"
        aria-label="URL to scrape"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-slate-800 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {isSubmitting ? 'Scraping…' : 'Scrape'}
      </button>
    </form>
  )
}
