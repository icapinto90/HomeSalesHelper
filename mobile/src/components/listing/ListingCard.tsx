import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { PlatformBadge } from '../ui/Badge';
import type { Listing } from '../../types';

interface ListingCardProps {
  listing: Listing;
  compact?: boolean;
}

export function ListingCard({ listing, compact = false }: ListingCardProps) {
  const coverPhoto = listing.photos[0]?.url;
  const activePlatforms = listing.platforms.filter((p) => p.status === 'ACTIVE' || p.status === 'PENDING');

  return (
    <TouchableOpacity
      onPress={() => router.push(`/listing/${listing.id}`)}
      activeOpacity={0.9}
      className="bg-white rounded-card overflow-hidden"
      style={{ shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 }}
    >
      {coverPhoto ? (
        <Image
          source={{ uri: coverPhoto }}
          className={compact ? 'w-full h-28' : 'w-full h-36'}
          resizeMode="cover"
        />
      ) : (
        <View className={`bg-neutral-100 items-center justify-center ${compact ? 'h-28' : 'h-36'}`}>
          <Text className="text-neutral-300 text-3xl">📦</Text>
        </View>
      )}
      <View className="p-2 gap-1">
        <Text className="text-neutral-900 font-semibold text-sm" numberOfLines={2}>
          {listing.title || 'Untitled'}
        </Text>
        <Text className="text-primary font-bold text-sm">
          ${listing.price?.toFixed(2) ?? '—'}
        </Text>
        {activePlatforms.length > 0 && (
          <View className="flex-row flex-wrap gap-1 mt-1">
            {activePlatforms.slice(0, 3).map((p) => (
              <PlatformBadge key={p.platform} platform={p.platform} small />
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
