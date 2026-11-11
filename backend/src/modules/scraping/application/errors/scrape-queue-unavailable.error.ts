export class ScrapeQueueUnavailableError extends Error {
  constructor(cause: unknown) {
    super('The scrape queue is unavailable, please try again later', { cause });
    this.name = ScrapeQueueUnavailableError.name;
  }
}
