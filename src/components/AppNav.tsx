'use client'

import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/log', label: 'Log fill-up' },
  { href: '/admin/import', label: 'Import' },
]

export function AppNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <a href="/" className="text-sm font-bold text-gray-900 tracking-tight shrink-0">
          Petrol
        </a>
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive = pathname === href
            return (
              <a
                key={href}
                href={href}
                className={`px-2 sm:px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {label}
              </a>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
