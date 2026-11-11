export type PageStatus = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'

export interface ScrapedPage {
  id: string
  url: string
  title: string | null
  status: PageStatus
  linkCount: number
  errorMessage: string | null
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

export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}

export interface PageLinks extends Paginated<ScrapedLink> {
  page: ScrapedPage
}
