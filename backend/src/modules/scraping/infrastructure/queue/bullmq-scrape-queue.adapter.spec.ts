import type { Queue } from 'bullmq';
import { PAGE_ID } from '../../testing/factories';
import { BullMqScrapeQueueAdapter } from './bullmq-scrape-queue.adapter';
import { SCRAPE_JOB_NAME, scrapeJobOptionsFromEnv } from './scrape.constants';

describe('scrapeJobOptionsFromEnv', () => {
  it('builds retryable job options with exponential back-off', () => {
    expect(
      scrapeJobOptionsFromEnv({ SCRAPE_ATTEMPTS: 4, SCRAPE_BACKOFF_MS: 500 }),
    ).toMatchObject({
      attempts: 4,
      backoff: { type: 'exponential', delay: 500 },
    });
  });
});

describe('BullMqScrapeQueueAdapter', () => {
  it('adds a job keyed by the page id with the configured options', async () => {
    const queue = { add: jest.fn() };
    const options = { attempts: 3 };
    const adapter = new BullMqScrapeQueueAdapter(
      queue as unknown as Queue,
      options,
    );
    const payload = { pageId: PAGE_ID, url: 'https://example.com/' };

    await adapter.enqueue(payload);

    expect(queue.add).toHaveBeenCalledWith(SCRAPE_JOB_NAME, payload, {
      attempts: 3,
      jobId: PAGE_ID,
    });
  });
});
