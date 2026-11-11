import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchPageLinks } from '../api/pagesApi'
import { LinkTable } from '../components/LinkTable'
import { Pagination } from '../components/Pagination'
import { usePolledQuery } from '../hooks/usePolledQuery'
import type { PageLinks } from '../types/pages'

function isStillProcessing(result: PageLinks): boolean {
  return result.page.status === 'IN_PROGRESS'
}

export function PageDetails() {
  const { id = '' } = useParams<{ id: string }>()
  const [page, setPage] = useState(1)

  const fetchCurrentPage = useCallback(() => fetchPageLinks(id, page), [id, page])
  const { data, error, isLoading } = usePolledQuery(
    fetchCurrentPage,
    isStillProcessing,
  )

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 break-words text-center text-4xl font-bold text-gray-800">
        {data ? data.page.title || data.page.url : 'Page details'}
      </h1>

      <Link to="/" className="font-semibold text-blue-600 underline">
        &lt; Back
      </Link>

      <div className="mt-1">
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        {isLoading && <p className="text-sm text-gray-600">Loading links…</p>}

        {data && <PageContent data={data} page={page} onPageChange={setPage} />}
      </div>
    </main>
  )
}

interface PageContentProps {
  data: PageLinks
  page: number
  onPageChange: (page: number) => void
}

function PageContent({ data, page, onPageChange }: PageContentProps) {
  if (data.page.status === 'IN_PROGRESS') {
    return (
      <p className="text-sm text-gray-600">
        This page is still being scraped. Links will appear here automatically.
      </p>
    )
  }

  if (data.page.status === 'FAILED') {
    return (
      <p role="alert" className="text-sm text-red-700">
        Scraping failed: {data.page.errorMessage ?? 'unknown error'}
      </p>
    )
  }

  return (
    <>
      <LinkTable links={data.data} />
      <Pagination
        page={page}
        totalPages={data.meta.totalPages}
        onPageChange={onPageChange}
      />
    </>
  )
}
