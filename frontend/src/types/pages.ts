export type PageStatus = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'

export interface ScrapedPageSummary {
  id: string
  url: string
  title: string | null
  status: PageStatus
  linkCount: number
  errorMessage: string | null
  displayValue: string
  createdAt: string
  updatedAt: string
}

export interface ScrapedLink {
  id: string
  name: string
  href: string
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedPagesResponse {
  data: ScrapedPageSummary[]
  meta: PaginationMeta
}

export interface PageLinksResponse {
  page: {
    id: string
    url: string
    title: string | null
    status: PageStatus
    linkCount: number
    errorMessage: string | null
  }
  data: ScrapedLink[]
  meta: PaginationMeta
}
