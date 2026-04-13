import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { useAuthStore } from '../../src/store/auth.store';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithEmail } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      router.replace('/(tabs)');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        className="px-6"
      >
        <TouchableOpacity onPress={() => router.back()} className="mt-4 mb-8">
          <Text className="text-primary text-base">← Back</Text>
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-neutral-900 mb-2">Welcome back</Text>
        <Text className="text-neutral-600 mb-8">Sign in to manage your listings.</Text>

        <View className="gap-4">
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
          />

          {error ? <Text className="text-error text-sm">{error}</Text> : null}

          <Button
            label="Sign In"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onPress={handleLogin}
          />

          <TouchableOpacity onPress={() => router.push('/(auth)/signup')} className="items-center mt-4">
            <Text className="text-neutral-600">
              No account? <Text className="text-primary font-medium">Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
