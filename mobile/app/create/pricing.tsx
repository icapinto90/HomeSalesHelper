import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import { Stepper } from '../../src/components/create/Stepper';
import { Button } from '../../src/components/ui/Button';
import { AIBadge } from '../../src/components/ui/Badge';
import { useListingsStore } from '../../src/store/listings.store';

function getSaleSpeedLabel(price: number, low: number, high: number): string {
  if (price <= low + (high - low) * 0.33) return '🟢 Fast Sale';
  if (price <= low + (high - low) * 0.66) return '⚡ Optimal';
  return '💰 Max Price';
}

export default function PricingStep() {
  const { draft, setDraftPrice, fetchPriceSuggestion } = useListingsStore();
  const [loading, setLoading] = useState(!draft.priceSuggestion);
  const [manualInput, setManualInput] = useState(String(draft.price ?? ''));

  useEffect(() => {
    if (draft.priceSuggestion) return;
    setLoading(true);
    fetchPriceSuggestion()
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suggestion = draft.priceSuggestion;
  const price = draft.price ?? suggestion?.recommended ?? 0;

  const handleSlider = (value: number) => {
    const rounded = Math.round(value);
    setDraftPrice(rounded);
    setManualInput(String(rounded));
  };

  const handleManualInput = (text: string) => {
    setManualInput(text);
    const num = parseFloat(text);
    if (!isNaN(num) && num > 0) setDraftPrice(num);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <Stepper currentStep={2} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
        <Text className="text-xl font-bold text-neutral-900">Set your price</Text>

        {loading ? (
          <View className="bg-primary-light rounded-card p-6 items-center gap-3">
            <ActivityIndicator color="#5B4FE9" />
            <Text className="text-primary font-medium">Analyzing market prices…</Text>
          </View>
        ) : suggestion ? (
          <>
            {/* Suggested price card */}
            <View className="bg-primary-light rounded-card p-4 gap-3">
              <View className="flex-row items-center gap-2">
                <AIBadge />
                <Text className="font-semibold text-neutral-900">Suggested Price</Text>
              </View>
              <View className="flex-row justify-between">
                {([
                  { label: 'Quick Sale', value: suggestion.low },
                  { label: 'Recommended', value: suggestion.recommended, highlight: true },
                  { label: 'Max', value: suggestion.high },
                ] as const).map((item) => (
                  <View key={item.label} className="items-center flex-1">
                    <Text
                      className={[
                        'font-bold text-lg',
                        (item as { highlight?: boolean }).highlight ? 'text-primary' : 'text-neutral-600',
                      ].join(' ')}
                    >
                      ${item.value}
                    </Text>
                    <Text className="text-neutral-600 text-xs text-center mt-0.5">{item.label}</Text>
                  </View>
                ))}
              </View>
              <Text className="text-neutral-600 text-xs text-center">
                Based on {suggestion.comparableCount} comparable {suggestion.source} sales
              </Text>
            </View>

            {/* Slider */}
            <View className="gap-2">
              <Slider
                minimumValue={suggestion.low * 0.5}
                maximumValue={suggestion.high * 1.5}
                value={price}
                onValueChange={handleSlider}
                step={1}
                minimumTrackTintColor="#5B4FE9"
                maximumTrackTintColor="#D1D5DB"
                thumbTintColor="#5B4FE9"
              />
              <View className="flex-row justify-between">
                <Text className="text-neutral-600 text-xs">${Math.round(suggestion.low * 0.5)}</Text>
                <Text className="text-primary font-bold text-lg">${price}</Text>
                <Text className="text-neutral-600 text-xs">${Math.round(suggestion.high * 1.5)}</Text>
              </View>
            </View>

            {/* Speed indicator */}
            <View className="bg-neutral-100 rounded-card p-3 items-center">
              <Text className="font-medium text-neutral-900">
                {getSaleSpeedLabel(price, suggestion.low, suggestion.high)}
              </Text>
            </View>
          </>
        ) : (
          <View className="bg-neutral-100 rounded-card p-4 items-center gap-2">
            <Text className="text-neutral-600">Price suggestion unavailable.</Text>
          </View>
        )}

        {/* Manual input */}
        <View className="gap-1">
          <Text className="font-medium text-neutral-900">Set your price</Text>
          <View className="flex-row items-center border border-neutral-300 rounded-card px-3 focus-within:border-primary">
            <Text className="text-neutral-600 text-base mr-1">$</Text>
            <TextInput
              value={manualInput}
              onChangeText={handleManualInput}
              keyboardType="decimal-pad"
              className="flex-1 py-3 text-neutral-900 text-base"
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-neutral-100 px-4 py-4">
        <Button
          label="Continue to Description →"
          variant="primary"
          size="lg"
          fullWidth
          disabled={!price}
          onPress={() => router.push('/create/description')}
        />
      </View>
    </SafeAreaView>
  );
}
