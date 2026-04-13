import React, { useEffect, useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { accountsApi } from '../../src/api/accounts';
import type { Platform, PlatformAccount } from '../../src/types';

const PLATFORMS: { id: Platform; name: string; color: string; icon: string; description: string }[] = [
  { id: 'EBAY', name: 'eBay', color: '#0064D2', icon: '🛒', description: 'Largest online marketplace' },
  { id: 'FACEBOOK', name: 'Facebook Marketplace', color: '#1877F2', icon: '📘', description: 'Sell locally & nationally' },
  { id: 'POSHMARK', name: 'Poshmark', color: '#C13584', icon: '👗', description: 'Fashion & accessories' },
  { id: 'OFFERUP', name: 'OfferUp', color: '#FF6900', icon: '🤝', description: 'Local buying & selling' },
];

export default function PlatformsScreen() {
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [connecting, setConnecting] = useState<Platform | null>(null);

  useEffect(() => {
    accountsApi.list().then(setAccounts).catch(() => {});
  }, []);

  const isConnected = (p: Platform) => accounts.some((a) => a.platform === p && a.isActive);

  const handleConnect = async (platform: Platform) => {
    setConnecting(platform);
    try {
      const { url } = await accountsApi.getOAuthUrl(platform);
      // In a real build: open `url` via expo-web-browser, wait for callback
      // After callback the backend exchanges the code and saves the token
      const updated = await accountsApi.list();
      setAccounts(updated);
    } catch {
      // Handle error silently; toast would show in production
    } finally {
      setConnecting(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6">
        <View className="mt-8 mb-6">
          <Text className="text-2xl font-bold text-neutral-900 mb-2">Connect your platforms</Text>
          <Text className="text-neutral-600">
            Connect your marketplace accounts to publish listings automatically. You can always add more later.
          </Text>
        </View>

        <View className="gap-3 mb-8">
          {PLATFORMS.map((p) => {
            const connected = isConnected(p.id);
            return (
              <TouchableOpacity
                key={p.id}
                onPress={() => !connected && handleConnect(p.id)}
                activeOpacity={connected ? 1 : 0.85}
                className={[
                  'flex-row items-center p-4 rounded-card border',
                  connected ? 'border-secondary bg-secondary-light' : 'border-neutral-300',
                ].join(' ')}
              >
                <Text className="text-2xl mr-4">{p.icon}</Text>
                <View className="flex-1">
                  <Text className="font-semibold text-neutral-900">{p.name}</Text>
                  <Text className="text-neutral-600 text-sm">{p.description}</Text>
                </View>
                {connected ? (
                  <Text className="text-secondary font-medium text-sm">✓ Connected</Text>
                ) : connecting === p.id ? (
                  <Text className="text-primary text-sm">Connecting…</Text>
                ) : (
                  <Text style={{ color: p.color }} className="font-medium text-sm">
                    Connect
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="gap-3 pb-8">
          <Button
            label="Continue"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.replace('/(auth)/pricing-plan')}
          />
          <Button
            label="Skip for now"
            variant="ghost"
            size="lg"
            fullWidth
            onPress={() => router.replace('/(auth)/pricing-plan')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
