import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  testID?: string;
}

const variantStyles: Record<Variant, { container: string; text: string }> = {
  primary: { container: 'bg-primary', text: 'text-white' },
  secondary: { container: 'border border-primary bg-transparent', text: 'text-primary' },
  ghost: { container: 'bg-transparent', text: 'text-primary' },
  danger: { container: 'bg-error', text: 'text-white' },
};

const sizeStyles: Record<Size, { container: string; text: string }> = {
  sm: { container: 'px-4 py-2', text: 'text-sm' },
  md: { container: 'px-6 py-3', text: 'text-base' },
  lg: { container: 'px-8 py-4', text: 'text-base' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  testID,
}: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      className={[
        'rounded-pill flex-row items-center justify-center',
        v.container,
        s.container,
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#fff' : '#5B4FE9'}
        />
      ) : (
        <>
          {icon && <View className="mr-2">{icon}</View>}
          <Text className={`font-medium ${v.text} ${s.text}`}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
