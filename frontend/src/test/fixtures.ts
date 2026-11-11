import type {
  PageLinks,
  Paginated,
  ScrapedLink,
  ScrapedPage,
} from '../types/pages'

export function buildPage(overrides: Partial<ScrapedPage> = {}): ScrapedPage {
  return {
    id: 'page-1',
    url: 'https://example.com/',
    title: 'Google product',
    status: 'COMPLETED',
    linkCount: 20,
    errorMessage: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function buildLink(overrides: Partial<ScrapedLink> = {}): ScrapedLink {
  return {
    id: 'link-1',
    name: 'Home page',
    href: 'https://www.google.com/',
    ...overrides,
  }
}

export function paginated<T>(
  data: T[],
  meta: Partial<Paginated<T>['meta']> = {},
): Paginated<T> {
  return {
    data,
    meta: { total: data.length, page: 1, limit: 10, totalPages: 1, ...meta },
  }
}

export function pageLinks(
  page: ScrapedPage,
  links: ScrapedLink[],
  meta: Partial<PageLinks['meta']> = {},
): PageLinks {
  return { page, ...paginated(links, meta) }
}
