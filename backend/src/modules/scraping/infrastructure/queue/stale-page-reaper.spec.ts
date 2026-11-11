import { Logger } from '@nestjs/common';
import type { FailStalePagesUseCase } from '../../application/use-cases/fail-stale-pages.use-case';
import { StalePageReaper } from './stale-page-reaper';

describe('StalePageReaper', () => {
  const useCase = { execute: jest.fn() };
  const reaper = new StalePageReaper(
    useCase as unknown as FailStalePagesUseCase,
  );

  beforeAll(() => {
    Logger.overrideLogger(false);
  });
  beforeEach(() => {
    jest.useFakeTimers();
    jest.resetAllMocks();
    useCase.execute.mockResolvedValue(0);
  });
  afterEach(() => {
    reaper.onApplicationShutdown();
    jest.useRealTimers();
  });

  it('sweeps on start-up and then every minute until shutdown', () => {
    reaper.onApplicationBootstrap();
    expect(useCase.execute).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60_000);
    expect(useCase.execute).toHaveBeenCalledTimes(2);

    reaper.onApplicationShutdown();
    jest.advanceTimersByTime(120_000);
    expect(useCase.execute).toHaveBeenCalledTimes(2);
  });

  it('survives a failing sweep', async () => {
    useCase.execute.mockRejectedValue(new Error('database down'));

    await expect(reaper.sweep()).resolves.toBeUndefined();
  });
});
