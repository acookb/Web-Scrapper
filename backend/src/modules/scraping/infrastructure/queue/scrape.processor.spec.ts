import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { ScrapeJobPayload } from '../../application/ports/scrape-queue.port';
import type { ProcessScrapeUseCase } from '../../application/use-cases/process-scrape.use-case';
import { PAGE_ID } from '../../testing/factories';
import { ScrapeProcessor } from './scrape.processor';

function buildJob(
  attemptsMade: number,
  attempts?: number,
): Job<ScrapeJobPayload> {
  return {
    id: PAGE_ID,
    data: { pageId: PAGE_ID, url: 'https://example.com/' },
    attemptsMade,
    opts: { attempts },
  } as Job<ScrapeJobPayload>;
}

describe('ScrapeProcessor', () => {
  const useCase = { execute: jest.fn() };
  const processor = new ScrapeProcessor(
    useCase as unknown as ProcessScrapeUseCase,
  );

  beforeAll(() => {
    Logger.overrideLogger(false);
  });
  beforeEach(() => jest.resetAllMocks());

  it.each([
    [0, 3, false],
    [1, 3, false],
    [2, 3, true],
    [0, undefined, true],
  ])(
    'with %i previous attempts out of %p, isFinalAttempt is %p',
    async (attemptsMade, attempts, isFinalAttempt) => {
      await processor.process(buildJob(attemptsMade, attempts));

      expect(useCase.execute).toHaveBeenCalledWith({
        pageId: PAGE_ID,
        url: 'https://example.com/',
        isFinalAttempt,
      });
    },
  );

  it('lets use case errors bubble up so BullMQ can retry', async () => {
    useCase.execute.mockRejectedValue(new Error('timeout'));

    await expect(processor.process(buildJob(0, 3))).rejects.toThrow('timeout');
  });
});
