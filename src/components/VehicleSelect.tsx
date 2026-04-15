'use client';

import { Check, ChevronDown, Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface VehicleOption {
  id: number;
  name: string;
  isActive: boolean;
  isCurrent: boolean;
}

interface VehicleSelectProps {
  vehicles: VehicleOption[];
  value: number | null;
  onChange: (id: number) => void;
  onSetCurrent?: (id: number) => void;
  className?: string;
}

export function VehicleSelect({
  vehicles,
  value,
  onChange,
  onSetCurrent,
  className,
}: VehicleSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = vehicles.find((v) => v.id === value);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const label = selected ? selected.name + (!selected.isActive ? ' (retired)' : '') : '—';

  return (
    <div className={`relative ${className ?? ''}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 max-w-[180px] items-center gap-2 rounded-lg border border-gray-300 bg-white pr-2.5 pl-3 text-sm text-gray-900 transition-colors hover:border-gray-400 focus:border-gray-900 focus:outline-none sm:max-w-xs"
      >
        {selected?.isCurrent && (
          <Star
            className="h-3.5 w-3.5 shrink-0 text-amber-400"
            fill="currentColor"
            strokeWidth={0}
          />
        )}
        <span className="min-w-0 truncate leading-none">{label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 min-w-full overflow-hidden rounded-lg border border-gray-300 bg-white py-1 shadow-lg">
          {vehicles.map((v) => {
            const isSelected = v.id === value;
            return (
              <div key={v.id} className="flex items-center">
                {onSetCurrent && (
                  <button
                    type="button"
                    title={v.isCurrent ? 'Current car' : 'Set as current car'}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!v.isCurrent) onSetCurrent(v.id);
                    }}
                    className="flex shrink-0 items-center justify-center py-2 pl-2"
                  >
                    <Star
                      className={`h-3.5 w-3.5 transition-colors ${
                        v.isCurrent ? 'text-amber-400' : 'text-gray-300 hover:text-amber-300'
                      }`}
                      fill={v.isCurrent ? 'currentColor' : 'none'}
                      strokeWidth={v.isCurrent ? 0 : 1.5}
                    />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onChange(v.id);
                    setOpen(false);
                  }}
                  className="flex flex-1 items-center gap-2 px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
                >
                  <span className="flex w-4 shrink-0 items-center justify-center">
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-gray-900" strokeWidth={2.5} />
                    )}
                  </span>
                  <span>
                    {v.name}
                    {!v.isActive && <span className="ml-1 text-gray-500">(retired)</span>}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
