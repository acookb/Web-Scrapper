import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ProcessScrapeUseCase } from '../../application/use-cases/process-scrape.use-case';
import { ScrapeJobPayload } from '../../application/ports/scrape-queue.port';
import { SCRAPE_QUEUE_NAME } from './scrape.constants';

@Processor(SCRAPE_QUEUE_NAME)
export class ScrapeProcessor extends WorkerHost {
  private readonly logger = new Logger(ScrapeProcessor.name);

  constructor(private readonly processScrapeUseCase: ProcessScrapeUseCase) {
    super();
  }

  async process(job: Job<ScrapeJobPayload>): Promise<void> {
    this.logger.log(
      `Processing scrape job ${job.id} for page ${job.data.pageId}`,
    );
    await this.processScrapeUseCase.execute(job.data);
  }
}
