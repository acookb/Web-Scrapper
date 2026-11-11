interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <div
      className="mt-4 flex items-center justify-end gap-3"
      data-testid="pagination"
    >
      <button
        type="button"
        className="rounded border border-slate-300 bg-white px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <span className="text-sm text-slate-600">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="rounded border border-slate-300 bg-white px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </div>
  )
}
