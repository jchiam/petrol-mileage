'use client';

import { useState } from 'react';

import type { FillRow } from './types';
import { VoidDialog } from './VoidDialog';

const PAGE_SIZE = 25;

function fmtDate(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function AnomalyDot({ fill }: { fill: FillRow }) {
  if (fill.anomalies.length === 0) return null;
  const hasEfficiency = fill.anomalies.some((a) => a.type === 'efficiency');
  const title = fill.anomalies.map((a) => a.message).join('\n');
  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-flex h-2 w-2 shrink-0 cursor-help rounded-full ${
        hasEfficiency ? 'bg-red-500' : 'bg-amber-400'
      }`}
    />
  );
}

export function FillsTable({
  fills,
  onVoidSuccess,
}: {
  fills: FillRow[];
  onVoidSuccess: () => void;
}) {
  const [showVoided, setShowVoided] = useState(false);
  const [page, setPage] = useState(0);
  const [voidTarget, setVoidTarget] = useState<FillRow | null>(null);
  const [voidedMessage, setVoidedMessage] = useState<string | null>(null);

  // Newest first
  const sorted = [...fills].sort((a, b) => b.pumpDate.localeCompare(a.pumpDate) || b.id - a.id);
  const visible = showVoided ? sorted : sorted.filter((f) => !f.voidedAt);
  const pageCount = Math.ceil(visible.length / PAGE_SIZE);
  const rows = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleVoidConfirm = async (reason: string) => {
    if (!voidTarget) return;
    const res = await fetch(`/api/fills/${voidTarget.id}/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? 'Failed to void');
    }
    setVoidTarget(null);
    setVoidedMessage(`Fill-up voided. Go to /log to re-enter.`);
    setTimeout(() => setVoidedMessage(null), 5000);
    onVoidSuccess();
  };

  return (
    <>
      {voidTarget && (
        <VoidDialog
          fill={voidTarget}
          onConfirm={handleVoidConfirm}
          onClose={() => setVoidTarget(null)}
        />
      )}

      <div className="mb-3 flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-500">
          <input
            type="checkbox"
            checked={showVoided}
            onChange={(e) => {
              setShowVoided(e.target.checked);
              setPage(0);
            }}
            className="h-4 w-4 rounded"
          />
          Include voided rows
        </label>
        {pageCount > 1 && (
          <span className="text-xs text-gray-500">
            Page {page + 1} of {pageCount}
          </span>
        )}
      </div>

      {voidedMessage && (
        <p className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {voidedMessage}{' '}
          <a href="/log" className="font-medium underline">
            Log now
          </a>
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <Th>Date</Th>
              <Th>km/L</Th>
              <Th>$/km</Th>
              <Th>$/L</Th>
              <Th>km</Th>
              <Th>L</Th>
              <Th>Cost</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-gray-500">
                  No fills to show.
                </td>
              </tr>
            ) : (
              rows.map((fill) => (
                <tr
                  key={fill.id}
                  className={`border-b border-gray-50 last:border-0 ${
                    fill.voidedAt ? 'opacity-40' : 'hover:bg-gray-50'
                  }`}
                >
                  <Td>
                    <span className="whitespace-nowrap">{fmtDate(fill.pumpDate)}</span>
                    {fill.voidedAt && (
                      <span className="ml-1.5 text-xs font-medium text-red-500">voided</span>
                    )}
                  </Td>
                  <Td>
                    <span className="flex items-center gap-1.5">
                      <AnomalyDot fill={fill} />
                      {fill.kmPerL.toFixed(2)}
                    </span>
                  </Td>
                  <Td>${fill.costPerKm.toFixed(3)}</Td>
                  <Td>${fill.costPerL.toFixed(2)}</Td>
                  <Td>{parseFloat(fill.mileageKm).toFixed(1)}</Td>
                  <Td>{parseFloat(fill.petrolL).toFixed(3)}</Td>
                  <Td>${parseFloat(fill.cost).toFixed(2)}</Td>
                  <Td>
                    {!fill.voidedAt && (
                      <button
                        onClick={() => setVoidTarget(fill)}
                        className="text-xs whitespace-nowrap text-red-500 hover:text-red-700"
                      >
                        Void &amp; re-enter
                      </button>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            &larr; Prev
          </button>
          <span className="text-sm text-gray-500">
            {page + 1} / {pageCount}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={page >= pageCount - 1}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold tracking-wide whitespace-nowrap text-gray-600 uppercase">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 whitespace-nowrap text-gray-700 tabular-nums">{children}</td>;
}
