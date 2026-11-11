import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createPage, fetchPageLinks, fetchPages } from './pagesApi'

const fetchMock = vi.fn<typeof fetch>()

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('pagesApi', () => {
  beforeEach(() => vi.stubGlobal('fetch', fetchMock))
  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('requests a page of scraped pages', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: [], meta: {} }))

    await fetchPages(2)

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/pages?page=2&limit=10',
      expect.any(Object),
    )
  })

  it('requests a page of links for a page', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ page: {}, data: [], meta: {} }))

    await fetchPageLinks('abc', 3, 5)

    expect(fetchMock).toHaveBeenCalledWith(
      'http://api.test/pages/abc/links?page=3&limit=5',
      expect.any(Object),
    )
  })

  it('posts the URL to scrape as JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: '1' }, 201))

    await createPage('https://example.com')

    const [, init] = fetchMock.mock.calls[0]
    expect(init).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com' }),
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('surfaces validation messages from the API', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: ['url must be a URL address'] }, 400),
    )

    const request = createPage('nope')

    await expect(request).rejects.toBeInstanceOf(ApiError)
    await expect(request).rejects.toMatchObject({
      message: 'url must be a URL address',
      status: 400,
    })
  })

  it('uses a single string message from the API as is', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: 'Page abc not found' }, 404),
    )

    await expect(fetchPageLinks('abc', 1)).rejects.toThrow('Page abc not found')
  })

  it('falls back to a generic message when the error has no message', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 503))

    await expect(fetchPages(1)).rejects.toThrow('Request failed with status 503')
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    fetchMock.mockResolvedValue(new Response('Bad gateway', { status: 502 }))

    await expect(fetchPages(1)).rejects.toThrow('Request failed with status 502')
  })
})
