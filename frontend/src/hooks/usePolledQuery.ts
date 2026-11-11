import { useCallback, useEffect, useState } from 'react'

export const POLL_INTERVAL_MS = 3000

interface QueryResult<T> {
  source: () => Promise<T>
  data: T | null
  error: string | null
}

export interface PolledQuery<T> {
  data: T | null
  error: string | null
  isLoading: boolean
  refresh: () => void
}

/**
 * Runs `fetcher` and keeps re-running it every `intervalMs` while
 * `shouldPoll(data)` is true. `fetcher` must be memoized: a new function
 * identity means a new query (e.g. another page number).
 */
export function usePolledQuery<T>(
  fetcher: () => Promise<T>,
  shouldPoll: (data: T) => boolean,
  intervalMs = POLL_INTERVAL_MS,
): PolledQuery<T> {
  const [result, setResult] = useState<QueryResult<T> | null>(null)
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function run() {
      try {
        const data = await fetcher()
        if (cancelled) return
        setResult({ source: fetcher, data, error: null })
        if (shouldPoll(data)) {
          timer = setTimeout(() => void run(), intervalMs)
        }
      } catch (err) {
        if (cancelled) return
        setResult({
          source: fetcher,
          data: null,
          error: err instanceof Error ? err.message : 'Something went wrong',
        })
      }
    }

    void run()

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [fetcher, shouldPoll, intervalMs, refreshCount])

  const refresh = useCallback(() => setRefreshCount((count) => count + 1), [])
  const isCurrent = result?.source === fetcher

  return {
    data: isCurrent ? result.data : null,
    error: isCurrent ? result.error : null,
    isLoading: !isCurrent,
    refresh,
  }
}
