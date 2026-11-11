import { ApiProperty } from '@nestjs/swagger';
import type { Link } from '../../domain/entities/link.entity';
import type { ScrapedPage } from '../../domain/entities/scraped-page.entity';
import { PageStatus } from '../../domain/enums/page-status.enum';
import type { PaginatedResult } from '../../../../shared/pagination';

export class PageResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'https://news.ycombinator.com/' })
  url!: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Content of <title>; null while the page is in progress',
    example: 'Hacker News',
  })
  title!: string | null;

  @ApiProperty({ enum: PageStatus, enumName: 'PageStatus' })
  status!: PageStatus;

  @ApiProperty({ example: 229 })
  linkCount!: number;

  @ApiProperty({ type: String, nullable: true, example: null })
  errorMessage!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class LinkResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    description:
      'Visible text of the link, or a sanitized HTML fragment (max 500 characters) when the body has no text',
    example: '<img src="logo.png" alt="Logo">',
  })
  name!: string;

  @ApiProperty({ example: 'https://news.ycombinator.com/news' })
  href!: string;
}

export class PaginationMetaResponse {
  @ApiProperty({ example: 25 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}

export class PaginatedPagesResponse {
  @ApiProperty({ type: [PageResponse] })
  data!: PageResponse[];

  @ApiProperty()
  meta!: PaginationMetaResponse;
}

export class PageLinksResponse {
  @ApiProperty()
  page!: PageResponse;

  @ApiProperty({ type: [LinkResponse] })
  data!: LinkResponse[];

  @ApiProperty()
  meta!: PaginationMetaResponse;
}

export class ErrorResponse {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Invalid URL',
  })
  message!: string | string[];

  @ApiProperty({ example: 'InvalidUrlError' })
  error!: string;
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
): { data: R[]; meta: PaginationMetaResponse } {
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
