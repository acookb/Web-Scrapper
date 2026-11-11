import { PageNotFoundError } from '../../domain/errors/page-not-found.error';
import {
  PAGE_ID,
  buildLink,
  buildPage,
  mockLinkRepository,
  mockScrapedPageRepository,
} from '../../testing/factories';
import { ListPageLinksUseCase } from './list-page-links.use-case';

describe('ListPageLinksUseCase', () => {
  const pageRepository = mockScrapedPageRepository();
  const linkRepository = mockLinkRepository();
  const useCase = new ListPageLinksUseCase(pageRepository, linkRepository);

  beforeEach(() => jest.resetAllMocks());

  it('returns the page together with a page of its links', async () => {
    const page = buildPage();
    const links = {
      items: [buildLink()],
      total: 11,
      page: 2,
      limit: 10,
      totalPages: 2,
    };
    pageRepository.findById.mockResolvedValue(page);
    linkRepository.findByPageId.mockResolvedValue(links);

    const result = await useCase.execute(PAGE_ID, { page: 2, limit: 10 });

    expect(result).toEqual({ page, links });
    expect(linkRepository.findByPageId).toHaveBeenCalledWith(PAGE_ID, {
      page: 2,
      limit: 10,
    });
  });

  it('throws PageNotFoundError for an unknown page', async () => {
    pageRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(PAGE_ID)).rejects.toBeInstanceOf(
      PageNotFoundError,
    );
    expect(linkRepository.findByPageId).not.toHaveBeenCalled();
  });
});
