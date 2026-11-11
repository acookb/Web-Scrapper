import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  ScrapeJobPayload,
  ScrapeQueuePort,
} from '../../application/ports/scrape-queue.port';
import { SCRAPE_QUEUE_NAME } from './scrape.constants';

@Injectable()
export class BullMqScrapeQueueAdapter implements ScrapeQueuePort {
  constructor(
    @InjectQueue(SCRAPE_QUEUE_NAME) private readonly scrapeQueue: Queue,
  ) {}

  async enqueue(payload: ScrapeJobPayload): Promise<void> {
    await this.scrapeQueue.add('scrape', payload, {
      jobId: payload.pageId,
      removeOnComplete: 100,
      removeOnFail: 100,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
