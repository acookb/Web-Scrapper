import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
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
  ) {}

  async enqueue(payload: ScrapeJobPayload): Promise<void> {
    await this.scrapeQueue.add(SCRAPE_JOB_NAME, payload, {
      ...SCRAPE_JOB_OPTIONS,
      jobId: payload.pageId,
    });
  }
}
