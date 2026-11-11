import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchPageLinks } from '../api/pagesApi'
import { LinkTable } from '../components/LinkTable'
import { Pagination } from '../components/Pagination'
import type { PageLinksResponse } from '../types/pages'

export function PageDetails() {
  const { id } = useParams<{ id: string }>()
  const [pageIndex, setPageIndex] = useState(1)
  const [response, setResponse] = useState<PageLinksResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      return
    }

    let cancelled = false
    setIsLoading(true)

    void fetchPageLinks(id, pageIndex, 10)
      .then((data) => {
        if (!cancelled) {
          setResponse(data)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load links')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [id, pageIndex])

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link
        to="/"
        className="mb-6 inline-flex text-sm font-medium text-sky-700 hover:underline"
      >
        &lt; Back
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          {response?.page.title || response?.page.url || 'Page details'}
        </h1>
        {response?.page.url && (
          <p className="mt-1 break-all text-sm text-slate-600">
            {response.page.url}
          </p>
        )}
      </header>

      {error && (
        <p className="mb-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <LinkTable links={response?.data ?? []} isLoading={isLoading} />
      <Pagination
        page={pageIndex}
        totalPages={response?.meta.totalPages ?? 0}
        onPageChange={setPageIndex}
      />
    </main>
  )
}
