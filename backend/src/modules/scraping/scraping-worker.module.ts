import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EnvironmentVariables } from '../../config/environment';
import {
  FailStalePagesUseCase,
  STALE_PAGE_TIMEOUT_MS,
} from './application/use-cases/fail-stale-pages.use-case';
import { MarkPageFailedUseCase } from './application/use-cases/mark-page-failed.use-case';
import { ProcessScrapeUseCase } from './application/use-cases/process-scrape.use-case';
import { SCRAPER_PORT } from './domain/services/scraper.port';
import {
  SCRAPE_CONCURRENCY,
  SCRAPE_QUEUE_NAME,
} from './infrastructure/queue/scrape.constants';
import { ScrapeProcessor } from './infrastructure/queue/scrape.processor';
import { StalePageReaper } from './infrastructure/queue/stale-page-reaper';
import { AxiosCheerioScraper } from './infrastructure/scraper/axios-cheerio.scraper';
import {
  SCRAPER_OPTIONS,
  scraperOptionsFromEnv,
} from './infrastructure/scraper/scraper-options';
import { ScrapingPersistenceModule } from './scraping-persistence.module';

/** Consumer side of the scraping context: runs only in the worker process. */
@Module({
  imports: [
    ScrapingPersistenceModule,
    // Also registers the BullMQ explorer that starts the @Processor workers.
    BullModule.registerQueue({ name: SCRAPE_QUEUE_NAME }),
  ],
  providers: [
    ProcessScrapeUseCase,
    MarkPageFailedUseCase,
    FailStalePagesUseCase,
    ScrapeProcessor,
    StalePageReaper,
    { provide: SCRAPER_PORT, useClass: AxiosCheerioScraper },
    {
      provide: SCRAPER_OPTIONS,
      inject: [EnvironmentVariables],
      useFactory: scraperOptionsFromEnv,
    },
    {
      provide: SCRAPE_CONCURRENCY,
      inject: [EnvironmentVariables],
      useFactory: (env: EnvironmentVariables) => env.SCRAPE_CONCURRENCY,
    },
    {
      provide: STALE_PAGE_TIMEOUT_MS,
      inject: [EnvironmentVariables],
      useFactory: (env: EnvironmentVariables) =>
        env.STALE_PAGE_TIMEOUT_MINUTES * 60_000,
    },
  ],
})
export class ScrapingWorkerModule {}
