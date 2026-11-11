import { Inject, Injectable } from '@nestjs/common';
import { SCRAPED_PAGE_REPOSITORY } from '../../domain/repositories/scraped-page.repository';
import type {
  PaginatedResult,
  PaginationParams,
  ScrapedPageRepository,
} from '../../domain/repositories/scraped-page.repository';
import type { ScrapedPage } from '../../domain/entities/scraped-page.entity';
import { normalizePagination } from '../../../../shared/pagination';

@Injectable()
export class ListPagesUseCase {
  constructor(
    @Inject(SCRAPED_PAGE_REPOSITORY)
    private readonly scrapedPageRepository: ScrapedPageRepository,
  ) {}

  async execute(
    params: Partial<PaginationParams> = {},
  ): Promise<PaginatedResult<ScrapedPage>> {
    const { page, limit } = normalizePagination(params.page, params.limit);
    return this.scrapedPageRepository.findPaginated({ page, limit });
  }
}
