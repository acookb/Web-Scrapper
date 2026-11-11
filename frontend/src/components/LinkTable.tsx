import type { ScrapedLink } from '../types/pages'

interface LinkTableProps {
  links: ScrapedLink[]
  isLoading?: boolean
}

export function LinkTable({ links, isLoading = false }: LinkTableProps) {
  if (isLoading) {
    return (
      <p className="text-sm text-slate-500" data-testid="links-loading">
        Loading links…
      </p>
    )
  }

  if (links.length === 0) {
    return (
      <p className="text-sm text-slate-500" data-testid="links-empty">
        No links found for this page yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded border border-slate-200 bg-white">
      <table className="min-w-full text-left text-sm" data-testid="links-table">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">URL</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <tr key={link.id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3 align-top text-slate-800">
                <span className="break-words">{link.name}</span>
              </td>
              <td className="px-4 py-3 align-top">
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-sky-700 hover:underline"
                >
                  {link.href}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
