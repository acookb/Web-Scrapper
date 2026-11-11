import { buildPaginatedResult, normalizePagination } from './pagination';

describe('normalizePagination', () => {
  it('uses defaults when values are missing', () => {
    expect(normalizePagination()).toEqual({ page: 1, limit: 10 });
  });

  it('clamps out-of-range values', () => {
    expect(normalizePagination(0, 500)).toEqual({ page: 1, limit: 100 });
    expect(normalizePagination(-3, -1)).toEqual({ page: 1, limit: 1 });
  });

  it('truncates fractional values', () => {
    expect(normalizePagination(2.7, 5.9)).toEqual({ page: 2, limit: 5 });
  });
});

describe('buildPaginatedResult', () => {
  it('computes the number of pages', () => {
    expect(buildPaginatedResult(['a'], 21, 1, 10).totalPages).toBe(3);
  });

  it('returns zero pages for an empty result', () => {
    expect(buildPaginatedResult([], 0, 1, 10).totalPages).toBe(0);
  });
});
