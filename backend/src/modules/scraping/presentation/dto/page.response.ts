import type { Link } from '../../domain/entities/link.entity';
import type { ScrapedPage } from '../../domain/entities/scraped-page.entity';
import type { PageStatus } from '../../domain/enums/page-status.enum';
import type { PaginatedResult } from '../../../../shared/pagination';

export interface PageResponse {
  id: string;
  url: string;
  title: string | null;
  status: PageStatus;
  linkCount: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LinkResponse {
  id: string;
  name: string;
  href: string;
}

export interface PaginationMetaResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMetaResponse;
}

export interface PageLinksResponse extends PaginatedResponse<LinkResponse> {
  page: PageResponse;
}

export function toPageResponse(page: ScrapedPage): PageResponse {
  return {
    id: page.id,
    url: page.url,
    title: page.title,
    status: page.status,
    linkCount: page.linkCount,
    errorMessage: page.errorMessage,
    createdAt: page.createdAt.toISOString(),
    updatedAt: page.updatedAt.toISOString(),
  };
}

export function toLinkResponse(link: Link): LinkResponse {
  return { id: link.id, name: link.name, href: link.href };
}

export function toPaginatedResponse<T, R>(
  result: PaginatedResult<T>,
  mapItem: (item: T) => R,
): PaginatedResponse<R> {
  return {
    data: result.items.map(mapItem),
    meta: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  };
}
