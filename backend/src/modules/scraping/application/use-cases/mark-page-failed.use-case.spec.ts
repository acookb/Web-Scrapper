import { PAGE_ID, mockScrapedPageRepository } from '../../testing/factories';
import { MarkPageFailedUseCase } from './mark-page-failed.use-case';

describe('MarkPageFailedUseCase', () => {
  const repository = mockScrapedPageRepository();
  const useCase = new MarkPageFailedUseCase(repository);

  it('fails the page with the given reason and reports whether it changed', async () => {
    repository.markFailed.mockResolvedValue(false);

    await expect(
      useCase.execute({ pageId: PAGE_ID, reason: 'stalled' }),
    ).resolves.toBe(false);
    expect(repository.markFailed).toHaveBeenCalledWith({
      pageId: PAGE_ID,
      errorMessage: 'stalled',
    });
  });
});
