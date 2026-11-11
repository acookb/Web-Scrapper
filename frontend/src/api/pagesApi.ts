import type {
  PageLinksResponse,
  PaginatedPagesResponse,
  ScrapedPageSummary,
} from '../types/pages'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'http://localhost:3000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const body = (await response.json()) as { message?: string | string[] }
      if (Array.isArray(body.message)) {
        message = body.message.join(', ')
      } else if (body.message) {
        message = body.message
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message)
  }

  return (await response.json()) as T
}

export function fetchPages(
  page = 1,
  limit = 10,
): Promise<PaginatedPagesResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  return request<PaginatedPagesResponse>(`/pages?${params.toString()}`)
}

export function createPage(url: string): Promise<ScrapedPageSummary> {
  return request<ScrapedPageSummary>('/pages', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
}

export function fetchPageLinks(
  pageId: string,
  page = 1,
  limit = 10,
): Promise<PageLinksResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  })
  return request<PageLinksResponse>(
    `/pages/${pageId}/links?${params.toString()}`,
  )
}
