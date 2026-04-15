'use client'

import { useState } from 'react'
import type { FillRow } from './types'

interface VoidDialogProps {
  fill: FillRow
  onConfirm: (reason: string) => Promise<void>
  onClose: () => void
}

export function VoidDialog({ fill, onConfirm, onClose }: VoidDialogProps) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!reason.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await onConfirm(reason.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to void')
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Void fill-up</h3>
        <p className="text-sm text-gray-500 mb-4">
          {fill.pumpDate} &middot; {parseFloat(fill.petrolL).toFixed(3)} L &middot; $
          {parseFloat(fill.cost).toFixed(2)}
        </p>

        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="void-reason">
          Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          id="void-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Wrong mileage entered"
          rows={3}
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-500 focus:border-gray-900 focus:outline-none resize-none mb-4"
          autoFocus
        />

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 h-10 border-2 border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || !reason.trim()}
            className="flex-1 h-10 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Voiding…' : 'Void & re-enter'}
          </button>
        </div>
      </div>
    </div>
  )
}
