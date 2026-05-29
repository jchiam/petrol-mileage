import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ForecastCard } from './ForecastCard';

describe('ForecastCard', () => {
  it('renders expected value + range when forecast available', () => {
    render(
      <ForecastCard
        forecast={{
          nextMonthExpected: 310,
          nextMonthLow: 270,
          nextMonthHigh: 350,
          annualProjection: 3720,
        }}
      />,
    );
    expect(screen.getByText('Next month')).toBeInTheDocument();
    expect(screen.getByText('$310.00')).toBeInTheDocument();
    expect(screen.getByText('Range: $270 – $350')).toBeInTheDocument();
    expect(screen.getByText('Annual projection')).toBeInTheDocument();
    expect(screen.getByText('$3720.00')).toBeInTheDocument();
  });

  it('shows "Not enough data" for null fields', () => {
    render(
      <ForecastCard
        forecast={{
          nextMonthExpected: null,
          nextMonthLow: null,
          nextMonthHigh: null,
          annualProjection: 1000,
        }}
      />,
    );
    expect(screen.getByText('Not enough data')).toBeInTheDocument();
    expect(screen.getByText('$1000.00')).toBeInTheDocument();
  });

  it('renders nothing when both nextMonth and annual are null', () => {
    const { container } = render(
      <ForecastCard
        forecast={{
          nextMonthExpected: null,
          nextMonthLow: null,
          nextMonthHigh: null,
          annualProjection: null,
        }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
