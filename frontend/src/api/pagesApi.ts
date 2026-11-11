import type { PageLinks, Paginated, ScrapedPage } from '../types/pages'

export const PAGE_SIZE = 10

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'
).replace(/\/$/, '')

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status)
  }

  return (await response.json()) as T
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `Request failed with status ${response.status}`
  try {
    const body = (await response.json()) as { message?: string | string[] }
    if (Array.isArray(body.message)) {
      return body.message.join(', ')
    }
    return body.message || fallback
  } catch {
    return fallback
  }
}

function paginationQuery(page: number, limit: number): string {
  return new URLSearchParams({
    page: String(page),
    limit: String(limit),
  }).toString()
}

export function fetchPages(
  page: number,
  limit = PAGE_SIZE,
): Promise<Paginated<ScrapedPage>> {
  return request(`/pages?${paginationQuery(page, limit)}`)
}

export function createPage(url: string): Promise<ScrapedPage> {
  return request('/pages', { method: 'POST', body: JSON.stringify({ url }) })
}

export function fetchPageLinks(
  pageId: string,
  page: number,
  limit = PAGE_SIZE,
): Promise<PageLinks> {
  return request(
    `/pages/${encodeURIComponent(pageId)}/links?${paginationQuery(page, limit)}`,
  )
}
