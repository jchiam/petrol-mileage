import type { Forecast } from './types';

function nextMonthLabel(): string {
  const sgt = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
  const next = new Date(sgt.getFullYear(), sgt.getMonth() + 1, 1);
  return next.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' });
}

function currentYearLabel(): string {
  return String(
    new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' })).getFullYear(),
  );
}

export function ForecastCard({ forecast }: { forecast: Forecast }) {
  const { nextMonthExpected, nextMonthLow, nextMonthHigh, annualProjection } = forecast;

  if (nextMonthExpected == null && annualProjection == null) return null;

  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold tracking-wide text-gray-600 uppercase">Forecast</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Next month */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-semibold tracking-wide text-gray-600 uppercase">
            Next month
          </p>
          <p className="mb-3 text-sm text-gray-500">{nextMonthLabel()}</p>
          {nextMonthExpected != null ? (
            <>
              <p className="mb-1 text-3xl leading-none font-bold text-gray-900 tabular-nums">
                ${nextMonthExpected.toFixed(2)}
              </p>
              {nextMonthLow != null && nextMonthHigh != null && (
                <p className="text-sm text-gray-500">
                  Range: ${nextMonthLow.toFixed(0)} – ${nextMonthHigh.toFixed(0)}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">Not enough data</p>
          )}
        </div>

        {/* Annual projection */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="mb-1 text-xs font-semibold tracking-wide text-gray-600 uppercase">
            Annual projection
          </p>
          <p className="mb-3 text-sm text-gray-500">{currentYearLabel()}</p>
          {annualProjection != null ? (
            <p className="text-3xl leading-none font-bold text-gray-900 tabular-nums">
              ${annualProjection.toFixed(2)}
            </p>
          ) : (
            <p className="text-sm text-gray-500">Not enough data</p>
          )}
        </div>
      </div>
    </section>
  );
}
