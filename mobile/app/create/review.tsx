import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Stepper } from '../../src/components/create/Stepper';
import { Button } from '../../src/components/ui/Button';
import { AIBadge } from '../../src/components/ui/Badge';
import { Input } from '../../src/components/ui/Input';
import { useListingsStore } from '../../src/store/listings.store';
import { listingsApi } from '../../src/api/listings';

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

export default function ReviewStep() {
  const { draft, setDraftAiResult, setDraftOverrides, setDraftListingId, runAiIdentify } =
    useListingsStore();
  const [identifying, setIdentifying] = useState(!draft.aiResult);
  const [uploading, setUploading] = useState(false);

  // AI identification + photo upload
  useEffect(() => {
    if (draft.aiResult) return;
    const run = async () => {
      setIdentifying(true);
      try {
        // 1. Create a draft listing and upload photos
        const listing = await listingsApi.create({});
        setDraftListingId(listing.id);
        const withPhotos = await listingsApi.uploadPhotos(listing.id, draft.photoUris);
        const photoUrls = withPhotos.photos.map((p) => p.url);

        // 2. Run AI identification
        await runAiIdentify(photoUrls);
      } catch {
        // AI failed silently; user can fill manually
      } finally {
        setIdentifying(false);
      }
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ai = { ...draft.aiResult, ...draft.overrides };

  const handleContinue = () => {
    router.push('/create/pricing');
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <Stepper currentStep={1} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
        <Text className="text-xl font-bold text-neutral-900">AI Review</Text>
        <Text className="text-neutral-600">Review and correct the AI-detected details.</Text>

        {identifying ? (
          <View className="bg-primary-light rounded-card p-6 items-center gap-3">
            <ActivityIndicator color="#5B4FE9" size="large" />
            <Text className="text-primary font-medium">Identifying your item…</Text>
            <Text className="text-neutral-600 text-sm text-center">
              Our AI is analyzing your photos to identify the item.
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
                onChangeText={(v) => setDraftOverrides({ color: v } as Partial<typeof ai>)}
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
          onPress={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
}
