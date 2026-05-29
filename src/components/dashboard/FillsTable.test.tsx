import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FillsTable } from './FillsTable';
import type { FillRow } from './types';

function makeFill(over: Partial<FillRow> = {}): FillRow {
  return {
    id: 1,
    vehicleId: 1,
    pumpDate: '2024-01-15',
    petrolL: '40.000',
    mileageKm: '500.0',
    cost: '80.00',
    voidedAt: null,
    voidReason: null,
    createdAt: '2024-01-15T00:00:00.000Z',
    kmPerL: 12.5,
    costPerKm: 0.16,
    costPerL: 2,
    anomalies: [],
    ...over,
  };
}

describe('FillsTable', () => {
  it('renders column headers', () => {
    render(<FillsTable fills={[makeFill()]} onVoidSuccess={vi.fn()} />);
    expect(screen.getByRole('columnheader', { name: 'Date' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'km/L' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Cost' })).toBeInTheDocument();
  });

  it('hides voided rows by default', () => {
    const fills = [
      makeFill({ id: 1, voidedAt: null }),
      makeFill({ id: 2, voidedAt: '2024-01-02T00:00:00Z' }),
    ];
    render(<FillsTable fills={fills} onVoidSuccess={vi.fn()} />);
    expect(screen.queryByText('voided')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Void & re-enter' })).toHaveLength(1);
  });

  it('shows voided rows when checkbox is checked', async () => {
    const user = userEvent.setup();
    const fills = [
      makeFill({ id: 1, voidedAt: null }),
      makeFill({ id: 2, voidedAt: '2024-01-02T00:00:00Z' }),
    ];
    render(<FillsTable fills={fills} onVoidSuccess={vi.fn()} />);
    await user.click(screen.getByLabelText('Include voided rows'));
    expect(screen.getByText('voided')).toBeInTheDocument();
  });

  it('renders anomaly dot with aria-label when fill has anomaly', () => {
    const fill = makeFill({
      anomalies: [{ type: 'efficiency', message: 'km/L of 5 is 3σ below mean of 12' }],
    });
    render(<FillsTable fills={[fill]} onVoidSuccess={vi.fn()} />);
    expect(screen.getByLabelText(/km\/L of 5/)).toBeInTheDocument();
  });

  it('paginates with 25 per page — Prev disabled on page 1, Next disabled on last', async () => {
    const user = userEvent.setup();
    const fills = Array.from({ length: 30 }, (_, i) =>
      makeFill({
        id: i + 1,
        pumpDate: `2024-0${1 + Math.floor(i / 28)}-${String((i % 28) + 1).padStart(2, '0')}`,
      }),
    );
    render(<FillsTable fills={fills} onVoidSuccess={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Prev/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Next/ })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /Next/ }));
    expect(screen.getByRole('button', { name: /Prev/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Next/ })).toBeDisabled();
  });

  it('opens void dialog when "Void & re-enter" clicked', async () => {
    const user = userEvent.setup();
    render(<FillsTable fills={[makeFill()]} onVoidSuccess={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Void & re-enter' }));
    const dialog = screen.getByRole('heading', { name: 'Void fill-up' }).closest('div')!;
    expect(within(dialog as HTMLElement).getByText(/2024-01-15/)).toBeInTheDocument();
  });
});
