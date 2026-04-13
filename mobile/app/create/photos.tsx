import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Stepper } from '../../src/components/create/Stepper';
import { Button } from '../../src/components/ui/Button';
import { useListingsStore } from '../../src/store/listings.store';

const MAX_PHOTOS = 8;

export default function PhotosStep() {
  const { draft, setDraftPhotos, resetDraft } = useListingsStore();
  const [photos, setPhotos] = useState<string[]>(draft.photoUris);

  const pickFromGallery = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (!result.canceled) {
      const newUris = result.assets.map((a) => a.uri);
      setPhotos((p) => [...p, ...newUris].slice(0, MAX_PHOTOS));
    }
  };

  const openCamera = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled) {
      setPhotos((p) => [...p, result.assets[0].uri].slice(0, MAX_PHOTOS));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((p) => p.filter((_, i) => i !== index));
  };

  const handleContinue = () => {
    if (photos.length === 0) {
      Alert.alert('Add photos', 'Please add at least one photo.');
      return;
    }
    resetDraft();
    setDraftPhotos(photos);
    router.push('/create/review');
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <Stepper currentStep={0} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 120 }}>
        <Text className="text-xl font-bold text-neutral-900">Add photos</Text>
        <Text className="text-neutral-600">
          Take up to {MAX_PHOTOS} photos. Clear, well-lit photos get better AI identification.
        </Text>

        {/* Photo grid */}
        <View className="flex-row flex-wrap gap-2">
          {photos.map((uri, i) => (
            <View key={uri + i} className="relative" style={{ width: '31%', aspectRatio: 1 }}>
              <Image source={{ uri }} className="w-full h-full rounded-card" resizeMode="cover" />
              <TouchableOpacity
                onPress={() => removePhoto(i)}
                className="absolute top-1 right-1 bg-error rounded-full w-5 h-5 items-center justify-center"
              >
                <Text className="text-white text-xs font-bold">×</Text>
              </TouchableOpacity>
              {i === 0 && (
                <View className="absolute bottom-1 left-1 bg-primary rounded-pill px-1.5 py-0.5">
                  <Text className="text-white text-[10px] font-medium">Cover</Text>
                </View>
              )}
            </View>
          ))}

          {photos.length < MAX_PHOTOS && (
            <TouchableOpacity
              onPress={pickFromGallery}
              className="border-2 border-dashed border-neutral-300 rounded-card items-center justify-center"
              style={{ width: '31%', aspectRatio: 1 }}
            >
              <Text className="text-neutral-300 text-3xl">+</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Action buttons */}
        <View className="flex-row gap-3">
          <Button label="📷 Camera" variant="secondary" onPress={openCamera} />
          <Button label="🖼 Gallery" variant="secondary" onPress={pickFromGallery} />
        </View>

        <Text className="text-neutral-600 text-xs text-center">
          {photos.length}/{MAX_PHOTOS} photos
        </Text>
      </ScrollView>

      {/* Sticky footer */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-neutral-100 px-4 py-4">
        <Button
          label={`Continue${photos.length > 0 ? ` (${photos.length} photo${photos.length > 1 ? 's' : ''})` : ''}`}
          variant="primary"
          size="lg"
          fullWidth
          disabled={photos.length === 0}
          onPress={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
}
