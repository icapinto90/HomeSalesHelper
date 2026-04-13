import React from 'react';
import { View, Text } from 'react-native';
import type { Platform } from '../../types';

// ─── AI Badge ─────────────────────────────────────────────────────────────────

export function AIBadge() {
  return (
    <View className="flex-row items-center bg-primary-light rounded-pill px-2 py-0.5 self-start">
      <Text className="text-primary text-xs font-medium">✨ AI</Text>
    </View>
  );
}

// ─── Platform Badge ───────────────────────────────────────────────────────────

const platformConfig: Record<Platform, { label: string; color: string }> = {
  EBAY: { label: 'eBay', color: '#0064D2' },
  FACEBOOK: { label: 'FB', color: '#1877F2' },
  POSHMARK: { label: 'Poshmark', color: '#C13584' },
  OFFERUP: { label: 'OfferUp', color: '#FF6900' },
};

interface PlatformBadgeProps {
  platform: Platform;
  small?: boolean;
}

export function PlatformBadge({ platform, small = false }: PlatformBadgeProps) {
  const cfg = platformConfig[platform];
  return (
    <View
      style={{ backgroundColor: cfg.color + '20', borderColor: cfg.color }}
      className={`rounded-pill border ${small ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}
    >
      <Text style={{ color: cfg.color }} className={small ? 'text-[10px] font-medium' : 'text-xs font-medium'}>
        {cfg.label}
      </Text>
    </View>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

type Status = 'ACTIVE' | 'SOLD' | 'DRAFT' | 'ARCHIVED' | 'PENDING' | 'FAILED';

const statusConfig: Record<Status, { label: string; bg: string; text: string }> = {
  ACTIVE: { label: 'Active', bg: 'bg-secondary-light', text: 'text-secondary' },
  SOLD: { label: 'Sold', bg: 'bg-neutral-100', text: 'text-neutral-600' },
  DRAFT: { label: 'Draft', bg: 'bg-tertiary-light', text: 'text-tertiary' },
  ARCHIVED: { label: 'Archived', bg: 'bg-neutral-100', text: 'text-neutral-600' },
  PENDING: { label: 'Pending', bg: 'bg-tertiary-light', text: 'text-tertiary' },
  FAILED: { label: 'Failed', bg: 'bg-error-light', text: 'text-error' },
};

export function StatusBadge({ status }: { status: Status }) {
  const cfg = statusConfig[status];
  return (
    <View className={`rounded-pill px-2 py-0.5 self-start ${cfg.bg}`}>
      <Text className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</Text>
    </View>
  );
}
