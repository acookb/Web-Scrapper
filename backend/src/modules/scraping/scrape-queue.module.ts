import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EnvironmentVariables } from '../../config/environment';
import { SCRAPE_QUEUE_PORT } from './application/ports/scrape-queue.port';
import { BullMqScrapeQueueAdapter } from './infrastructure/queue/bullmq-scrape-queue.adapter';
import {
  SCRAPE_JOB_OPTIONS,
  SCRAPE_QUEUE_NAME,
  scrapeJobOptionsFromEnv,
} from './infrastructure/queue/scrape.constants';

/** Producer side of the scrape queue, used by the HTTP API. */
@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: SCRAPE_QUEUE_NAME,
      inject: [EnvironmentVariables],
      useFactory: (env: EnvironmentVariables) => ({
        prefix: env.QUEUE_PREFIX,
        connection: {
          host: env.REDIS_HOST,
          port: env.REDIS_PORT,
          // Fail fast instead of buffering commands while Redis is down, so
          // POST /pages can answer 503 rather than hang.
          enableOfflineQueue: false,
        },
      }),
    }),
  ],
  providers: [
    {
      provide: SCRAPE_JOB_OPTIONS,
      inject: [EnvironmentVariables],
      useFactory: scrapeJobOptionsFromEnv,
    },
    { provide: SCRAPE_QUEUE_PORT, useClass: BullMqScrapeQueueAdapter },
  ],
  exports: [SCRAPE_QUEUE_PORT, BullModule],
})
export class ScrapeQueueModule {}
