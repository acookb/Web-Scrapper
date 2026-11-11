import { Link } from 'react-router-dom'
import type { ScrapedPage } from '../types/pages'
import { DataTable, cellClass } from './DataTable'

export interface BackLinkState {
  backTo: string
}

interface PageTableProps {
  pages: ScrapedPage[]
  /** URL the details view returns to, so "< Back" keeps the current page. */
  backTo?: string
}

export function PageTable({ pages, backTo = '/' }: PageTableProps) {
  const linkState: BackLinkState = { backTo }

  if (pages.length === 0) {
    return (
      <p className="text-sm text-gray-600">
        No pages scraped yet. Add a URL to get started.
      </p>
    )
  }

  return (
    <DataTable label="Scraped pages" headers={['Name', 'Total links']}>
      {pages.map((page) => (
        <tr key={page.id}>
          <td className={cellClass}>
            <Link
              to={`/pages/${page.id}`}
              state={linkState}
              className="break-words text-gray-900 hover:underline"
            >
              {page.title || page.url}
            </Link>
          </td>
          <td className={cellClass}>
            <LinkCount page={page} />
          </td>
        </tr>
      ))}
    </DataTable>
  )
}

function LinkCount({ page }: { page: ScrapedPage }) {
  switch (page.status) {
    case 'IN_PROGRESS':
      return <span className="italic text-gray-600">in progress</span>
    case 'FAILED':
      return (
        <span className="italic text-red-700" title={page.errorMessage ?? undefined}>
          failed
        </span>
      )
    case 'COMPLETED':
      return <>{page.linkCount}</>
  }
}
