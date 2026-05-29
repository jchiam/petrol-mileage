import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LogForm } from './LogForm';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('LogForm', () => {
  it('renders empty state when no current vehicle', () => {
    render(<LogForm currentVehicle={null} />);
    expect(screen.getByText('No current vehicle set.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go to dashboard/ })).toBeInTheDocument();
  });

  it('renders all form fields when vehicle is set', () => {
    render(<LogForm currentVehicle={{ id: 1, name: 'Test Car' }} />);
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Petrol')).toBeInTheDocument();
    expect(screen.getByLabelText('Mileage since last fill')).toBeInTheDocument();
    expect(screen.getByLabelText('Total cost')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log Fill-Up' })).toBeInTheDocument();
  });

  it('displays vehicle name and "Change in dashboard" link', () => {
    render(<LogForm currentVehicle={{ id: 1, name: 'My Honda' }} />);
    expect(screen.getByText('My Honda')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Change in dashboard/ })).toBeInTheDocument();
  });

  it('shows confirmation card after successful submit and resets via "Log another"', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 201 }));

    render(<LogForm currentVehicle={{ id: 1, name: 'Test Car' }} />);
    await user.type(screen.getByLabelText('Petrol'), '40');
    await user.type(screen.getByLabelText('Mileage since last fill'), '500');
    await user.type(screen.getByLabelText('Total cost'), '80');
    await user.click(screen.getByRole('button', { name: 'Log Fill-Up' }));

    expect(await screen.findByText('Fill-up saved')).toBeInTheDocument();
    expect(screen.getByText('km/L')).toBeInTheDocument();
    expect(screen.getByText('$/km')).toBeInTheDocument();
    expect(screen.getByText('$/L')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Log another' }));
    expect(screen.getByLabelText('Petrol')).toHaveValue(null);
    expect(screen.getByLabelText('Mileage since last fill')).toHaveValue(null);
    expect(screen.getByLabelText('Total cost')).toHaveValue(null);
  });

  it('renders server-side validation error', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'All fields must be positive' }), { status: 422 }),
    );

    render(<LogForm currentVehicle={{ id: 1, name: 'Test Car' }} />);
    await user.type(screen.getByLabelText('Petrol'), '40');
    await user.type(screen.getByLabelText('Mileage since last fill'), '500');
    await user.type(screen.getByLabelText('Total cost'), '80');
    await user.click(screen.getByRole('button', { name: 'Log Fill-Up' }));

    expect(await screen.findByText('All fields must be positive')).toBeInTheDocument();
  });

  it('renders network error when fetch rejects', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    render(<LogForm currentVehicle={{ id: 1, name: 'Test Car' }} />);
    await user.type(screen.getByLabelText('Petrol'), '40');
    await user.type(screen.getByLabelText('Mileage since last fill'), '500');
    await user.type(screen.getByLabelText('Total cost'), '80');
    await user.click(screen.getByRole('button', { name: 'Log Fill-Up' }));

    expect(await screen.findByText(/Network error/i)).toBeInTheDocument();
  });
});
