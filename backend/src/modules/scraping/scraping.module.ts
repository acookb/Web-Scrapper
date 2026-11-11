import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SCRAPE_QUEUE_PORT } from './application/ports/scrape-queue.port';
import { CreateScrapeJobUseCase } from './application/use-cases/create-scrape-job.use-case';
import { ListPageLinksUseCase } from './application/use-cases/list-page-links.use-case';
import { ListPagesUseCase } from './application/use-cases/list-pages.use-case';
import { ProcessScrapeUseCase } from './application/use-cases/process-scrape.use-case';
import { LINK_REPOSITORY } from './domain/repositories/link.repository';
import { SCRAPED_PAGE_REPOSITORY } from './domain/repositories/scraped-page.repository';
import { SCRAPER_PORT } from './domain/services/scraper.port';
import { PrismaLinkRepository } from './infrastructure/persistence/prisma-link.repository';
import { PrismaScrapedPageRepository } from './infrastructure/persistence/prisma-scraped-page.repository';
import { PrismaService } from './infrastructure/persistence/prisma.service';
import { BullMqScrapeQueueAdapter } from './infrastructure/queue/bullmq-scrape-queue.adapter';
import { SCRAPE_QUEUE_NAME } from './infrastructure/queue/scrape.constants';
import { ScrapeProcessor } from './infrastructure/queue/scrape.processor';
import { AxiosCheerioScraper } from './infrastructure/scraper/axios-cheerio.scraper';
import { PagesController } from './presentation/controllers/pages.controller';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: Number(config.get<string>('REDIS_PORT', '6379')),
        },
      }),
    }),
    BullModule.registerQueue({
      name: SCRAPE_QUEUE_NAME,
    }),
  ],
  controllers: [PagesController],
  providers: [
    PrismaService,
    CreateScrapeJobUseCase,
    ProcessScrapeUseCase,
    ListPagesUseCase,
    ListPageLinksUseCase,
    ScrapeProcessor,
    {
      provide: SCRAPED_PAGE_REPOSITORY,
      useClass: PrismaScrapedPageRepository,
    },
    {
      provide: LINK_REPOSITORY,
      useClass: PrismaLinkRepository,
    },
    {
      provide: SCRAPER_PORT,
      useClass: AxiosCheerioScraper,
    },
    {
      provide: SCRAPE_QUEUE_PORT,
      useClass: BullMqScrapeQueueAdapter,
    },
  ],
  exports: [ProcessScrapeUseCase, PrismaService],
})
export class ScrapingModule {}
