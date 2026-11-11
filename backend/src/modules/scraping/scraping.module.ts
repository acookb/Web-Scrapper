import { Module } from '@nestjs/common';
import { CreateScrapeJobUseCase } from './application/use-cases/create-scrape-job.use-case';
import { ListPageLinksUseCase } from './application/use-cases/list-page-links.use-case';
import { ListPagesUseCase } from './application/use-cases/list-pages.use-case';
import { PagesController } from './presentation/controllers/pages.controller';
import { ScrapeQueueModule } from './scrape-queue.module';
import { ScrapingPersistenceModule } from './scraping-persistence.module';

/**
 * HTTP-facing part of the scraping context. It only produces jobs; consuming
 * them is the responsibility of {@link ScrapingWorkerModule}.
 */
@Module({
  imports: [ScrapingPersistenceModule, ScrapeQueueModule],
  controllers: [PagesController],
  providers: [CreateScrapeJobUseCase, ListPagesUseCase, ListPageLinksUseCase],
})
export class ScrapingModule {}
