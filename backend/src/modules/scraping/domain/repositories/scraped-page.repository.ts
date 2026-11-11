import type {
  PaginatedResult,
  PaginationParams,
} from '../../../../shared/pagination';
import type { ScrapedPage } from '../entities/scraped-page.entity';
import type { ScrapedLinkData } from '../services/scraper.port';

export interface CreateScrapedPageInput {
  id: string;
  url: string;
}

export interface CompleteScrapedPageInput {
  pageId: string;
  title: string;
  /** Links in document order; the order is persisted for stable pagination. */
  links: ScrapedLinkData[];
}

export interface FailScrapedPageInput {
  pageId: string;
  errorMessage: string;
}

export interface ScrapedPageRepository {
  create(input: CreateScrapedPageInput): Promise<ScrapedPage>;
  findById(id: string): Promise<ScrapedPage | null>;
  findPaginated(
    params: PaginationParams,
  ): Promise<PaginatedResult<ScrapedPage>>;
  markCompleted(input: CompleteScrapedPageInput): Promise<ScrapedPage>;
  /**
   * Moves an in-progress page to FAILED. Pages that already reached a final
   * state are left untouched; returns whether the page was updated.
   */
  markFailed(input: FailScrapedPageInput): Promise<boolean>;
  /** Fails every page still in progress that was created before `createdBefore`. */
  failStale(createdBefore: Date, errorMessage: string): Promise<number>;
}

export const SCRAPED_PAGE_REPOSITORY = Symbol('SCRAPED_PAGE_REPOSITORY');
