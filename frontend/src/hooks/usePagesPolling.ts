import { useCallback, useEffect, useState } from 'react'
import { fetchPages } from '../api/pagesApi'
import type { PaginationMeta, ScrapedPageSummary } from '../types/pages'

const POLL_INTERVAL_MS = 3000

export function usePagesPolling(limit = 10) {
  const [pages, setPages] = useState<ScrapedPageSummary[]>([])
  const [meta, setMeta] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit,
    totalPages: 0,
  })
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const response = await fetchPages(page, limit)
      setPages(response.data)
      setMeta(response.meta)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pages')
    } finally {
      setIsLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    setIsLoading(true)
    void load()
  }, [load])

  useEffect(() => {
    const hasInProgress = pages.some((item) => item.status === 'IN_PROGRESS')
    if (!hasInProgress) {
      return
    }

    const timer = window.setInterval(() => {
      void load()
    }, POLL_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [pages, load])

  return {
    pages,
    meta,
    page,
    setPage,
    isLoading,
    error,
    reload: load,
  }
}
