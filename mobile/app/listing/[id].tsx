import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { PlatformBadge, StatusBadge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { useListingsStore } from '../../src/store/listings.store';
import { listingsApi } from '../../src/api/listings';
import type { Listing } from '../../src/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getListing, markSold, removeListing } = useListingsStore();
  const [listing, setListing] = useState<Listing | undefined>(getListing(id));
  const [loading, setLoading] = useState(!listing);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    if (listing) return;
    setLoading(true);
    listingsApi.get(id)
      .then(setListing)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, listing]);

  const handleMarkSold = async () => {
    if (!listing) return;
    Alert.alert('Mark as Sold', 'This will mark the item as sold on all platforms.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Sold',
        onPress: async () => {
          setActionLoading('sold');
          try {
            await markSold(listing.id);
            setListing((prev) => prev ? { ...prev, status: 'SOLD' } : prev);
            Toast.show({ type: 'success', text1: 'Marked as sold 🎉' });
          } catch {
            Toast.show({ type: 'error', text1: 'Failed to update.' });
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const handleDelete = async () => {
    if (!listing) return;
    Alert.alert('Delete Listing', 'This will archive the listing from all platforms.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setActionLoading('delete');
          try {
            await removeListing(listing.id);
            router.back();
          } catch {
            Toast.show({ type: 'error', text1: 'Failed to delete.' });
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#5B4FE9" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View className="flex-1 items-center justify-center bg-white gap-4">
        <Text className="text-4xl">😕</Text>
        <Text className="text-neutral-600">Listing not found.</Text>
        <Button label="Go Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Photo carousel */}
        {listing.photos.length > 0 ? (
          <View>
            <FlatList
              data={listing.photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setPhotoIndex(idx);
              }}
              keyExtractor={(url, i) => url + i}
              renderItem={({ item: url }) => (
                <Image
                  source={{ uri: url }}
                  style={{ width: SCREEN_WIDTH, height: 300 }}
                  resizeMode="cover"
                />
              )}
            />
            {listing.photos.length > 1 && (
              <View className="flex-row justify-center gap-1 mt-2">
                {listing.photos.map((_, i) => (
                  <View
                    key={i}
                    className={`h-1.5 rounded-full ${i === photoIndex ? 'w-4 bg-primary' : 'w-1.5 bg-neutral-300'}`}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View className="h-48 bg-neutral-100 items-center justify-center">
            <Text className="text-5xl">📦</Text>
          </View>
        )}

        <View className="px-4 pt-4 gap-4">
          {/* Title + price */}
          <View className="flex-row items-start gap-3">
            <View className="flex-1">
              <Text className="text-xl font-bold text-neutral-900 mb-1">{listing.title}</Text>
              <Text className="text-primary font-bold text-2xl">${listing.price?.toFixed(2)}</Text>
            </View>
            <StatusBadge status={listing.status as never} />
          </View>

          {/* Item details */}
          {(listing.category || listing.detectedAttributes) && (
            <View className="bg-neutral-100 rounded-card p-3 gap-2">
              {[
                { label: 'Category', value: listing.category },
                { label: 'Condition', value: listing.detectedAttributes?.condition as string | undefined },
                { label: 'Brand', value: listing.detectedAttributes?.brand as string | undefined },
              ]
                .filter((r) => r.value)
                .map((r) => (
                  <View key={r.label} className="flex-row justify-between">
                    <Text className="text-neutral-600 text-sm">{r.label}</Text>
                    <Text className="text-neutral-900 font-medium text-sm">{r.value}</Text>
                  </View>
                ))}
            </View>
          )}

          {/* Description */}
          {listing.description && (
            <View className="gap-1">
              <Text className="font-semibold text-neutral-900">Description</Text>
              <Text className="text-neutral-600 leading-5">{listing.description}</Text>
            </View>
          )}

          {/* Platform statuses */}
          {listing.platformListings.length > 0 && (
            <View className="gap-2">
              <Text className="font-semibold text-neutral-900">Platform Status</Text>
              {listing.platformListings.map((p) => (
                <View
                  key={p.platform}
                  className="flex-row items-center justify-between bg-neutral-100 rounded-card p-3"
                >
                  <PlatformBadge platform={p.platform} />
                  <StatusBadge status={p.status as never} />
                  {p.url && (
                    <Text className="text-primary text-xs">View ↗</Text>
                  )}
                  {p.errorMsg && (
                    <Text className="text-error text-xs">{p.errorMsg}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Actions */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-neutral-100 px-4 py-4 gap-2">
        {listing.status === 'ACTIVE' && (
          <Button
            label="Mark as Sold ✓"
            variant="secondary"
            size="lg"
            fullWidth
            loading={actionLoading === 'sold'}
            onPress={handleMarkSold}
          />
        )}
        <View className="flex-row gap-3">
          <Button
            label="Messages 💬"
            variant="ghost"
            fullWidth
            onPress={() => router.push(`/conversation/${listing.id}`)}
          />
          <Button
            label="Delete"
            variant="danger"
            loading={actionLoading === 'delete'}
            onPress={handleDelete}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
