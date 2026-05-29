import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { FillRow } from './types';
import { VoidDialog } from './VoidDialog';

const fill: FillRow = {
  id: 99,
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
};

describe('VoidDialog', () => {
  it('renders fill details', () => {
    render(<VoidDialog fill={fill} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Void fill-up' })).toBeInTheDocument();
    expect(screen.getByText(/2024-01-15/)).toBeInTheDocument();
    expect(screen.getByText(/40\.000 L/)).toBeInTheDocument();
    expect(screen.getByText(/\$80\.00/)).toBeInTheDocument();
  });

  it('disables submit when reason is empty', () => {
    render(<VoidDialog fill={fill} onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Void & re-enter' })).toBeDisabled();
  });

  it('enables submit once reason has content', async () => {
    const user = userEvent.setup();
    render(<VoidDialog fill={fill} onConfirm={vi.fn()} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText(/Reason/), 'wrong mileage');
    expect(screen.getByRole('button', { name: 'Void & re-enter' })).toBeEnabled();
  });

  it('calls onConfirm with trimmed reason', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<VoidDialog fill={fill} onConfirm={onConfirm} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText(/Reason/), '  bad mileage  ');
    await user.click(screen.getByRole('button', { name: 'Void & re-enter' }));
    expect(onConfirm).toHaveBeenCalledWith('bad mileage');
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<VoidDialog fill={fill} onConfirm={vi.fn()} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders error message when onConfirm rejects', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockRejectedValue(new Error('Already voided'));
    render(<VoidDialog fill={fill} onConfirm={onConfirm} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText(/Reason/), 'reason');
    await user.click(screen.getByRole('button', { name: 'Void & re-enter' }));
    expect(await screen.findByText('Already voided')).toBeInTheDocument();
  });
});
