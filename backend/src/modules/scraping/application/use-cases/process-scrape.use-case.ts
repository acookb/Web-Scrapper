import { Inject, Injectable, Logger } from '@nestjs/common';
import { SCRAPED_PAGE_REPOSITORY } from '../../domain/repositories/scraped-page.repository';
import type { ScrapedPageRepository } from '../../domain/repositories/scraped-page.repository';
import { SCRAPER_PORT } from '../../domain/services/scraper.port';
import type { ScraperPort } from '../../domain/services/scraper.port';

export interface ProcessScrapeCommand {
  pageId: string;
  url: string;
}

@Injectable()
export class ProcessScrapeUseCase {
  private readonly logger = new Logger(ProcessScrapeUseCase.name);

  constructor(
    @Inject(SCRAPED_PAGE_REPOSITORY)
    private readonly scrapedPageRepository: ScrapedPageRepository,
    @Inject(SCRAPER_PORT)
    private readonly scraper: ScraperPort,
  ) {}

  async execute(command: ProcessScrapeCommand): Promise<void> {
    const page = await this.scrapedPageRepository.findById(command.pageId);
    if (!page) {
      this.logger.warn(`Scraped page ${command.pageId} not found, skipping`);
      return;
    }

    try {
      const result = await this.scraper.scrape(command.url);
      await this.scrapedPageRepository.markCompleted({
        pageId: command.pageId,
        title: result.title || command.url,
        links: result.links,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown scraping error';
      this.logger.error(
        `Failed to scrape page ${command.pageId}: ${message}`,
      );
      await this.scrapedPageRepository.markFailed({
        pageId: command.pageId,
        errorMessage: message,
      });
    }
  }
}
