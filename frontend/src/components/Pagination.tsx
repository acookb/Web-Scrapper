import { visiblePageNumbers } from '../utils/pagination'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

const buttonClass =
  'min-w-9 border border-gray-400 bg-gray-100 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50'

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <nav aria-label="Pagination" className="mt-8 flex justify-center gap-2">
      <button
        type="button"
        className={buttonClass}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      {visiblePageNumbers(page, totalPages).map((pageNumber) => (
        <button
          key={pageNumber}
          type="button"
          aria-label={`Page ${pageNumber}`}
          aria-current={pageNumber === page ? 'page' : undefined}
          className={`${buttonClass} aria-[current=page]:bg-gray-700 aria-[current=page]:text-white`}
          onClick={() => onPageChange(pageNumber)}
        >
          {pageNumber}
        </button>
      ))}
      <button
        type="button"
        className={buttonClass}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </nav>
  )
}
