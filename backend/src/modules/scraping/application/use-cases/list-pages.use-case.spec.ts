import { buildPage, mockScrapedPageRepository } from '../../testing/factories';
import { ListPagesUseCase } from './list-pages.use-case';

describe('ListPagesUseCase', () => {
  const repository = mockScrapedPageRepository();
  const useCase = new ListPagesUseCase(repository);

  beforeEach(() => jest.resetAllMocks());

  it('returns the repository page for normalized pagination params', async () => {
    const result = {
      items: [buildPage()],
      total: 1,
      page: 1,
      limit: 100,
      totalPages: 1,
    };
    repository.findPaginated.mockResolvedValue(result);

    await expect(useCase.execute({ page: 0, limit: 500 })).resolves.toBe(
      result,
    );
    expect(repository.findPaginated).toHaveBeenCalledWith({
      page: 1,
      limit: 100,
    });
  });

  it('uses default pagination when none is given', async () => {
    await useCase.execute();

    expect(repository.findPaginated).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
    });
  });
});
