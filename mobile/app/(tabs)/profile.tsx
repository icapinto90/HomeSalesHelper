import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/auth.store';
import { accountsApi } from '../../src/api/accounts';
import { PlatformBadge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import type { Platform, PlatformAccount } from '../../src/types';

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);

  const loadAccounts = useCallback(() => {
    accountsApi.list().then(setAccounts).catch(() => {});
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/welcome');
  };

  return (
    <SafeAreaView className="flex-1 bg-neutral-100">
      <View className="bg-white border-b border-neutral-300 px-4 py-3">
        <Text className="text-xl font-bold text-neutral-900">Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Avatar + name */}
        <View className="bg-white px-4 py-6 items-center gap-2 border-b border-neutral-100">
          <View className="w-16 h-16 bg-primary rounded-full items-center justify-center mb-2">
            <Text className="text-white text-2xl font-bold">
              {user?.name?.charAt(0) ?? user?.email?.charAt(0) ?? '?'}
            </Text>
          </View>
          <Text className="font-bold text-neutral-900 text-lg">{user?.name ?? 'Seller'}</Text>
          <Text className="text-neutral-600">{user?.email}</Text>
          <View className="bg-primary-light rounded-pill px-3 py-1 mt-1">
            <Text className="text-primary text-sm font-medium capitalize">
              {user?.subscriptionPlan?.toLowerCase() ?? 'free'} plan
            </Text>
          </View>
        </View>

        {/* Connected platforms */}
        <View className="bg-white mt-4 px-4 py-4 border-b border-neutral-100">
          <Text className="font-semibold text-neutral-900 mb-3">Connected Platforms</Text>
          {accounts.length === 0 ? (
            <TouchableOpacity onPress={() => router.push('/(auth)/platforms')}>
              <Text className="text-primary text-sm">Connect platforms →</Text>
            </TouchableOpacity>
          ) : (
            <View className="gap-2">
              {accounts.map((acc) => (
                <View key={acc.platform} className="flex-row items-center justify-between py-1">
                  <View className="flex-row items-center gap-2">
                    <PlatformBadge platform={acc.platform as Platform} />
                    <Text className="text-neutral-600 text-sm">{acc.username ?? acc.platform}</Text>
                  </View>
                  {acc.connected ? (
                    <Text className="text-secondary text-sm font-medium">Connected</Text>
                  ) : (
                    <TouchableOpacity onPress={() => router.push('/(auth)/platforms')}>
                      <Text className="text-primary text-sm">Connect</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Settings */}
        <View className="bg-white mt-4 px-4 py-2 border-b border-neutral-100">
          {[
            { label: 'Upgrade Plan', icon: '⭐', onPress: () => router.push('/(auth)/pricing-plan') },
            { label: 'Notifications', icon: '🔔', onPress: () => {} },
            { label: 'Privacy & Security', icon: '🔒', onPress: () => {} },
            { label: 'Help & Support', icon: '❓', onPress: () => {} },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={item.onPress}
              className="flex-row items-center gap-3 py-3 border-b border-neutral-100 last:border-0"
            >
              <Text className="text-lg">{item.icon}</Text>
              <Text className="flex-1 text-neutral-900">{item.label}</Text>
              <Text className="text-neutral-300">›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="px-4 mt-6">
          <Button
            label="Sign Out"
            variant="danger"
            size="lg"
            fullWidth
            onPress={handleSignOut}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
