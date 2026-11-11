const MAX_VISIBLE_PAGES = 5

/** Up to five consecutive page numbers, centred on the current page when possible. */
export function visiblePageNumbers(page: number, totalPages: number): number[] {
  const count = Math.min(MAX_VISIBLE_PAGES, totalPages)
  const first = Math.min(
    Math.max(1, page - Math.floor(count / 2)),
    totalPages - count + 1,
  )
  return Array.from({ length: count }, (_, index) => first + index)
}
