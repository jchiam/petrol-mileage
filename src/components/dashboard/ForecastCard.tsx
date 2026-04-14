import type { Forecast } from './types'

function nextMonthLabel(): string {
  const sgt = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' }))
  const next = new Date(sgt.getFullYear(), sgt.getMonth() + 1, 1)
  return next.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })
}

function currentYearLabel(): string {
  return String(new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' })).getFullYear())
}

export function ForecastCard({ forecast }: { forecast: Forecast }) {
  const { nextMonthExpected, nextMonthLow, nextMonthHigh, annualProjection } = forecast

  if (nextMonthExpected == null && annualProjection == null) return null

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Forecast</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Next month */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Next month
          </p>
          <p className="text-sm text-gray-500 mb-3">{nextMonthLabel()}</p>
          {nextMonthExpected != null ? (
            <>
              <p className="text-3xl font-bold text-gray-900 tabular-nums leading-none mb-1">
                ${nextMonthExpected.toFixed(2)}
              </p>
              {nextMonthLow != null && nextMonthHigh != null && (
                <p className="text-sm text-gray-500">
                  Range: ${nextMonthLow.toFixed(0)} – ${nextMonthHigh.toFixed(0)}
                </p>
              )}
            </>
          ) : (
            <p className="text-gray-400 text-sm">Not enough data</p>
          )}
        </div>

        {/* Annual projection */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Annual projection
          </p>
          <p className="text-sm text-gray-500 mb-3">{currentYearLabel()}</p>
          {annualProjection != null ? (
            <p className="text-3xl font-bold text-gray-900 tabular-nums leading-none">
              ${annualProjection.toFixed(2)}
            </p>
          ) : (
            <p className="text-gray-400 text-sm">Not enough data</p>
          )}
        </div>
      </div>
    </section>
  )
}
