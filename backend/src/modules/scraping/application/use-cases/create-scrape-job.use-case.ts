import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ScrapedPage } from '../../domain/entities/scraped-page.entity';
import { SCRAPED_PAGE_REPOSITORY } from '../../domain/repositories/scraped-page.repository';
import type { ScrapedPageRepository } from '../../domain/repositories/scraped-page.repository';
import { PageUrl } from '../../domain/value-objects/page-url';
import { SCRAPE_QUEUE_PORT } from '../ports/scrape-queue.port';
import type { ScrapeQueuePort } from '../ports/scrape-queue.port';

export interface CreateScrapeJobCommand {
  url: string;
}

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

    await this.scrapeQueue.enqueue({ pageId: page.id, url: page.url });

    return page;
  }
}
