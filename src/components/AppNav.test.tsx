import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppNav } from './AppNav';

const usePathnameMock = vi.fn<() => string>();

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

describe('AppNav', () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
  });

  it('renders Petrol logo linking to /', () => {
    usePathnameMock.mockReturnValue('/');
    render(<AppNav />);
    expect(screen.getByRole('link', { name: 'Petrol' })).toHaveAttribute('href', '/');
  });

  it('renders all three nav links', () => {
    usePathnameMock.mockReturnValue('/');
    render(<AppNav />);
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Log fill-up' })).toHaveAttribute('href', '/log');
    expect(screen.getByRole('link', { name: 'Import' })).toHaveAttribute('href', '/admin/import');
  });

  it('highlights active route with bg-gray-100 class', () => {
    usePathnameMock.mockReturnValue('/log');
    render(<AppNav />);
    expect(screen.getByRole('link', { name: 'Log fill-up' })).toHaveClass('bg-gray-100');
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveClass('bg-gray-100');
  });
});
