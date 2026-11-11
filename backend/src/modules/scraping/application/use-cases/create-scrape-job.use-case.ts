import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ScrapedPage } from '../../domain/entities/scraped-page.entity';
import { SCRAPED_PAGE_REPOSITORY } from '../../domain/repositories/scraped-page.repository';
import type { ScrapedPageRepository } from '../../domain/repositories/scraped-page.repository';
import { PageUrl } from '../../domain/value-objects/page-url';
import { ScrapeQueueUnavailableError } from '../errors/scrape-queue-unavailable.error';
import { SCRAPE_QUEUE_PORT } from '../ports/scrape-queue.port';
import type { ScrapeQueuePort } from '../ports/scrape-queue.port';

export interface CreateScrapeJobCommand {
  url: string;
}

export const ENQUEUE_FAILED_ERROR = 'Could not queue the page for scraping';

@Injectable()
export class CreateScrapeJobUseCase {
  constructor(
    @Inject(SCRAPED_PAGE_REPOSITORY)
    private readonly scrapedPageRepository: ScrapedPageRepository,
    @Inject(SCRAPE_QUEUE_PORT)
    private readonly scrapeQueue: ScrapeQueuePort,
  ) {}

  async execute(command: CreateScrapeJobCommand): Promise<ScrapedPage> {
    const url = PageUrl.create(command.url);

    const page = await this.scrapedPageRepository.create({
      id: randomUUID(),
      url: url.value,
    });

    try {
      await this.scrapeQueue.enqueue({ pageId: page.id, url: page.url });
    } catch (error) {
      // The row exists but no job will ever process it.
      await this.scrapedPageRepository.markFailed({
        pageId: page.id,
        errorMessage: ENQUEUE_FAILED_ERROR,
      });
      throw new ScrapeQueueUnavailableError(error);
    }

    return page;
  }
}
