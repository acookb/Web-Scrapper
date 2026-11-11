import type { EnvironmentVariables } from '../../../../config/environment';

export const SCRAPER_OPTIONS = Symbol('SCRAPER_OPTIONS');

export interface ScraperOptions {
  timeoutMs: number;
  maxBytes: number;
  maxRedirects: number;
  /** Disables the SSRF guard; only meant for tests against local servers. */
  allowPrivateHosts: boolean;
}

export function scraperOptionsFromEnv(
  env: EnvironmentVariables,
): ScraperOptions {
  return {
    timeoutMs: env.SCRAPER_TIMEOUT_MS,
    maxBytes: env.SCRAPER_MAX_BYTES,
    maxRedirects: 5,
    allowPrivateHosts: env.SCRAPER_ALLOW_PRIVATE_HOSTS,
  };
}
