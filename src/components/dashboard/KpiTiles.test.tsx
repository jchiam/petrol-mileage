import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KpiTiles } from './KpiTiles';

describe('KpiTiles', () => {
  it('renders all four tile labels', () => {
    render(
      <KpiTiles
        kpis={{ latestKmPerL: 12.5, rollingKmPerL30d: 12.1, latestCostPerKm: 0.16, mtdSpend: 240 }}
      />,
    );
    expect(screen.getByText('Latest km/L')).toBeInTheDocument();
    expect(screen.getByText('30-day avg km/L')).toBeInTheDocument();
    expect(screen.getByText('Latest $/km')).toBeInTheDocument();
    expect(screen.getByText('MTD spend')).toBeInTheDocument();
  });

  it('formats numeric values with units', () => {
    render(
      <KpiTiles
        kpis={{ latestKmPerL: 12.5, rollingKmPerL30d: 12.1, latestCostPerKm: 0.16, mtdSpend: 240 }}
      />,
    );
    expect(screen.getByText('12.50')).toBeInTheDocument();
    expect(screen.getByText('12.10')).toBeInTheDocument();
    expect(screen.getByText('$0.160')).toBeInTheDocument();
    expect(screen.getByText('$240.00')).toBeInTheDocument();
  });

  it('renders em-dash for null values', () => {
    render(
      <KpiTiles
        kpis={{ latestKmPerL: null, rollingKmPerL30d: null, latestCostPerKm: null, mtdSpend: 0 }}
      />,
    );
    // 3 nulls → 3 em-dashes
    expect(screen.getAllByText('—')).toHaveLength(3);
  });
});
