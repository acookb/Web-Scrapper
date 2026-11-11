import { Link } from 'react-router-dom'
import type { ScrapedPageSummary } from '../types/pages'

interface PageTableProps {
  pages: ScrapedPageSummary[]
  isLoading?: boolean
}

export function PageTable({ pages, isLoading = false }: PageTableProps) {
  if (isLoading) {
    return (
      <p className="text-sm text-slate-500" data-testid="pages-loading">
        Loading pages…
      </p>
    )
  }

  if (pages.length === 0) {
    return (
      <p className="text-sm text-slate-500" data-testid="pages-empty">
        No pages scraped yet. Add a URL to get started.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm" data-testid="pages-table">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium"># of Links</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <tr key={page.id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3">
                <Link
                  to={`/pages/${page.id}`}
                  className="text-sky-700 hover:underline"
                >
                  {page.title || page.url}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-700">
                {page.status === 'IN_PROGRESS' ? (
                  <span className="italic text-amber-700">in progress</span>
                ) : page.status === 'FAILED' ? (
                  <span className="italic text-red-600">failed</span>
                ) : (
                  page.linkCount
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
