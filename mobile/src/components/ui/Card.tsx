import React from 'react';
import { View, TouchableOpacity } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  testID?: string;
}

export function Card({ children, onPress, className = '', testID }: CardProps) {
  const base = `bg-white rounded-card shadow-sm ${className}`;

  if (onPress) {
    return (
      <TouchableOpacity testID={testID} onPress={onPress} activeOpacity={0.9} className={base}>
        {children}
      </TouchableOpacity>
    );
  }
  return (
    <View testID={testID} className={base}>
      {children}
    </View>
  );
}
