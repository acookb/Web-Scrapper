import { PageStatus } from '../../domain/enums/page-status.enum';
import { InvalidUrlError } from '../../domain/errors/invalid-url.error';
import {
  buildPage,
  mockScrapeQueue,
  mockScrapedPageRepository,
} from '../../testing/factories';
import { ScrapeQueueUnavailableError } from '../errors/scrape-queue-unavailable.error';
import {
  CreateScrapeJobUseCase,
  ENQUEUE_FAILED_ERROR,
} from './create-scrape-job.use-case';

describe('CreateScrapeJobUseCase', () => {
  const repository = mockScrapedPageRepository();
  const queue = mockScrapeQueue();
  const useCase = new CreateScrapeJobUseCase(repository, queue);

  beforeEach(() => jest.resetAllMocks());

  it('persists the page as in progress and enqueues it', async () => {
    const page = buildPage({ status: PageStatus.IN_PROGRESS, title: null });
    repository.create.mockResolvedValue(page);

    const result = await useCase.execute({ url: ' https://example.com ' });

    expect(repository.create).toHaveBeenCalledWith({
      id: expect.any(String) as string,
      url: 'https://example.com/',
    });
    expect(queue.enqueue).toHaveBeenCalledWith({
      pageId: page.id,
      url: page.url,
    });
    expect(result).toBe(page);
  });

  it('does not persist or enqueue an invalid URL', async () => {
    await expect(useCase.execute({ url: 'not-a-url' })).rejects.toBeInstanceOf(
      InvalidUrlError,
    );
    expect(repository.create).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('fails the page instead of orphaning it when the queue is down', async () => {
    const page = buildPage({ status: PageStatus.IN_PROGRESS });
    repository.create.mockResolvedValue(page);
    queue.enqueue.mockRejectedValue(new Error('redis down'));

    await expect(
      useCase.execute({ url: 'https://example.com' }),
    ).rejects.toBeInstanceOf(ScrapeQueueUnavailableError);
    expect(repository.markFailed).toHaveBeenCalledWith({
      pageId: page.id,
      errorMessage: ENQUEUE_FAILED_ERROR,
    });
  });
});
