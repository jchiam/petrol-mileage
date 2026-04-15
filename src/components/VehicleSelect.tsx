'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, Star } from 'lucide-react'

interface VehicleOption {
  id: number
  name: string
  isActive: boolean
  isCurrent: boolean
}

interface VehicleSelectProps {
  vehicles: VehicleOption[]
  value: number | null
  onChange: (id: number) => void
  onSetCurrent?: (id: number) => void
  className?: string
}

export function VehicleSelect({ vehicles, value, onChange, onSetCurrent, className }: VehicleSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = vehicles.find((v) => v.id === value)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const label = selected
    ? selected.name + (!selected.isActive ? ' (retired)' : '')
    : '—'

  return (
    <div className={`relative ${className ?? ''}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-9 pl-3 pr-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white hover:border-gray-400 focus:outline-none focus:border-gray-900 transition-colors"
      >
        {selected?.isCurrent && (
          <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="currentColor" strokeWidth={0} />
        )}
        <span className="leading-none">{label}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-full overflow-hidden py-1">
          {vehicles.map((v) => {
            const isSelected = v.id === value
            return (
              <div key={v.id} className="flex items-center">
                {onSetCurrent && (
                  <button
                    type="button"
                    title={v.isCurrent ? 'Current car' : 'Set as current car'}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!v.isCurrent) onSetCurrent(v.id)
                    }}
                    className="pl-2 py-2 flex items-center justify-center shrink-0"
                  >
                    <Star
                      className={`w-3.5 h-3.5 transition-colors ${
                        v.isCurrent
                          ? 'text-amber-400'
                          : 'text-gray-300 hover:text-amber-300'
                      }`}
                      fill={v.isCurrent ? 'currentColor' : 'none'}
                      strokeWidth={v.isCurrent ? 0 : 1.5}
                    />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onChange(v.id)
                    setOpen(false)
                  }}
                  className="flex items-center gap-2 flex-1 px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 text-left"
                >
                  <span className="w-4 shrink-0 flex items-center justify-center">
                    {isSelected && <Check className="w-3.5 h-3.5 text-gray-900" strokeWidth={2.5} />}
                  </span>
                  <span>
                    {v.name}
                    {!v.isActive && <span className="text-gray-500 ml-1">(retired)</span>}
                  </span>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
