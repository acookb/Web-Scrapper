import { useState } from 'react'
import { createPage } from '../api/pagesApi'
import { PageTable } from '../components/PageTable'
import { Pagination } from '../components/Pagination'
import { UrlForm } from '../components/UrlForm'
import { usePagesPolling } from '../hooks/usePagesPolling'

export function LandingPage() {
  const { pages, meta, page, setPage, isLoading, error, reload } =
    usePagesPolling(10)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function handleScrape(url: string) {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await createPage(url)
      await reload()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to scrape')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">Web Scraper</h1>
        <p className="mt-1 text-sm text-slate-600">
          Add a URL to scrape its title and links asynchronously.
        </p>
      </header>

      <UrlForm onSubmit={handleScrape} isSubmitting={isSubmitting} />

      {(submitError || error) && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {submitError || error}
        </p>
      )}

      <PageTable pages={pages} isLoading={isLoading} />
      <Pagination
        page={page}
        totalPages={meta.totalPages}
        onPageChange={setPage}
      />
    </main>
  )
}
