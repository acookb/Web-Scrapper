import type { JobsOptions } from 'bullmq';
import type { EnvironmentVariables } from '../../../../config/environment';

export const SCRAPE_QUEUE_NAME = 'scrape-page';
export const SCRAPE_JOB_NAME = 'scrape';

export const SCRAPE_JOB_OPTIONS = Symbol('SCRAPE_JOB_OPTIONS');
export const SCRAPE_CONCURRENCY = Symbol('SCRAPE_CONCURRENCY');

export function scrapeJobOptionsFromEnv(
  env: Pick<EnvironmentVariables, 'SCRAPE_ATTEMPTS' | 'SCRAPE_BACKOFF_MS'>,
): JobsOptions {
  return {
    attempts: env.SCRAPE_ATTEMPTS,
    backoff: { type: 'exponential', delay: env.SCRAPE_BACKOFF_MS },
    removeOnComplete: 100,
    removeOnFail: 100,
  };
}
