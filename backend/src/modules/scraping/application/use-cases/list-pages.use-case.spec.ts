import { ListPagesUseCase } from './list-pages.use-case';
import { ScrapedPage } from '../../domain/entities/scraped-page.entity';
import type { ScrapedPageRepository } from '../../domain/repositories/scraped-page.repository';

describe('ListPagesUseCase', () => {
  const repository: jest.Mocked<ScrapedPageRepository> = {
    create: jest.fn(),
    findById: jest.fn(),
    findPaginated: jest.fn(),
    markCompleted: jest.fn(),
    markFailed: jest.fn(),
    updateStatus: jest.fn(),
  };

  it('normalizes pagination and returns repository results', async () => {
    const page = ScrapedPage.createInProgress('id', 'https://example.com');
    repository.findPaginated.mockResolvedValue({
      items: [page],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    const useCase = new ListPagesUseCase(repository);
    const result = await useCase.execute({ page: 0, limit: 500 });

    expect(repository.findPaginated).toHaveBeenCalledWith({
      page: 1,
      limit: 100,
    });
    expect(result.items).toHaveLength(1);
  });
});
