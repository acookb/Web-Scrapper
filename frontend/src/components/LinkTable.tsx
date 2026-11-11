import type { ScrapedLink } from '../types/pages'
import { DataTable, cellClass } from './DataTable'

interface LinkTableProps {
  links: ScrapedLink[]
}

export function LinkTable({ links }: LinkTableProps) {
  if (links.length === 0) {
    return <p className="text-sm text-gray-600">No links found on this page.</p>
  }

  return (
    <DataTable label="Links" headers={['Name', 'URL']}>
      {links.map((link) => (
        <tr key={link.id}>
          {/* Names may be raw HTML fragments; React renders them as escaped text. */}
          <td className={`${cellClass} truncate`} title={link.name}>
            {link.name}
          </td>
          <td className={`${cellClass} truncate`}>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              title={link.href}
              className="text-gray-900 hover:underline"
            >
              {link.href}
            </a>
          </td>
        </tr>
      ))}
    </DataTable>
  )
}
