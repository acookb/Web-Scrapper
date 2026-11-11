export interface ScrapeJobPayload {
  pageId: string;
  url: string;
}

export interface ScrapeQueuePort {
  enqueue(payload: ScrapeJobPayload): Promise<void>;
}

export const SCRAPE_QUEUE_PORT = Symbol('SCRAPE_QUEUE_PORT');
