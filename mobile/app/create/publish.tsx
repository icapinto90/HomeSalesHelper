import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Stepper } from '../../src/components/create/Stepper';
import { Button } from '../../src/components/ui/Button';
import { PlatformBadge } from '../../src/components/ui/Badge';
import { useListingsStore } from '../../src/store/listings.store';
import { accountsApi } from '../../src/api/accounts';
import type { Platform, PlatformAccount } from '../../src/types';

const ALL_PLATFORMS: Platform[] = ['EBAY', 'FACEBOOK', 'POSHMARK', 'OFFERUP'];

export default function PublishStep() {
  const { draft, setDraftPlatforms, publishDraft } = useListingsStore();
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [selected, setSelected] = useState<Platform[]>(draft.selectedPlatforms);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    accountsApi.list().then(setAccounts).catch(() => {});
  }, []);

  const isConnected = (p: Platform) => accounts.some((a) => a.platform === p && a.connected);

  const togglePlatform = (p: Platform) => {
    if (!isConnected(p)) return;
    setSelected((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const handlePublish = async () => {
    if (selected.length === 0) {
      Toast.show({ type: 'error', text1: 'Select at least one platform' });
      return;
    }
    setDraftPlatforms(selected);
    setPublishing(true);
    try {
      const listing = await publishDraft();
      Toast.show({ type: 'success', text1: 'Listing published! 🎉', text2: `Published to ${selected.length} platform(s)` });
      router.replace(`/listing/${listing.id}`);
    } catch (e: unknown) {
      Toast.show({ type: 'error', text1: 'Publish failed', text2: e instanceof Error ? e.message : 'Please try again.' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <Stepper currentStep={4} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
        <Text className="text-xl font-bold text-neutral-900">Publish</Text>
        <Text className="text-neutral-600">Select the platforms where you want to list your item.</Text>

        {/* Listing summary */}
        <View className="bg-neutral-100 rounded-card p-4 gap-2">
          <Text className="font-semibold text-neutral-900">{draft.title}</Text>
          <Text className="text-primary font-bold text-lg">${draft.price?.toFixed(2)}</Text>
          <Text className="text-neutral-600 text-sm" numberOfLines={3}>{draft.description}</Text>
        </View>

        {/* Platform selection */}
        <Text className="font-semibold text-neutral-900">Select Platforms</Text>
        <View className="gap-3">
          {ALL_PLATFORMS.map((p) => {
            const connected = isConnected(p);
            const isSelected = selected.includes(p);
            return (
              <TouchableOpacity
                key={p}
                onPress={() => togglePlatform(p)}
                disabled={!connected}
                activeOpacity={connected ? 0.85 : 1}
                className={[
                  'flex-row items-center gap-3 p-4 rounded-card border',
                  isSelected ? 'border-primary bg-primary-light' : 'border-neutral-300',
                  !connected ? 'opacity-40' : '',
                ].join(' ')}
              >
                <View
                  className={[
                    'w-5 h-5 rounded border-2 items-center justify-center',
                    isSelected ? 'bg-primary border-primary' : 'border-neutral-300',
                  ].join(' ')}
                >
                  {isSelected && <Text className="text-white text-xs font-bold">✓</Text>}
                </View>
                <PlatformBadge platform={p} />
                <Text className="flex-1 font-medium text-neutral-900">{p.charAt(0) + p.slice(1).toLowerCase()}</Text>
                {!connected && (
                  <TouchableOpacity onPress={() => router.push('/(auth)/platforms')}>
                    <Text className="text-primary text-xs font-medium">Connect</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {accounts.length === 0 && (
          <View className="bg-tertiary-light rounded-card p-3 flex-row items-center gap-2">
            <Text className="text-tertiary">⚠️</Text>
            <Text className="text-neutral-600 text-sm flex-1">
              No platforms connected.{' '}
              <Text className="text-primary font-medium" onPress={() => router.push('/(auth)/platforms')}>
                Connect now
              </Text>
            </Text>
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-neutral-100 px-4 py-4">
        <Button
          label={publishing ? 'Publishing…' : `Publish to ${selected.length} Platform${selected.length !== 1 ? 's' : ''}`}
          variant="primary"
          size="lg"
          fullWidth
          loading={publishing}
          disabled={selected.length === 0}
          onPress={handlePublish}
        />
      </View>
    </SafeAreaView>
  );
}
