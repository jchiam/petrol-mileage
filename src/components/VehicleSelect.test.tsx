import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { VehicleSelect } from './VehicleSelect';

const vehicles = [
  { id: 1, name: 'Car A', isActive: true, isCurrent: true },
  { id: 2, name: 'Car B', isActive: true, isCurrent: false },
  { id: 3, name: 'Retired', isActive: false, isCurrent: false },
];

describe('VehicleSelect', () => {
  it('shows selected vehicle name on the trigger', () => {
    render(<VehicleSelect vehicles={vehicles} value={1} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /Car A/ })).toBeInTheDocument();
  });

  it('shows em-dash when value matches no vehicle', () => {
    render(<VehicleSelect vehicles={vehicles} value={null} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /—/ })).toBeInTheDocument();
  });

  it('opens dropdown on trigger click and shows all options', async () => {
    const user = userEvent.setup();
    render(<VehicleSelect vehicles={vehicles} value={1} onChange={() => {}} />);

    await user.click(screen.getByRole('button', { name: /Car A/ }));
    expect(screen.getByRole('button', { name: 'Car B' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retired/ })).toBeInTheDocument();
  });

  it('calls onChange when an option is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<VehicleSelect vehicles={vehicles} value={1} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Car A/ }));
    await user.click(screen.getByRole('button', { name: 'Car B' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('renders set-current star buttons only when onSetCurrent provided', async () => {
    const user = userEvent.setup();
    const onSetCurrent = vi.fn();
    render(
      <VehicleSelect
        vehicles={vehicles}
        value={1}
        onChange={() => {}}
        onSetCurrent={onSetCurrent}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Car A/ }));
    const setCurrentButtons = screen.getAllByTitle('Set as current car');
    expect(setCurrentButtons).toHaveLength(2);

    await user.click(setCurrentButtons[0]);
    expect(onSetCurrent).toHaveBeenCalledWith(2);
  });

  it('marks retired vehicles with "(retired)" suffix', () => {
    render(<VehicleSelect vehicles={vehicles} value={3} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /Retired \(retired\)/ })).toBeInTheDocument();
  });
});
