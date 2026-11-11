import { ScrapedPage } from '../entities/scraped-page.entity';
import { PageStatus } from '../enums/page-status.enum';
import { ScrapedLinkData } from '../services/scraper.port';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateScrapedPageInput {
  id: string;
  url: string;
}

export interface CompleteScrapedPageInput {
  pageId: string;
  title: string;
  links: ScrapedLinkData[];
}

export interface FailScrapedPageInput {
  pageId: string;
  errorMessage: string;
}

export interface ScrapedPageRepository {
  create(input: CreateScrapedPageInput): Promise<ScrapedPage>;
  findById(id: string): Promise<ScrapedPage | null>;
  findPaginated(params: PaginationParams): Promise<PaginatedResult<ScrapedPage>>;
  markCompleted(input: CompleteScrapedPageInput): Promise<ScrapedPage>;
  markFailed(input: FailScrapedPageInput): Promise<ScrapedPage>;
  updateStatus(id: string, status: PageStatus): Promise<void>;
}

export const SCRAPED_PAGE_REPOSITORY = Symbol('SCRAPED_PAGE_REPOSITORY');
