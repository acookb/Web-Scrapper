import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { OnApplicationBootstrap } from '@nestjs/common';
import { Job } from 'bullmq';
import type { ScrapeJobPayload } from '../../application/ports/scrape-queue.port';
import { MarkPageFailedUseCase } from '../../application/use-cases/mark-page-failed.use-case';
import { ProcessScrapeUseCase } from '../../application/use-cases/process-scrape.use-case';
import { SCRAPE_CONCURRENCY, SCRAPE_QUEUE_NAME } from './scrape.constants';

@Processor(SCRAPE_QUEUE_NAME)
export class ScrapeProcessor
  extends WorkerHost
  implements OnApplicationBootstrap
{
  private readonly logger = new Logger(ScrapeProcessor.name);

  constructor(
    private readonly processScrapeUseCase: ProcessScrapeUseCase,
    private readonly markPageFailedUseCase: MarkPageFailedUseCase,
    @Inject(SCRAPE_CONCURRENCY) private readonly concurrency: number,
  ) {
    super();
  }

  /** Several pages are scraped in parallel so a slow site never blocks the queue. */
  onApplicationBootstrap(): void {
    this.worker.concurrency = this.concurrency;
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

  /**
   * Covers failures that never reach the use case's own error handling, such
   * as a job that stalled because its worker crashed. Jobs that will be
   * retried are still in the queue and are ignored.
   */
  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<ScrapeJobPayload> | undefined,
    error: Error,
  ): Promise<void> {
    if (!job || (await job.getState()) !== 'failed') {
      return;
    }

    try {
      await this.markPageFailedUseCase.execute({
        pageId: job.data.pageId,
        reason: error.message,
      });
    } catch (markError) {
      this.logger.error(
        `Could not mark page ${job.data.pageId} as failed: ${String(markError)}`,
      );
    }
  }
}
