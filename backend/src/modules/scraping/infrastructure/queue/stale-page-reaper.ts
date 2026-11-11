import { Injectable, Logger } from '@nestjs/common';
import type {
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { FailStalePagesUseCase } from '../../application/use-cases/fail-stale-pages.use-case';

const SWEEP_INTERVAL_MS = 60_000;

/** Periodically fails pages that have been in progress for too long. */
@Injectable()
export class StalePageReaper
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(StalePageReaper.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly failStalePagesUseCase: FailStalePagesUseCase) {}

  onApplicationBootstrap(): void {
    void this.sweep();
    this.timer = setInterval(() => void this.sweep(), SWEEP_INTERVAL_MS);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
  }

  async sweep(): Promise<void> {
    try {
      const failed = await this.failStalePagesUseCase.execute();
      if (failed > 0) {
        this.logger.warn(`Marked ${failed} stale page(s) as failed`);
      }
    } catch (error) {
      this.logger.error(`Stale page sweep failed: ${String(error)}`);
    }
  }
}
