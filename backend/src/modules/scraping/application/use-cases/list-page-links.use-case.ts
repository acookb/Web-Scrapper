import { Inject, Injectable } from '@nestjs/common';
import type { Link } from '../../domain/entities/link.entity';
import type { ScrapedPage } from '../../domain/entities/scraped-page.entity';
import { PageNotFoundError } from '../../domain/errors/page-not-found.error';
import { LINK_REPOSITORY } from '../../domain/repositories/link.repository';
import type { LinkRepository } from '../../domain/repositories/link.repository';
import { SCRAPED_PAGE_REPOSITORY } from '../../domain/repositories/scraped-page.repository';
import type { ScrapedPageRepository } from '../../domain/repositories/scraped-page.repository';
import { normalizePagination } from '../../../../shared/pagination';
import type {
  PaginatedResult,
  PaginationParams,
} from '../../../../shared/pagination';

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
      throw new PageNotFoundError(pageId);
    }

    const links = await this.linkRepository.findByPageId(
      pageId,
      normalizePagination(params.page, params.limit),
    );

    return { page: scrapedPage, links };
  }
}
