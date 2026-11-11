import { mockScrapedPageRepository } from '../../testing/factories';
import {
  FailStalePagesUseCase,
  STALE_PAGE_ERROR,
} from './fail-stale-pages.use-case';

describe('FailStalePagesUseCase', () => {
  it('fails pages created before the stale timeout', async () => {
    const repository = mockScrapedPageRepository();
    repository.failStale.mockResolvedValue(2);
    const useCase = new FailStalePagesUseCase(repository, 15 * 60_000);

    const failed = await useCase.execute(new Date('2024-01-01T12:00:00.000Z'));

    expect(failed).toBe(2);
    expect(repository.failStale).toHaveBeenCalledWith(
      new Date('2024-01-01T11:45:00.000Z'),
      STALE_PAGE_ERROR,
    );
  });
});
