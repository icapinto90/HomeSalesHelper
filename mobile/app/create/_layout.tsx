import { Stack } from 'expo-router';

export default function CreateLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: 'New Listing',
        headerBackTitle: '',
        headerTintColor: '#5B4FE9',
        headerRight: () => null,
      }}
    >
      <Stack.Screen name="photos" />
      <Stack.Screen name="review" />
      <Stack.Screen name="pricing" />
      <Stack.Screen name="description" />
      <Stack.Screen name="publish" />
    </Stack>
  );
}
