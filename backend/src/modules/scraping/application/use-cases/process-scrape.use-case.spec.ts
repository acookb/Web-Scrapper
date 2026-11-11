import { Logger } from '@nestjs/common';
import { PageStatus } from '../../domain/enums/page-status.enum';
import {
  PAGE_ID,
  buildPage,
  mockScrapedPageRepository,
  mockScraper,
} from '../../testing/factories';
import { ProcessScrapeUseCase } from './process-scrape.use-case';

describe('ProcessScrapeUseCase', () => {
  const repository = mockScrapedPageRepository();
  const scraper = mockScraper();
  const useCase = new ProcessScrapeUseCase(repository, scraper);
  const command = {
    pageId: PAGE_ID,
    url: 'https://example.com/',
    isFinalAttempt: false,
  };

  beforeAll(() => {
    Logger.overrideLogger(false);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findById.mockResolvedValue(
      buildPage({ status: PageStatus.IN_PROGRESS, title: null }),
    );
  });

  it('stores the title and links when scraping succeeds', async () => {
    const links = [{ href: 'https://iana.org/', name: 'IANA' }];
    scraper.scrape.mockResolvedValue({ title: 'Example Domain', links });

    await useCase.execute(command);

    expect(scraper.scrape).toHaveBeenCalledWith('https://example.com/');
    expect(repository.markCompleted).toHaveBeenCalledWith({
      pageId: PAGE_ID,
      title: 'Example Domain',
      links,
    });
    expect(repository.markFailed).not.toHaveBeenCalled();
  });

  it('falls back to the URL when the page has no title', async () => {
    scraper.scrape.mockResolvedValue({ title: '', links: [] });

    await useCase.execute(command);

    expect(repository.markCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'https://example.com/' }),
    );
  });

  it('rethrows so the queue retries when attempts remain', async () => {
    scraper.scrape.mockRejectedValue(new Error('timeout'));

    await expect(useCase.execute(command)).rejects.toThrow('timeout');
    expect(repository.markFailed).not.toHaveBeenCalled();
  });

  it('marks the page as failed on the final attempt', async () => {
    scraper.scrape.mockRejectedValue(new Error('timeout'));

    await useCase.execute({ ...command, isFinalAttempt: true });

    expect(repository.markFailed).toHaveBeenCalledWith({
      pageId: PAGE_ID,
      errorMessage: 'timeout',
    });
    expect(repository.markCompleted).not.toHaveBeenCalled();
  });

  it('skips jobs whose page no longer exists', async () => {
    repository.findById.mockResolvedValue(null);

    await useCase.execute(command);

    expect(scraper.scrape).not.toHaveBeenCalled();
  });
});
