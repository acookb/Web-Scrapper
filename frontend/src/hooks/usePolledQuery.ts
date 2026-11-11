import { useCallback, useEffect, useRef, useState } from 'react'

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
 * `shouldPoll(data)` is true. A failed request keeps the last data and is
 * retried, so a transient network error does not stop the polling.
 * `fetcher` must be memoized: a new function identity means a new query
 * (e.g. another page number).
 */
export function usePolledQuery<T>(
  fetcher: () => Promise<T>,
  shouldPoll: (data: T) => boolean,
  intervalMs = POLL_INTERVAL_MS,
): PolledQuery<T> {
  const [result, setResult] = useState<QueryResult<T> | null>(null)
  const [refreshCount, setRefreshCount] = useState(0)
  // Survives refresh() so an error after a refresh still knows the last data.
  const lastSuccess = useRef<{ source: () => Promise<T>; data: T } | null>(
    null,
  )

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let lastData: T | null =
      lastSuccess.current?.source === fetcher ? lastSuccess.current.data : null

    const schedule = () => {
      timer = setTimeout(() => void run(), intervalMs)
    }

    async function run() {
      try {
        const data = await fetcher()
        if (cancelled) return
        lastData = data
        lastSuccess.current = { source: fetcher, data }
        setResult({ source: fetcher, data, error: null })
        if (shouldPoll(data)) {
          schedule()
        }
      } catch (err) {
        if (cancelled) return
        setResult({
          source: fetcher,
          data: lastData,
          error: err instanceof Error ? err.message : 'Something went wrong',
        })
        if (lastData === null || shouldPoll(lastData)) {
          schedule()
        }
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
