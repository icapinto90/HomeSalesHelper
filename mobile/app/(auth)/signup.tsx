import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { useAuthStore } from '../../src/store/auth.store';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUpWithEmail } = useAuthStore();

  const handleSignup = async () => {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signUpWithEmail(email, password);
      router.replace('/(auth)/platforms');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Sign up failed. Please try again.');
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
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} className="mt-4 mb-8">
          <Text className="text-primary text-base">← Back</Text>
        </TouchableOpacity>

        <Text className="text-2xl font-bold text-neutral-900 mb-2">Create account</Text>
        <Text className="text-neutral-600 mb-8">Start selling smarter today.</Text>

        <View className="gap-4">
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 8 characters"
            secureTextEntry
            autoComplete="password-new"
          />

          {error ? <Text className="text-error text-sm">{error}</Text> : null}

          <Button
            label="Create Account"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            onPress={handleSignup}
          />

          <View className="flex-row items-center gap-4 my-2">
            <View className="flex-1 h-px bg-neutral-300" />
            <Text className="text-neutral-600 text-sm">or</Text>
            <View className="flex-1 h-px bg-neutral-300" />
          </View>

          <Button
            label="Continue with Google"
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => {
              /* Google OAuth via expo-auth-session */
            }}
          />
          <Button
            label="Continue with Apple"
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => {
              /* Apple Sign-In */
            }}
          />

          <TouchableOpacity onPress={() => router.push('/(auth)/login')} className="items-center mt-4">
            <Text className="text-neutral-600">
              Already have an account? <Text className="text-primary font-medium">Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
