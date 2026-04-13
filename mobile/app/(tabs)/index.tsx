import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { useListingsStore } from '../../src/store/listings.store';
import { useMessagesStore } from '../../src/store/messages.store';
import { ListingCard } from '../../src/components/listing/ListingCard';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { listings, fetchListings, loading } = useListingsStore();
  const { fetchThreads, totalUnread } = useMessagesStore();

  const unreadCount = totalUnread();

  const refresh = useCallback(async () => {
    await Promise.all([fetchListings(), fetchThreads()]);
  }, [fetchListings, fetchThreads]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const activeListings = listings.filter((l) => l.status === 'ACTIVE');
  const soldListings = listings.filter((l) => l.status === 'SOLD');
  const monthlyRevenue = soldListings.reduce((acc, l) => acc + (l.price ?? 0), 0);
  const displayName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <SafeAreaView className="flex-1 bg-neutral-100">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-neutral-300">
        <View className="flex-row items-center gap-2">
          <Text className="text-xl">🏷</Text>
          <Text className="font-bold text-neutral-900 text-lg">Home Sale Helper</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/messages')}>
          <View className="relative">
            <Text className="text-xl">🔔</Text>
            {unreadCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-error rounded-full min-w-4 h-4 items-center justify-center px-1">
                <Text className="text-white text-[10px] font-bold">{unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Greeting */}
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-neutral-900">Good morning, {displayName} 👋</Text>
          {unreadCount > 0 && (
            <Text className="text-neutral-600 mt-1">You have {unreadCount} unread message{unreadCount > 1 ? 's' : ''}</Text>
          )}
        </View>

        {/* Revenue card */}
        <View className="mx-4 my-3 rounded-card overflow-hidden"
          style={{ backgroundColor: '#5B4FE9' }}>
          <View className="p-5">
            <Text className="text-white/70 text-sm mb-1">Monthly Revenue</Text>
            <Text className="text-white text-3xl font-bold">${monthlyRevenue.toFixed(2)}</Text>
            <View className="flex-row gap-3 mt-3">
              <View className="bg-secondary/20 rounded-pill px-3 py-1">
                <Text className="text-white text-sm font-medium">{activeListings.length} Active</Text>
              </View>
              <View className="bg-tertiary/20 rounded-pill px-3 py-1">
                <Text className="text-white text-sm font-medium">{soldListings.length} Sold</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Messages alert */}
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/messages')}
            className="mx-4 mb-3 flex-row items-center justify-between p-4 bg-white rounded-card border-l-4 border-tertiary"
            style={{ shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 }}
          >
            <View className="flex-row items-center gap-3">
              <Text className="text-xl">💬</Text>
              <Text className="font-medium text-neutral-900">
                {unreadCount} new message{unreadCount > 1 ? 's' : ''} from buyers
              </Text>
            </View>
            <Text className="text-primary text-sm font-medium">View →</Text>
          </TouchableOpacity>
        )}

        {/* Active listings */}
        <View className="px-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-bold text-neutral-900 text-base">Active Listings</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/listings')}>
              <Text className="text-primary text-sm">See all</Text>
            </TouchableOpacity>
          </View>

          {activeListings.length === 0 ? (
            <View className="bg-white rounded-card p-8 items-center gap-3">
              <Text className="text-4xl">📦</Text>
              <Text className="text-neutral-600 text-center">No active listings yet. Tap + to create your first!</Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-3">
              {activeListings.slice(0, 6).map((listing) => (
                <View key={listing.id} style={{ width: '47%' }}>
                  <ListingCard listing={listing} compact />
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
