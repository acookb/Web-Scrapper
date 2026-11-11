import { NotFoundException } from '@nestjs/common';
import { ListPageLinksUseCase } from './list-page-links.use-case';
import { ScrapedPage } from '../../domain/entities/scraped-page.entity';
import { Link } from '../../domain/entities/link.entity';
import type { ScrapedPageRepository } from '../../domain/repositories/scraped-page.repository';
import type { LinkRepository } from '../../domain/repositories/link.repository';

describe('ListPageLinksUseCase', () => {
  const pageRepository: jest.Mocked<ScrapedPageRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findPaginated: jest.fn(),
    markCompleted: jest.fn(),
    markFailed: jest.fn(),
    updateStatus: jest.fn(),
  };

  const linkRepository: jest.Mocked<LinkRepository> = {
    findByPageId: jest.fn(),
  };

  it('returns page metadata and paginated links', async () => {
    const page = ScrapedPage.createInProgress('page-1', 'https://example.com');
    const link = new Link(
      'link-1',
      'page-1',
      'https://iana.org',
      'IANA',
      new Date(),
    );
    pageRepository.findById.mockResolvedValue(page);
    linkRepository.findByPageId.mockResolvedValue({
      items: [link],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    const useCase = new ListPageLinksUseCase(pageRepository, linkRepository);
    const result = await useCase.execute('page-1', { page: 1, limit: 10 });

    expect(result.page.id).toBe('page-1');
    expect(result.links.items[0].href).toBe('https://iana.org');
  });

  it('throws NotFoundException when page is missing', async () => {
    pageRepository.findById.mockResolvedValue(null);
    const useCase = new ListPageLinksUseCase(pageRepository, linkRepository);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
