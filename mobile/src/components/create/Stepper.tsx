import React from 'react';
import { View, Text } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

export const STEPS = ['Photos', 'AI Review', 'Pricing', 'Description', 'Publish'] as const;
export type StepLabel = (typeof STEPS)[number];

interface StepperProps {
  currentStep: number; // 0-indexed
}

export function Stepper({ currentStep }: StepperProps) {
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const barStyle = useAnimatedStyle(() => ({
    width: withTiming(`${progress}%`, { duration: 300 }),
  }));

  return (
    <View className="px-4 pb-4 gap-3">
      {/* Progress bar */}
      <View className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
        <Animated.View style={barStyle} className="h-full bg-primary rounded-full" />
      </View>

      {/* Step labels */}
      <View className="flex-row justify-between">
        {STEPS.map((label, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <View key={label} className="items-center gap-1" style={{ flex: 1 }}>
              <View
                className={[
                  'w-6 h-6 rounded-full items-center justify-center',
                  done ? 'bg-secondary' : active ? 'bg-primary' : 'bg-neutral-100',
                ].join(' ')}
              >
                <Text className={`text-xs font-bold ${done || active ? 'text-white' : 'text-neutral-300'}`}>
                  {done ? '✓' : i + 1}
                </Text>
              </View>
              <Text
                className={`text-[10px] text-center ${active ? 'text-primary font-semibold' : 'text-neutral-600'}`}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
