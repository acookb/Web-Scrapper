import { Logger } from '@nestjs/common';
import type { Job, Worker } from 'bullmq';
import type { ScrapeJobPayload } from '../../application/ports/scrape-queue.port';
import type { MarkPageFailedUseCase } from '../../application/use-cases/mark-page-failed.use-case';
import type { ProcessScrapeUseCase } from '../../application/use-cases/process-scrape.use-case';
import { PAGE_ID } from '../../testing/factories';
import { ScrapeProcessor } from './scrape.processor';

function buildJob(
  attemptsMade: number,
  attempts?: number,
  state = 'active',
): Job<ScrapeJobPayload> {
  return {
    id: PAGE_ID,
    data: { pageId: PAGE_ID, url: 'https://example.com/' },
    attemptsMade,
    opts: { attempts },
    getState: jest.fn().mockResolvedValue(state),
  } as unknown as Job<ScrapeJobPayload>;
}

describe('ScrapeProcessor', () => {
  const processScrape = { execute: jest.fn() };
  const markPageFailed = { execute: jest.fn() };
  const processor = new ScrapeProcessor(
    processScrape as unknown as ProcessScrapeUseCase,
    markPageFailed as unknown as MarkPageFailedUseCase,
    7,
  );

  beforeAll(() => {
    Logger.overrideLogger(false);
  });
  beforeEach(() => jest.resetAllMocks());

  it('applies the configured concurrency to the worker', () => {
    const worker = { concurrency: 1 } as Worker;
    jest.spyOn(processor, 'worker', 'get').mockReturnValue(worker);

    processor.onApplicationBootstrap();

    expect(worker.concurrency).toBe(7);
  });

  it.each([
    [0, 3, false],
    [1, 3, false],
    [2, 3, true],
    [0, undefined, true],
  ])(
    'with %i previous attempts out of %p, isFinalAttempt is %p',
    async (attemptsMade, attempts, isFinalAttempt) => {
      await processor.process(buildJob(attemptsMade, attempts));

      expect(processScrape.execute).toHaveBeenCalledWith({
        pageId: PAGE_ID,
        url: 'https://example.com/',
        isFinalAttempt,
      });
    },
  );

  it('lets use case errors bubble up so BullMQ can retry', async () => {
    processScrape.execute.mockRejectedValue(new Error('timeout'));

    await expect(processor.process(buildJob(0, 3))).rejects.toThrow('timeout');
  });

  it('marks the page as failed when the job failed for good', async () => {
    await processor.onFailed(
      buildJob(1, 3, 'failed'),
      new Error('job stalled more than allowable limit'),
    );

    expect(markPageFailed.execute).toHaveBeenCalledWith({
      pageId: PAGE_ID,
      reason: 'job stalled more than allowable limit',
    });
  });

  it('ignores failures that will be retried', async () => {
    await processor.onFailed(buildJob(0, 3, 'delayed'), new Error('timeout'));

    expect(markPageFailed.execute).not.toHaveBeenCalled();
  });

  it('never throws from the failed handler', async () => {
    markPageFailed.execute.mockRejectedValue(new Error('database down'));

    await expect(
      processor.onFailed(buildJob(2, 3, 'failed'), new Error('boom')),
    ).resolves.toBeUndefined();
  });
});
