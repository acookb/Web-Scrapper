import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { LINK_REPOSITORY } from '../../domain/repositories/link.repository';
import type { LinkRepository } from '../../domain/repositories/link.repository';
import { SCRAPED_PAGE_REPOSITORY } from '../../domain/repositories/scraped-page.repository';
import type {
  PaginatedResult,
  PaginationParams,
  ScrapedPageRepository,
} from '../../domain/repositories/scraped-page.repository';
import type { Link } from '../../domain/entities/link.entity';
import type { ScrapedPage } from '../../domain/entities/scraped-page.entity';
import { normalizePagination } from '../../../../shared/pagination';

export interface ListPageLinksResult {
  page: ScrapedPage;
  links: PaginatedResult<Link>;
}

@Injectable()
export class ListPageLinksUseCase {
  constructor(
    @Inject(SCRAPED_PAGE_REPOSITORY)
    private readonly scrapedPageRepository: ScrapedPageRepository,
    @Inject(LINK_REPOSITORY)
    private readonly linkRepository: LinkRepository,
  ) {}

  async execute(
    pageId: string,
    params: Partial<PaginationParams> = {},
  ): Promise<ListPageLinksResult> {
    const scrapedPage = await this.scrapedPageRepository.findById(pageId);
    if (!scrapedPage) {
      throw new NotFoundException(`Page ${pageId} not found`);
    }

    const { page, limit } = normalizePagination(params.page, params.limit);
    const links = await this.linkRepository.findByPageId(pageId, {
      page,
      limit,
    });

    return {
      page: scrapedPage,
      links,
    };
  }
}
