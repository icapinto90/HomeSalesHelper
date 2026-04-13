import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';

export default function WelcomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 justify-between py-12">
        {/* Hero */}
        <View className="items-center gap-4 mt-12">
          <View className="w-20 h-20 bg-primary rounded-card items-center justify-center">
            <Text className="text-4xl">🏷</Text>
          </View>
          <Text className="text-3xl font-bold text-neutral-900 text-center">
            Home Sale Helper
          </Text>
          <Text className="text-neutral-600 text-center text-base leading-6">
            Sell your items online in minutes — AI handles photos, pricing, and listings across all platforms.
          </Text>
        </View>

        {/* Features */}
        <View className="gap-4">
          {[
            { icon: '📸', title: 'Snap a photo', desc: 'AI identifies your item instantly' },
            { icon: '💰', title: 'Get the best price', desc: 'Based on thousands of real sales' },
            { icon: '🚀', title: 'Publish everywhere', desc: 'eBay, Facebook, Poshmark & more' },
          ].map((f) => (
            <View key={f.title} className="flex-row items-center gap-4">
              <View className="w-12 h-12 bg-primary-light rounded-card items-center justify-center">
                <Text className="text-2xl">{f.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-neutral-900">{f.title}</Text>
                <Text className="text-neutral-600 text-sm">{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View className="gap-3">
          <Button
            label="Get Started"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.push('/(auth)/signup')}
          />
          <Button
            label="I already have an account"
            variant="ghost"
            size="lg"
            fullWidth
            onPress={() => router.push('/(auth)/login')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
