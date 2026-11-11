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

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export function normalizePagination(
  page?: number,
  limit?: number,
): PaginationParams {
  return {
    page: Math.max(1, Math.trunc(Number(page)) || 1),
    limit: Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Math.trunc(Number(limit)) || DEFAULT_PAGE_SIZE),
    ),
  };
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
