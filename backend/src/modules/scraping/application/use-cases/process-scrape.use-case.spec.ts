import { ProcessScrapeUseCase } from './process-scrape.use-case';
import { ScrapedPage } from '../../domain/entities/scraped-page.entity';
import type { ScrapedPageRepository } from '../../domain/repositories/scraped-page.repository';
import type { ScraperPort } from '../../domain/services/scraper.port';

describe('ProcessScrapeUseCase', () => {
  const repository: jest.Mocked<ScrapedPageRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findPaginated: jest.fn(),
    markCompleted: jest.fn(),
    markFailed: jest.fn(),
    updateStatus: jest.fn(),
  };

  const scraper: jest.Mocked<ScraperPort> = {
    scrape: jest.fn(),
  };

  let useCase: ProcessScrapeUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ProcessScrapeUseCase(repository, scraper);
  });

  it('marks the page as completed when scraping succeeds', async () => {
    const page = ScrapedPage.createInProgress(
      'page-1',
      'https://example.com',
    );
    repository.findById.mockResolvedValue(page);
    scraper.scrape.mockResolvedValue({
      title: 'Example Domain',
      links: [{ href: 'https://iana.org', name: 'IANA' }],
    });
    repository.markCompleted.mockResolvedValue(page);

    await useCase.execute({ pageId: 'page-1', url: 'https://example.com' });

    expect(scraper.scrape).toHaveBeenCalledWith('https://example.com');
    expect(repository.markCompleted).toHaveBeenCalledWith({
      pageId: 'page-1',
      title: 'Example Domain',
      links: [{ href: 'https://iana.org', name: 'IANA' }],
    });
    expect(repository.markFailed).not.toHaveBeenCalled();
  });

  it('marks the page as failed when scraping throws', async () => {
    const page = ScrapedPage.createInProgress(
      'page-2',
      'https://example.com',
    );
    repository.findById.mockResolvedValue(page);
    scraper.scrape.mockRejectedValue(new Error('timeout'));
    repository.markFailed.mockResolvedValue(page);

    await useCase.execute({ pageId: 'page-2', url: 'https://example.com' });

    expect(repository.markFailed).toHaveBeenCalledWith({
      pageId: 'page-2',
      errorMessage: 'timeout',
    });
    expect(repository.markCompleted).not.toHaveBeenCalled();
  });

  it('skips processing when the page does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await useCase.execute({ pageId: 'missing', url: 'https://example.com' });

    expect(scraper.scrape).not.toHaveBeenCalled();
  });
});
