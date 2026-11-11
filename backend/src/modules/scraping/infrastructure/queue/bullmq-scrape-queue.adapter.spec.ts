import type { Queue } from 'bullmq';
import { PAGE_ID } from '../../testing/factories';
import { BullMqScrapeQueueAdapter } from './bullmq-scrape-queue.adapter';
import { SCRAPE_JOB_NAME, SCRAPE_JOB_OPTIONS } from './scrape.constants';

describe('BullMqScrapeQueueAdapter', () => {
  it('adds a retryable job keyed by the page id', async () => {
    const queue = { add: jest.fn() };
    const adapter = new BullMqScrapeQueueAdapter(queue as unknown as Queue);
    const payload = { pageId: PAGE_ID, url: 'https://example.com/' };

    await adapter.enqueue(payload);

    expect(queue.add).toHaveBeenCalledWith(SCRAPE_JOB_NAME, payload, {
      ...SCRAPE_JOB_OPTIONS,
      jobId: PAGE_ID,
    });
    expect(SCRAPE_JOB_OPTIONS.attempts).toBeGreaterThan(1);
  });
});
