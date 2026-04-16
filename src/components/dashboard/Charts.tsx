'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { ChartData } from './types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtFillDate(d: string): string {
  const parts = d.split('-');
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  return `${day} ${MONTHS[month - 1]}`;
}

function fmtMonth(m: string): string {
  const parts = m.split('-');
  const year = parts[0];
  const month = parseInt(parts[1], 10);
  return `${MONTHS[month - 1]} '${year.slice(2)}`;
}

const GRID = { strokeDasharray: '3 3', stroke: '#F3F4F6' };
const AXIS_TICK = { fontSize: 11, fill: '#9CA3AF' };

export default function Charts({ charts }: { charts: ChartData }) {
  const { fills, monthlySpend } = charts;

  if (fills.length === 0) {
    return <p className="py-4 text-sm text-gray-500">No fill data to chart.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* km/L over time + 5-fill rolling average */}
      <ChartCard title="km/L over time">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={fills} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtFillDate}
              tick={AXIS_TICK}
              interval="preserveStartEnd"
              minTickGap={60}
            />
            <YAxis
              tickFormatter={(v: number) => v.toFixed(1)}
              tick={AXIS_TICK}
              domain={['auto', 'auto']}
              width={36}
            />
            <Tooltip
              labelFormatter={(l) => fmtFillDate(String(l))}
              formatter={(v, name) => [`${Number(v ?? 0).toFixed(2)}`, name as string]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="kmPerL"
              stroke="#3B82F6"
              strokeWidth={1.5}
              dot={{ r: 2, fill: '#3B82F6' }}
              activeDot={{ r: 4 }}
              name="km/L"
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="rolling5"
              stroke="#F97316"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="5-fill avg"
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* $/km over time */}
      <ChartCard title="$/km over time">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={fills} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtFillDate}
              tick={AXIS_TICK}
              interval="preserveStartEnd"
              minTickGap={60}
            />
            <YAxis
              tickFormatter={(v: number) => `$${v.toFixed(3)}`}
              tick={AXIS_TICK}
              domain={['auto', 'auto']}
              width={54}
            />
            <Tooltip
              labelFormatter={(l) => fmtFillDate(String(l))}
              formatter={(v) => [`$${Number(v).toFixed(3)}`, '$/km']}
            />
            <Line
              type="monotone"
              dataKey="costPerKm"
              stroke="#10B981"
              strokeWidth={1.5}
              dot={{ r: 2, fill: '#10B981' }}
              activeDot={{ r: 4 }}
              name="$/km"
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Monthly spend */}
      <ChartCard title="Monthly spend">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlySpend} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis
              dataKey="month"
              tickFormatter={fmtMonth}
              tick={AXIS_TICK}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis tickFormatter={(v: number) => `$${v.toFixed(0)}`} tick={AXIS_TICK} width={54} />
            <Tooltip
              labelFormatter={(l) => fmtMonth(String(l))}
              formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Spend']}
            />
            <Bar dataKey="spend" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Spend" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="mb-4 text-sm font-semibold text-gray-700">{title}</p>
      {children}
    </div>
  );
}
