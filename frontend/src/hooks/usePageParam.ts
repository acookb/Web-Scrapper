import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * The current page number lives in the URL (`?page=N`) so that it survives
 * reloads, can be shared and is restored when navigating back.
 */
export function usePageParam(): [number, (page: number) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const parsed = Number.parseInt(searchParams.get('page') ?? '', 10)
  const page = Number.isInteger(parsed) && parsed > 0 ? parsed : 1

  const setPage = useCallback(
    (next: number) => {
      setSearchParams((params) => {
        const updated = new URLSearchParams(params)
        if (next > 1) {
          updated.set('page', String(next))
        } else {
          updated.delete('page')
        }
        return updated
      })
    },
    [setSearchParams],
  )

  return [page, setPage]
}
