export interface ScrapedLinkData {
  href: string;
  name: string;
}

export interface ScrapeResult {
  title: string;
  links: ScrapedLinkData[];
}

export interface ScraperPort {
  scrape(url: string): Promise<ScrapeResult>;
}

export const SCRAPER_PORT = Symbol('SCRAPER_PORT');
