/**
 * A scrape that cannot succeed by retrying (e.g. 404, non-HTML content or a
 * blocked destination). Any other error raised by a scraper is retryable.
 */
export class PermanentScrapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = PermanentScrapeError.name;
  }
}
