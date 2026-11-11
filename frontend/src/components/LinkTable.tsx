import type { ScrapedLink } from '../types/pages'
import { DataTable, cellClass } from './DataTable'

interface LinkTableProps {
  links: ScrapedLink[]
}

/** Only web URLs are clickable; mailto:, data: and similar are shown as text. */
function isWebUrl(href: string): boolean {
  return /^https?:\/\//i.test(href)
}

export function LinkTable({ links }: LinkTableProps) {
  if (links.length === 0) {
    return <p className="text-sm text-gray-600">No links found on this page.</p>
  }

  return (
    <DataTable label="Links" headers={['Name', 'URL']}>
      {links.map((link) => (
        <tr key={link.id}>
          {/* Names may be HTML fragments; React renders them as escaped text. */}
          <td className={`${cellClass} truncate`} title={link.name}>
            {link.name}
          </td>
          <td className={`${cellClass} truncate`} title={link.href}>
            {isWebUrl(link.href) ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 hover:underline"
              >
                {link.href}
              </a>
            ) : (
              <span className="text-gray-700">{link.href}</span>
            )}
          </td>
        </tr>
      ))}
    </DataTable>
  )
}
