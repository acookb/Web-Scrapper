import { Link } from '../domain/entities/link.entity';
import { ScrapedPage } from '../domain/entities/scraped-page.entity';
import { PageStatus } from '../domain/enums/page-status.enum';
import type { LinkRepository } from '../domain/repositories/link.repository';
import type { ScrapedPageRepository } from '../domain/repositories/scraped-page.repository';
import type { ScraperPort } from '../domain/services/scraper.port';
import type { ScrapeQueuePort } from '../application/ports/scrape-queue.port';

export const PAGE_ID = '11111111-1111-4111-8111-111111111111';
const FIXED_DATE = new Date('2024-01-01T00:00:00.000Z');

export function buildPage(overrides: Partial<ScrapedPage> = {}): ScrapedPage {
  const page = {
    id: PAGE_ID,
    url: 'https://example.com/',
    title: 'Example Domain',
    status: PageStatus.COMPLETED,
    linkCount: 1,
    errorMessage: null,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    ...overrides,
  };
  return new ScrapedPage(
    page.id,
    page.url,
    page.title,
    page.status,
    page.linkCount,
    page.errorMessage,
    page.createdAt,
    page.updatedAt,
  );
}

export function buildLink(overrides: Partial<Link> = {}): Link {
  return new Link(
    overrides.id ?? 'link-1',
    overrides.pageId ?? PAGE_ID,
    overrides.href ?? 'https://www.iana.org/domains/example',
    overrides.name ?? 'More information...',
    overrides.createdAt ?? FIXED_DATE,
  );
}

export function mockScrapedPageRepository(): jest.Mocked<ScrapedPageRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findPaginated: jest.fn(),
    markCompleted: jest.fn(),
    markFailed: jest.fn(),
  };
}

export function mockLinkRepository(): jest.Mocked<LinkRepository> {
  return { findByPageId: jest.fn() };
}

export function mockScraper(): jest.Mocked<ScraperPort> {
  return { scrape: jest.fn() };
}

export function mockScrapeQueue(): jest.Mocked<ScrapeQueuePort> {
  return { enqueue: jest.fn() };
}
