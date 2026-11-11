import { useCallback, useState } from 'react'
import { createPage, fetchPages } from '../api/pagesApi'
import { PageTable } from '../components/PageTable'
import { Pagination } from '../components/Pagination'
import { UrlForm } from '../components/UrlForm'
import { usePolledQuery } from '../hooks/usePolledQuery'
import type { Paginated, ScrapedPage } from '../types/pages'

function hasPagesInProgress(result: Paginated<ScrapedPage>): boolean {
  return result.data.some((page) => page.status === 'IN_PROGRESS')
}

export function LandingPage() {
  const [page, setPage] = useState(1)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const fetchCurrentPage = useCallback(() => fetchPages(page), [page])
  const pages = usePolledQuery(fetchCurrentPage, hasPagesInProgress)

  async function handleScrape(url: string): Promise<boolean> {
    setSubmitError(null)
    try {
      await createPage(url)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not add the page')
      return false
    }

    // Newest pages are listed first, so show the first page.
    if (page === 1) {
      pages.refresh()
    } else {
      setPage(1)
    }
    return true
  }

  const error = submitError ?? pages.error

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <UrlForm onSubmit={handleScrape} />

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {pages.isLoading ? (
        <p className="text-sm text-gray-600">Loading pages…</p>
      ) : (
        pages.data && (
          <>
            <PageTable pages={pages.data.data} />
            <Pagination
              page={page}
              totalPages={pages.data.meta.totalPages}
              onPageChange={setPage}
            />
          </>
        )
      )}
    </main>
  )
}
