import { Inject, Injectable } from '@nestjs/common';
import type { ScrapedPage } from '../../domain/entities/scraped-page.entity';
import { SCRAPED_PAGE_REPOSITORY } from '../../domain/repositories/scraped-page.repository';
import type { ScrapedPageRepository } from '../../domain/repositories/scraped-page.repository';
import { normalizePagination } from '../../../../shared/pagination';
import type {
  PaginatedResult,
  PaginationParams,
} from '../../../../shared/pagination';

@Injectable()
export class ListPagesUseCase {
  constructor(
    @Inject(SCRAPED_PAGE_REPOSITORY)
    private readonly scrapedPageRepository: ScrapedPageRepository,
  ) {}

  execute(
    params: Partial<PaginationParams> = {},
  ): Promise<PaginatedResult<ScrapedPage>> {
    return this.scrapedPageRepository.findPaginated(
      normalizePagination(params.page, params.limit),
    );
  }
}
