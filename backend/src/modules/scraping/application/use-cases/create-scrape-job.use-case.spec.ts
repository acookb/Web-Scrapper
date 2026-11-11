import { CreateScrapeJobUseCase } from './create-scrape-job.use-case';
import { ScrapedPage } from '../../domain/entities/scraped-page.entity';
import { PageStatus } from '../../domain/enums/page-status.enum';
import type { ScrapedPageRepository } from '../../domain/repositories/scraped-page.repository';
import type { ScrapeQueuePort } from '../ports/scrape-queue.port';

describe('CreateScrapeJobUseCase', () => {
  const repository: jest.Mocked<ScrapedPageRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findPaginated: jest.fn(),
    markCompleted: jest.fn(),
    markFailed: jest.fn(),
    updateStatus: jest.fn(),
  };

  const queue: jest.Mocked<ScrapeQueuePort> = {
    enqueue: jest.fn(),
  };

  let useCase: CreateScrapeJobUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateScrapeJobUseCase(repository, queue);
  });

  it('creates a page in progress and enqueues a scrape job', async () => {
    const page = ScrapedPage.createInProgress(
      '11111111-1111-1111-1111-111111111111',
      'https://example.com/',
    );
    repository.create.mockResolvedValue(page);
    queue.enqueue.mockResolvedValue(undefined);

    const result = await useCase.execute({ url: 'https://example.com' });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://example.com/',
      }),
    );
    expect(queue.enqueue).toHaveBeenCalledWith({
      pageId: page.id,
      url: page.url,
    });
    expect(result.status).toBe(PageStatus.IN_PROGRESS);
  });

  it('rejects invalid URLs', async () => {
    await expect(useCase.execute({ url: 'not-a-url' })).rejects.toThrow(
      'Invalid URL',
    );
    expect(repository.create).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('rejects non-http protocols', async () => {
    await expect(useCase.execute({ url: 'ftp://files.example.com' })).rejects.toThrow(
      'Only HTTP and HTTPS URLs are supported',
    );
  });
});
