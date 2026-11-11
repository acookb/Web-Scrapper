import type {
  PaginatedResult,
  PaginationParams,
} from '../../../../shared/pagination';
import type { Link } from '../entities/link.entity';

export interface LinkRepository {
  findByPageId(
    pageId: string,
    params: PaginationParams,
  ): Promise<PaginatedResult<Link>>;
}

export const LINK_REPOSITORY = Symbol('LINK_REPOSITORY');
