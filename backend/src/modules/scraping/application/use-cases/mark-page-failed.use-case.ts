import { Inject, Injectable } from '@nestjs/common';
import { SCRAPED_PAGE_REPOSITORY } from '../../domain/repositories/scraped-page.repository';
import type { ScrapedPageRepository } from '../../domain/repositories/scraped-page.repository';

export interface MarkPageFailedCommand {
  pageId: string;
  reason: string;
}

/**
 * Last line of defence for jobs that fail outside the normal processing path
 * (e.g. a worker crash that leaves the job stalled).
 */
@Injectable()
export class MarkPageFailedUseCase {
  constructor(
    @Inject(SCRAPED_PAGE_REPOSITORY)
    private readonly scrapedPageRepository: ScrapedPageRepository,
  ) {}

  execute(command: MarkPageFailedCommand): Promise<boolean> {
    return this.scrapedPageRepository.markFailed({
      pageId: command.pageId,
      errorMessage: command.reason,
    });
  }
}
