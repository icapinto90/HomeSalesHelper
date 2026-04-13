import React, { useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMessagesStore } from '../../src/store/messages.store';
import { PlatformBadge } from '../../src/components/ui/Badge';
import type { MessageThread } from '../../src/types';

function ThreadRow({ item }: { item: MessageThread }) {
  return (
    <TouchableOpacity
      onPress={() => router.push(`/conversation/${item.listingId}?platform=${item.platform}`)}
      className="flex-row items-center gap-3 bg-white px-4 py-4 border-b border-neutral-100"
      activeOpacity={0.85}
    >
      {/* Avatar */}
      <View className="w-12 h-12 bg-primary-light rounded-full items-center justify-center overflow-hidden">
        <Text className="text-primary text-lg font-bold">{item.buyerName.charAt(0)}</Text>
      </View>

      <View className="flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="font-semibold text-neutral-900 flex-1" numberOfLines={1}>
            {item.buyerName}
          </Text>
          <Text className="text-neutral-600 text-xs">
            {new Date(item.updatedAt).toLocaleDateString()}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <PlatformBadge platform={item.platform} small />
          <Text className="text-neutral-600 text-xs flex-1" numberOfLines={1}>
            re: {item.listing.title}
          </Text>
        </View>
        <Text className="text-neutral-600 text-sm" numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>

      {item.unreadCount > 0 && (
        <View className="bg-primary rounded-full min-w-5 h-5 items-center justify-center px-1.5">
          <Text className="text-white text-xs font-bold">{item.unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function MessagesScreen() {
  const { threads, fetchThreads, loading } = useMessagesStore();

  const refresh = useCallback(() => fetchThreads(), [fetchThreads]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SafeAreaView className="flex-1 bg-neutral-100">
      <View className="bg-white border-b border-neutral-300 px-4 py-3">
        <Text className="text-xl font-bold text-neutral-900">Messages</Text>
      </View>

      <FlatList
        data={threads}
        keyExtractor={(item) => `${item.listingId}-${item.platform}`}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        ListEmptyComponent={
          <View className="items-center justify-center py-16 gap-3">
            <Text className="text-4xl">💬</Text>
            <Text className="text-neutral-600 text-center">No messages yet.</Text>
          </View>
        }
        renderItem={({ item }) => <ThreadRow item={item} />}
      />
    </SafeAreaView>
  );
}
