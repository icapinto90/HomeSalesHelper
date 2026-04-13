import React from 'react';
import { render } from '@testing-library/react-native';
import { AIBadge, PlatformBadge, StatusBadge } from '../../src/components/ui/Badge';

describe('AIBadge', () => {
  it('renders', () => {
    const { getByText } = render(<AIBadge />);
    expect(getByText('✨ AI')).toBeTruthy();
  });
});

describe('PlatformBadge', () => {
  it.each([
    ['EBAY', 'eBay'],
    ['FACEBOOK', 'FB'],
    ['POSHMARK', 'Poshmark'],
    ['OFFERUP', 'OfferUp'],
  ] as const)('renders %s as "%s"', (platform, label) => {
    const { getByText } = render(<PlatformBadge platform={platform} />);
    expect(getByText(label)).toBeTruthy();
  });
});

describe('StatusBadge', () => {
  it.each([
    ['ACTIVE', 'Active'],
    ['SOLD', 'Sold'],
    ['DRAFT', 'Draft'],
    ['PENDING', 'Pending'],
    ['FAILED', 'Failed'],
  ] as const)('renders status %s', (status, label) => {
    const { getByText } = render(<StatusBadge status={status} />);
    expect(getByText(label)).toBeTruthy();
  });
});
