import { useState } from 'react'
import type { FormEvent } from 'react'

interface UrlFormProps {
  /** Resolves to true when the URL was accepted, which clears the input. */
  onSubmit: (url: string) => Promise<boolean>
}

export function UrlForm({ onSubmit }: UrlFormProps) {
  const [url, setUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = url.trim()
    if (!trimmed || isSubmitting) {
      return
    }

    setIsSubmitting(true)
    const accepted = await onSubmit(trimmed)
    setIsSubmitting(false)
    if (accepted) {
      setUrl('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-12 flex gap-10">
      <input
        type="url"
        required
        placeholder="Add new page"
        aria-label="Page URL"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        className="flex-1 border-2 border-gray-400 bg-white px-2 py-1.5 outline-none focus:border-gray-600"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-64 rounded border-2 border-gray-400 bg-gray-200 px-6 py-1.5 text-lg font-semibold text-gray-800 hover:bg-gray-300 disabled:opacity-60"
      >
        {isSubmitting ? 'Scraping…' : 'Scrape'}
      </button>
    </form>
  )
}
