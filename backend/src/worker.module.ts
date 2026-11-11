import { Module } from '@nestjs/common';
import { CoreModule } from './core.module';
import { ScrapingWorkerModule } from './modules/scraping/scraping-worker.module';

@Module({
  imports: [CoreModule, ScrapingWorkerModule],
})
export class WorkerModule {}
