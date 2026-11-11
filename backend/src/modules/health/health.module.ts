import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ScrapeQueueModule } from '../scraping/scrape-queue.module';
import { ScrapingPersistenceModule } from '../scraping/scraping-persistence.module';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule, ScrapingPersistenceModule, ScrapeQueueModule],
  controllers: [HealthController],
})
export class HealthModule {}
