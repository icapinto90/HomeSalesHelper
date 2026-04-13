import { create } from 'zustand';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { setToken, clearToken } from '../api/client';
import type { User } from '../types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: {
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

interface AuthState {
  user: User | null;
  session: { access_token: string } | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,

  initialize: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await setToken(data.session.access_token);
      set({
        session: data.session,
        user: {
          id: data.session.user.id,
          email: data.session.user.email ?? '',
          name: data.session.user.user_metadata?.full_name,
          avatarUrl: data.session.user.user_metadata?.avatar_url,
          subscriptionPlan: 'FREE',
        },
        loading: false,
      });
    } else {
      set({ loading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await setToken(session.access_token);
        set({
          session,
          user: {
            id: session.user.id,
            email: session.user.email ?? '',
            name: session.user.user_metadata?.full_name,
            avatarUrl: session.user.user_metadata?.avatar_url,
            subscriptionPlan: 'FREE',
          },
        });
      } else {
        await clearToken();
        set({ session: null, user: null });
      }
    });
  },

  signInWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUpWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    await clearToken();
    set({ user: null, session: null });
  },
}));
