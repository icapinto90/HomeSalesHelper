import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMessagesStore } from '../../src/store/messages.store';

function TabBarIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    index: '🏠',
    listings: '📋',
    messages: '💬',
    profile: '👤',
  };
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{icons[name] ?? '●'}</Text>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const totalUnread = useMessagesStore((s) => s.totalUnread());

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#5B4FE9',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          borderTopColor: '#E5E7EB',
        },
        tabBarLabelStyle: { fontSize: 10, marginTop: -4 },
        tabBarIcon: ({ focused }) => <TabBarIcon name={route.name} focused={focused} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="listings" options={{ title: 'Listings' }} />
      <Tabs.Screen
        name="create-placeholder"
        options={{
          title: '',
          tabBarButton: () => (
            <TouchableOpacity
              onPress={() => router.push('/create/photos')}
              style={styles.fab}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 }}>+</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5B4FE9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#5B4FE9',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
