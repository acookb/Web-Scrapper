import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePolledQuery } from './usePolledQuery'

const INTERVAL_MS = 10
const stillRunning = (status: string) => status === 'running'
const never = () => false

describe('usePolledQuery', () => {
  it('starts loading and then exposes the data', async () => {
    const fetcher = vi.fn().mockResolvedValue('done')
    const { result } = renderHook(() => usePolledQuery(fetcher, never))

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.data).toBe('done'))
    expect(result.current.isLoading).toBe(false)
  })

  it('keeps polling while the predicate holds and stops afterwards', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce('running')
      .mockResolvedValueOnce('running')
      .mockResolvedValue('done')

    const { result } = renderHook(() =>
      usePolledQuery(fetcher, stillRunning, INTERVAL_MS),
    )

    await waitFor(() => expect(result.current.data).toBe('done'))
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS * 5))
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('exposes errors', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('Network down'))
    const { result } = renderHook(() => usePolledQuery(fetcher, never))

    await waitFor(() => expect(result.current.error).toBe('Network down'))
    expect(result.current.data).toBeNull()
  })

  it('refetches on demand', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce('first').mockResolvedValue('second')
    const { result } = renderHook(() => usePolledQuery(fetcher, never))
    await waitFor(() => expect(result.current.data).toBe('first'))

    act(() => result.current.refresh())

    await waitFor(() => expect(result.current.data).toBe('second'))
  })

  it('treats a new fetcher as a new query', async () => {
    const first = vi.fn().mockResolvedValue('page 1')
    const second = vi.fn(() => new Promise<string>(() => {}))
    const { result, rerender } = renderHook(
      ({ fetcher }) => usePolledQuery(fetcher, never),
      { initialProps: { fetcher: first as () => Promise<string> } },
    )
    await waitFor(() => expect(result.current.data).toBe('page 1'))

    rerender({ fetcher: second })

    expect(result.current).toMatchObject({ isLoading: true, data: null })
  })
})
