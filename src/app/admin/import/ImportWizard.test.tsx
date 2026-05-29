import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ImportWizard } from './ImportWizard';

function mockVehiclesFetch(vehicles: unknown[]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = typeof input === 'string' ? input : (input as Request).url;
    if (url.includes('/api/vehicles')) {
      return Promise.resolve(new Response(JSON.stringify(vehicles), { status: 200 }));
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`));
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ImportWizard', () => {
  it('shows loading spinner before vehicles fetch resolves', () => {
    // Keep fetch pending
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}));
    const { container } = render(<ImportWizard />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders create-vehicle form when no vehicles exist', async () => {
    mockVehiclesFetch([]);
    render(<ImportWizard />);
    expect(
      await screen.findByPlaceholderText('Display name (required, e.g. My Honda City)'),
    ).toBeInTheDocument();
  });

  it('renders vehicle selector and upload zone when vehicles exist', async () => {
    mockVehiclesFetch([{ id: 1, name: 'Test Car', isActive: true, isCurrent: true }]);
    render(<ImportWizard />);
    await waitFor(() => expect(screen.getByTestId('vehicle-select')).toBeInTheDocument());
    expect(screen.getByTestId('upload-zone')).toBeInTheDocument();
    // Description text is split across multiple <span>; check upload-zone text
    expect(screen.getByTestId('upload-zone').textContent).toMatch(/Drag.*drop.*\.xlsx.*\.csv/i);
  });

  it('toggles inline "+ Add vehicle" form', async () => {
    const user = userEvent.setup();
    mockVehiclesFetch([{ id: 1, name: 'Test Car', isActive: true, isCurrent: true }]);
    render(<ImportWizard />);
    await waitFor(() => expect(screen.getByTestId('vehicle-select')).toBeInTheDocument());

    expect(
      screen.queryByPlaceholderText('Display name (required, e.g. My Honda City)'),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ Add vehicle' }));
    expect(
      screen.getByPlaceholderText('Display name (required, e.g. My Honda City)'),
    ).toBeInTheDocument();
  });
});
