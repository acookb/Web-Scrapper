import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ScrapedPage } from '../../domain/entities/scraped-page.entity';
import {
  SCRAPED_PAGE_REPOSITORY,
} from '../../domain/repositories/scraped-page.repository';
import type { ScrapedPageRepository } from '../../domain/repositories/scraped-page.repository';
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
    const url = this.normalizeUrl(command.url);
    const pageId = randomUUID();

    const page = await this.scrapedPageRepository.create({
      id: pageId,
      url,
    });

    await this.scrapeQueue.enqueue({
      pageId: page.id,
      url: page.url,
    });

    return page;
  }

  private normalizeUrl(rawUrl: string): string {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      throw new Error('URL is required');
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new Error('Invalid URL');
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Only HTTP and HTTPS URLs are supported');
    }

    return parsed.toString();
  }
}
