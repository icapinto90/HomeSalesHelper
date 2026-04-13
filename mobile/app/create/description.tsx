import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Stepper } from '../../src/components/create/Stepper';
import { Button } from '../../src/components/ui/Button';
import { AIBadge } from '../../src/components/ui/Badge';
import { useListingsStore } from '../../src/store/listings.store';

export default function DescriptionStep() {
  const { draft, setDraftText, runAiGenerate } = useListingsStore();
  const [generating, setGenerating] = useState(!draft.title);
  const [title, setTitle] = useState(draft.title ?? '');
  const [description, setDescription] = useState(draft.description ?? '');

  useEffect(() => {
    if (draft.title) return;
    setGenerating(true);
    runAiGenerate()
      .catch(() => {})
      .finally(() => {
        const { draft: updated } = useListingsStore.getState();
        setTitle(updated.title ?? '');
        setDescription(updated.description ?? '');
        setGenerating(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = () => {
    setDraftText(title, description);
    router.push('/create/publish');
  };

  const titleLength = title.length;
  const titleOk = titleLength <= 80;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <Stepper currentStep={3} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center gap-2">
          <Text className="text-xl font-bold text-neutral-900">Description</Text>
          <AIBadge />
        </View>
        <Text className="text-neutral-600">Edit the AI-generated text before publishing.</Text>

        {generating ? (
          <View className="bg-primary-light rounded-card p-6 items-center gap-3">
            <ActivityIndicator color="#5B4FE9" />
            <Text className="text-primary font-medium">Generating listing text…</Text>
          </View>
        ) : (
          <View className="gap-5">
            {/* Title */}
            <View className="gap-1">
              <View className="flex-row justify-between">
                <Text className="font-medium text-neutral-900">Title</Text>
                <Text className={titleOk ? 'text-neutral-600 text-xs' : 'text-error text-xs'}>
                  {titleLength}/80
                </Text>
              </View>
              <TextInput
                value={title}
                onChangeText={setTitle}
                className="border border-neutral-300 rounded-card px-3 py-3 text-neutral-900"
                placeholder="Item title"
                placeholderTextColor="#9CA3AF"
                maxLength={100}
              />
              {!titleOk && (
                <Text className="text-error text-xs">Title should be 80 characters or less.</Text>
              )}
            </View>

            {/* Description */}
            <View className="gap-1">
              <View className="flex-row justify-between">
                <Text className="font-medium text-neutral-900">Description</Text>
                <Text className="text-neutral-600 text-xs">{description.length} chars</Text>
              </View>
              <TextInput
                value={description}
                onChangeText={setDescription}
                className="border border-neutral-300 rounded-card px-3 py-3 text-neutral-900 min-h-32"
                placeholder="Describe your item…"
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
              />
            </View>

            <Button
              label="↺ Regenerate with AI"
              variant="secondary"
              onPress={() => {
                setGenerating(true);
                runAiGenerate()
                  .catch(() => {})
                  .finally(() => {
                    const { draft: d } = useListingsStore.getState();
                    setTitle(d.title ?? '');
                    setDescription(d.description ?? '');
                    setGenerating(false);
                  });
              }}
            />
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-neutral-100 px-4 py-4">
        <Button
          label="Continue to Publish →"
          variant="primary"
          size="lg"
          fullWidth
          disabled={generating || !title.trim()}
          onPress={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
}
