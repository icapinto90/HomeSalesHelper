import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { Stepper } from '../../src/components/create/Stepper';
import { Button } from '../../src/components/ui/Button';
import { AIBadge } from '../../src/components/ui/Badge';
import { Input } from '../../src/components/ui/Input';
import { useListingsStore } from '../../src/store/listings.store';

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

export default function ReviewStep() {
  const { draft, setDraftOverrides, runAiIdentify } = useListingsStore();
  const [identifying, setIdentifying] = useState(!draft.aiResult);
  const posthog = usePostHog();

  // Upload photos + run AI identification
  useEffect(() => {
    if (draft.aiResult) return;
    setIdentifying(true);
    posthog?.capture('analysis_requested');
    runAiIdentify()
      .catch(() => {
        // AI failed silently — user can fill manually
      })
      .finally(() => setIdentifying(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ai = { ...draft.aiResult, ...draft.overrides };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <Stepper currentStep={1} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
        <Text className="text-xl font-bold text-neutral-900">AI Review</Text>
        <Text className="text-neutral-600">Review and correct the AI-detected details.</Text>

        {identifying ? (
          <View className="bg-primary-light rounded-card p-6 items-center gap-3">
            <ActivityIndicator color="#5B4FE9" size="large" />
            <Text className="text-primary font-medium">Uploading & identifying…</Text>
            <Text className="text-neutral-600 text-sm text-center">
              Uploading your photos and running AI identification.
            </Text>
          </View>
        ) : (
          <>
            {draft.aiResult && (
              <View className="bg-primary-light rounded-card p-4 gap-2">
                <AIBadge />
                <Text className="font-semibold text-neutral-900 text-base mt-1">
                  {draft.aiResult.category}
                </Text>
                <View className="flex-row flex-wrap gap-2 mt-1">
                  {Object.entries(draft.aiResult.attributes ?? {}).map(([k, v]) => (
                    <View key={k} className="bg-white rounded-pill px-2 py-1 border border-neutral-300">
                      <Text className="text-neutral-600 text-xs capitalize">
                        {k}: <Text className="font-medium text-neutral-900">{v}</Text>
                      </Text>
                    </View>
                  ))}
                </View>
                <Text className="text-neutral-600 text-xs mt-1">
                  Confidence: {Math.round((draft.aiResult.confidence ?? 0) * 100)}%
                </Text>
              </View>
            )}

            {/* Editable fields */}
            <View className="gap-4">
              <Input
                label="Category"
                value={ai.category ?? ''}
                onChangeText={(v) => setDraftOverrides({ category: v })}
                placeholder="e.g. Sneakers"
              />
              <Input
                label="Brand"
                value={ai.brand ?? ''}
                onChangeText={(v) => setDraftOverrides({ brand: v })}
                placeholder="e.g. Nike"
              />
              <View className="gap-1">
                <Text className="text-sm font-medium text-neutral-900">Condition</Text>
                <View className="flex-row flex-wrap gap-2">
                  {CONDITIONS.map((c) => (
                    <Button
                      key={c}
                      label={c}
                      variant={ai.condition === c ? 'primary' : 'secondary'}
                      size="sm"
                      onPress={() => setDraftOverrides({ condition: c })}
                    />
                  ))}
                </View>
              </View>
              <Input
                label="Color"
                value={ai.color ?? ''}
                onChangeText={(v) => setDraftOverrides({ color: v })}
                placeholder="e.g. White"
              />
            </View>
          </>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-neutral-100 px-4 py-4">
        <Button
          label="Continue to Pricing →"
          variant="primary"
          size="lg"
          fullWidth
          disabled={identifying}
          onPress={() => router.push('/create/pricing')}
        />
      </View>
    </SafeAreaView>
  );
}
