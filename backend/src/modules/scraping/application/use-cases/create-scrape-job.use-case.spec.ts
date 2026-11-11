import { PageStatus } from '../../domain/enums/page-status.enum';
import { InvalidUrlError } from '../../domain/errors/invalid-url.error';
import {
  buildPage,
  mockScrapeQueue,
  mockScrapedPageRepository,
} from '../../testing/factories';
import { CreateScrapeJobUseCase } from './create-scrape-job.use-case';

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

  it('propagates queue failures', async () => {
    repository.create.mockResolvedValue(buildPage());
    queue.enqueue.mockRejectedValue(new Error('redis down'));

    await expect(
      useCase.execute({ url: 'https://example.com' }),
    ).rejects.toThrow('redis down');
  });
});
