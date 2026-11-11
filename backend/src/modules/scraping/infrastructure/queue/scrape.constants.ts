import type { JobsOptions } from 'bullmq';

export const SCRAPE_QUEUE_NAME = 'scrape-page';
export const SCRAPE_JOB_NAME = 'scrape';

export const SCRAPE_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: 100,
};
