import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useListingsStore } from '../../src/store/listings.store';
import { ListingCard } from '../../src/components/listing/ListingCard';
import type { ListingStatus } from '../../src/types';

const STATUS_FILTERS: { label: string; value: ListingStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Sold', value: 'SOLD' },
  { label: 'Archived', value: 'ARCHIVED' },
];

export default function ListingsScreen() {
  const { listings, fetchListings, loading } = useListingsStore();
  const [filter, setFilter] = useState<ListingStatus | 'ALL'>('ALL');

  const refresh = useCallback(() => fetchListings(), [fetchListings]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = filter === 'ALL' ? listings : listings.filter((l) => l.status === filter);

  return (
    <SafeAreaView className="flex-1 bg-neutral-100">
      <View className="bg-white border-b border-neutral-300 px-4 py-3">
        <Text className="text-xl font-bold text-neutral-900">My Listings</Text>
      </View>

      {/* Filters */}
      <View className="bg-white px-4 py-2 border-b border-neutral-100">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setFilter(item.value)}
              className={[
                'rounded-pill px-4 py-2 mr-2',
                filter === item.value ? 'bg-primary' : 'bg-neutral-100',
              ].join(' ')}
            >
              <Text
                className={filter === item.value ? 'text-white font-medium text-sm' : 'text-neutral-600 text-sm'}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        ListEmptyComponent={
          <View className="items-center justify-center py-16 gap-3">
            <Text className="text-4xl">📦</Text>
            <Text className="text-neutral-600 text-center">
              {filter === 'ALL' ? 'No listings yet.' : `No ${filter.toLowerCase()} listings.`}
            </Text>
          </View>
        }
        renderItem={({ item }) => <ListingCard listing={item} />}
      />
    </SafeAreaView>
  );
}
