import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ProcessScrapeUseCase } from '../../application/use-cases/process-scrape.use-case';
import type { ScrapeJobPayload } from '../../application/ports/scrape-queue.port';
import { SCRAPE_QUEUE_NAME } from './scrape.constants';

@Processor(SCRAPE_QUEUE_NAME)
export class ScrapeProcessor extends WorkerHost {
  private readonly logger = new Logger(ScrapeProcessor.name);

  constructor(private readonly processScrapeUseCase: ProcessScrapeUseCase) {
    super();
  }

  async process(job: Job<ScrapeJobPayload>): Promise<void> {
    const maxAttempts = job.opts.attempts ?? 1;
    const currentAttempt = job.attemptsMade + 1;

    this.logger.log(
      `Processing page ${job.data.pageId} (attempt ${currentAttempt}/${maxAttempts})`,
    );

    await this.processScrapeUseCase.execute({
      pageId: job.data.pageId,
      url: job.data.url,
      isFinalAttempt: currentAttempt >= maxAttempts,
    });
  }
}
