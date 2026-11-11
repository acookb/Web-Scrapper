import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { JobsOptions } from 'bullmq';
import type {
  ScrapeJobPayload,
  ScrapeQueuePort,
} from '../../application/ports/scrape-queue.port';
import {
  SCRAPE_JOB_NAME,
  SCRAPE_JOB_OPTIONS,
  SCRAPE_QUEUE_NAME,
} from './scrape.constants';

@Injectable()
export class BullMqScrapeQueueAdapter implements ScrapeQueuePort {
  constructor(
    @InjectQueue(SCRAPE_QUEUE_NAME) private readonly scrapeQueue: Queue,
    @Inject(SCRAPE_JOB_OPTIONS) private readonly jobOptions: JobsOptions,
  ) {}

  async enqueue(payload: ScrapeJobPayload): Promise<void> {
    await this.scrapeQueue.add(SCRAPE_JOB_NAME, payload, {
      ...this.jobOptions,
      jobId: payload.pageId,
    });
  }
}
