import { Module } from '@nestjs/common';
import { ScrapeProcessor } from './infrastructure/queue/scrape.processor';
import { ScrapingModule } from './scraping.module';

@Module({
  imports: [ScrapingModule],
  providers: [ScrapeProcessor],
})
export class ScrapingWorkerModule {}
