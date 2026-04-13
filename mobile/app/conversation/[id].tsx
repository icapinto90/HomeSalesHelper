import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { useMessagesStore } from '../../src/store/messages.store';
import { PlatformBadge } from '../../src/components/ui/Badge';
import { useListingsStore } from '../../src/store/listings.store';
import type { Message } from '../../src/types';

function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === 'OUTBOUND';
  return (
    <View className={`mb-3 max-w-[80%] ${isOutbound ? 'self-end' : 'self-start'}`}>
      <View
        className={[
          'rounded-card px-3 py-2',
          isOutbound ? 'bg-primary' : 'bg-neutral-100',
        ].join(' ')}
      >
        <Text className={isOutbound ? 'text-white text-sm' : 'text-neutral-900 text-sm'}>
          {message.content}
        </Text>
      </View>
      <View className={`flex-row items-center mt-1 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
        <Text className="text-neutral-600 text-xs">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {!message.read && !isOutbound && (
          <View className="w-2 h-2 bg-primary rounded-full ml-1" />
        )}
      </View>
    </View>
  );
}

export default function ConversationScreen() {
  const { id, platform } = useLocalSearchParams<{ id: string; platform: string }>();
  const navigation = useNavigation();
  const {
    activeMessages,
    activeSuggestions,
    fetchThread,
    reply,
    fetchSuggestions,
    clearSuggestions,
  } = useMessagesStore();
  const listing = useListingsStore((s) => s.getListing(id));

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchThread(id).then(() => {
      const msgs = useMessagesStore.getState().activeMessages;
      const lastInbound = [...msgs].reverse().find((m) => m.direction === 'INBOUND');
      if (lastInbound) fetchSuggestions(lastInbound.id);
    });
    return () => clearSuggestions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    navigation.setOptions({
      title: listing?.title ?? 'Conversation',
      headerRight: () => (
        platform ? <PlatformBadge platform={platform as never} small /> : null
      ),
    });
  }, [navigation, listing, platform]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    // reply to the last inbound message
    const lastInbound = [...activeMessages].reverse().find((m) => m.direction === 'INBOUND');
    if (lastInbound) {
      await reply(lastInbound.id, content).catch(() => {});
    }
    setSending(false);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // Group by date for separators
  const today = new Date().toDateString();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      {/* Listing banner */}
      {listing && (
        <TouchableOpacity
          onPress={() => router.push(`/listing/${listing.id}`)}
          className="flex-row items-center gap-3 px-4 py-2 border-b border-neutral-100 bg-neutral-100"
        >
          {listing.photos[0] && (
            <Image
              source={{ uri: listing.photos[0] }}
              className="w-10 h-10 rounded-card"
              resizeMode="cover"
            />
          )}
          <View className="flex-1">
            <Text className="font-medium text-neutral-900 text-sm" numberOfLines={1}>
              {listing.title}
            </Text>
            <Text className="text-primary font-bold text-sm">${listing.price?.toFixed(2)}</Text>
          </View>
          <Text className="text-secondary text-xs font-medium">{listing.status}</Text>
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        {/* Messages list */}
        <FlatList
          ref={flatRef}
          data={activeMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => <MessageBubble message={item} />}
          ListEmptyComponent={
            <View className="items-center justify-center py-16">
              <Text className="text-neutral-600">No messages yet.</Text>
            </View>
          }
        />

        {/* AI Quick Replies */}
        {activeSuggestions.length > 0 && (
          <View className="border-t border-neutral-100 pb-2">
            <Text className="text-xs text-neutral-600 px-4 pt-2 mb-1">✨ Quick Replies</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {activeSuggestions.map((s, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setText(s)}
                  className="border border-primary rounded-pill px-3 py-2 bg-white"
                >
                  <Text className="text-primary text-sm">{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input bar */}
        <View className="flex-row items-center gap-2 px-4 py-3 border-t border-neutral-100 bg-white">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message…"
            placeholderTextColor="#9CA3AF"
            className="flex-1 border border-neutral-300 rounded-pill px-4 py-2 text-neutral-900"
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!text.trim() || sending}
            className={`w-10 h-10 rounded-full items-center justify-center ${text.trim() && !sending ? 'bg-primary' : 'bg-neutral-100'}`}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#5B4FE9" />
            ) : (
              <Text className="text-white font-bold">→</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
