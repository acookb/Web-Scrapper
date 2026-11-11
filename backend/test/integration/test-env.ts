export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://scraper:scraper@localhost:5432/scraper_test?schema=public';

export function applyTestEnv(): void {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.REDIS_HOST ??= 'localhost';
  process.env.REDIS_PORT ??= '6379';
  // Isolates the queue from any API or worker running against the same Redis.
  process.env.QUEUE_PREFIX = `test-${process.pid}-${Date.now()}`;
  // The fixture server listens on 127.0.0.1, which the SSRF guard blocks.
  process.env.SCRAPER_ALLOW_PRIVATE_HOSTS = 'true';
  process.env.SCRAPE_BACKOFF_MS = '200';
  process.env.SCRAPE_CONCURRENCY = '5';
}
