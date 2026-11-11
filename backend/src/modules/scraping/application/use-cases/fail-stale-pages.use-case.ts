import { Inject, Injectable } from '@nestjs/common';
import { SCRAPED_PAGE_REPOSITORY } from '../../domain/repositories/scraped-page.repository';
import type { ScrapedPageRepository } from '../../domain/repositories/scraped-page.repository';

export const STALE_PAGE_TIMEOUT_MS = Symbol('STALE_PAGE_TIMEOUT_MS');
export const STALE_PAGE_ERROR = 'Processing timed out';

/** Guarantees that no page stays "in progress" forever. */
@Injectable()
export class FailStalePagesUseCase {
  constructor(
    @Inject(SCRAPED_PAGE_REPOSITORY)
    private readonly scrapedPageRepository: ScrapedPageRepository,
    @Inject(STALE_PAGE_TIMEOUT_MS)
    private readonly staleAfterMs: number,
  ) {}

  execute(now = new Date()): Promise<number> {
    return this.scrapedPageRepository.failStale(
      new Date(now.getTime() - this.staleAfterMs),
      STALE_PAGE_ERROR,
    );
  }
}
