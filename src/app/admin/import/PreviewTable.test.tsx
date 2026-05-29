import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ParsedRow } from '@/lib/import-parser';

import { PreviewTable } from './PreviewTable';

const validRow: ParsedRow = {
  sheetRow: 1,
  pump_date: '2024-01-01',
  petrol_l: 40,
  mileage_km: 500,
  cost: 80,
  valid: true,
};

const invalidRow: ParsedRow = {
  sheetRow: 2,
  pump_date: '',
  petrol_l: null,
  mileage_km: null,
  cost: null,
  valid: false,
  invalidReason: 'Unparseable date',
};

describe('PreviewTable', () => {
  it('renders X of Y rows selected summary', () => {
    const selected = new Set([1]);
    const { container } = render(
      <PreviewTable
        rows={[validRow, invalidRow]}
        selected={selected}
        onToggle={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );
    // Text is split across <span>; check the <p> textContent directly.
    const summary = container.querySelector('p');
    expect(summary?.textContent).toMatch(/1\s+of\s+2\s+rows selected/);
    expect(summary?.textContent).toMatch(/1 invalid/);
  });

  it('styles invalid rows with red background and shows reason', () => {
    render(
      <PreviewTable
        rows={[validRow, invalidRow]}
        selected={new Set([1])}
        onToggle={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );
    expect(screen.getByText('Unparseable date')).toBeInTheDocument();
    expect(document.querySelector('tr.bg-red-50')).toBeInTheDocument();
  });

  it('disables checkbox for invalid row', () => {
    render(
      <PreviewTable
        rows={[validRow, invalidRow]}
        selected={new Set([1])}
        onToggle={vi.fn()}
        onSelectAll={vi.fn()}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    // [select-all, row1, row2(invalid)]
    expect(checkboxes[2]).toBeDisabled();
  });

  it('toggles row selection on checkbox click', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <PreviewTable
        rows={[validRow]}
        selected={new Set()}
        onToggle={onToggle}
        onSelectAll={vi.fn()}
      />,
    );
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    expect(onToggle).toHaveBeenCalledWith(1);
  });
});
