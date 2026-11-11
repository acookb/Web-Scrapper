import type { ReactNode } from 'react'

interface DataTableProps {
  headers: [string, string]
  children: ReactNode
  label: string
}

/** Two-column bordered table matching the wireframes. */
export function DataTable({ headers, children, label }: DataTableProps) {
  return (
    <table
      aria-label={label}
      className="w-full table-fixed border-collapse border border-gray-400 text-left text-sm"
    >
      <thead className="bg-gray-300 text-gray-800">
        <tr>
          {headers.map((header) => (
            <th key={header} className="border border-gray-400 px-3 py-2 font-medium">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="[&>tr:nth-child(even)]:bg-gray-200 [&>tr:nth-child(odd)]:bg-gray-100">
        {children}
      </tbody>
    </table>
  )
}

export const cellClass = 'border border-gray-400 px-3 py-2 align-top'
