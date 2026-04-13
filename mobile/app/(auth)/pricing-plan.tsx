import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';

type Plan = 'subscription' | 'commission';

const plans: { id: Plan; name: string; price: string; description: string; features: string[] }[] = [
  {
    id: 'subscription',
    name: 'Unlimited',
    price: '$9.99/month',
    description: 'Best for frequent sellers',
    features: ['Unlimited listings', 'All platforms', 'Priority AI processing', 'Advanced analytics'],
  },
  {
    id: 'commission',
    name: 'Pay per Sale',
    price: '5% commission',
    description: 'No upfront cost',
    features: ['Free to start', 'All platforms', 'Standard AI processing', 'Basic analytics'],
  },
];

export default function PricingPlanScreen() {
  const [selected, setSelected] = useState<Plan>('subscription');

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6">
        <View className="mt-8 mb-6">
          <Text className="text-2xl font-bold text-neutral-900 mb-2">Choose your plan</Text>
          <Text className="text-neutral-600">Start free — upgrade any time.</Text>
        </View>

        <View className="gap-4 mb-8">
          {plans.map((plan) => {
            const isSelected = selected === plan.id;
            return (
              <TouchableOpacity
                key={plan.id}
                onPress={() => setSelected(plan.id)}
                activeOpacity={0.9}
                className={[
                  'p-5 rounded-card border-2',
                  isSelected ? 'border-primary bg-primary-light' : 'border-neutral-300',
                ].join(' ')}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="font-bold text-neutral-900 text-lg">{plan.name}</Text>
                  <View
                    className={`w-5 h-5 rounded-full border-2 items-center justify-center ${isSelected ? 'border-primary bg-primary' : 'border-neutral-300'}`}
                  >
                    {isSelected && <Text className="text-white text-xs font-bold">✓</Text>}
                  </View>
                </View>
                <Text className="text-primary font-bold text-xl mb-1">{plan.price}</Text>
                <Text className="text-neutral-600 text-sm mb-3">{plan.description}</Text>
                <View className="gap-1">
                  {plan.features.map((f) => (
                    <View key={f} className="flex-row items-center gap-2">
                      <Text className="text-secondary text-sm">✓</Text>
                      <Text className="text-neutral-600 text-sm">{f}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="gap-3 pb-8">
          <Button
            label="Start Selling"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.replace('/(tabs)')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
