'use client';

import { useState } from 'react';

import type { FillRow } from './types';

interface VoidDialogProps {
  fill: FillRow;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

export function VoidDialog({ fill, onConfirm, onClose }: VoidDialogProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to void');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-semibold text-gray-900">Void fill-up</h3>
        <p className="mb-4 text-sm text-gray-500">
          {fill.pumpDate} &middot; {parseFloat(fill.petrolL).toFixed(3)} L &middot; $
          {parseFloat(fill.cost).toFixed(2)}
        </p>

        <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="void-reason">
          Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          id="void-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Wrong mileage entered"
          rows={3}
          className="mb-4 w-full resize-none rounded-xl border-2 border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-gray-900 focus:outline-none"
          autoFocus
        />

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="h-10 flex-1 rounded-xl border-2 border-gray-300 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting || !reason.trim()}
            className="h-10 flex-1 rounded-xl bg-red-600 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? 'Voiding…' : 'Void & re-enter'}
          </button>
        </div>
      </div>
    </div>
  );
}
