import React, { forwardRef } from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, prefix, suffix, className = '', ...props }, ref) => {
    return (
      <View className="gap-1">
        {label && (
          <Text className="text-sm font-medium text-neutral-900">{label}</Text>
        )}
        <View
          className={[
            'flex-row items-center border rounded-card px-3',
            error ? 'border-error' : 'border-neutral-300',
            'focus-within:border-primary',
          ].join(' ')}
        >
          {prefix && (
            <Text className="text-neutral-600 mr-1 text-base">{prefix}</Text>
          )}
          <TextInput
            ref={ref}
            className={`flex-1 py-3 text-neutral-900 text-base ${className}`}
            placeholderTextColor="#9CA3AF"
            {...props}
          />
          {suffix && (
            <Text className="text-neutral-600 ml-1 text-base">{suffix}</Text>
          )}
        </View>
        {error && <Text className="text-error text-xs">{error}</Text>}
      </View>
    );
  },
);

Input.displayName = 'Input';
