import { Link } from '../entities/link.entity';
import {
  PaginatedResult,
  PaginationParams,
} from './scraped-page.repository';

export interface LinkRepository {
  findByPageId(
    pageId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<Link>>;
}

export const LINK_REPOSITORY = Symbol('LINK_REPOSITORY');
