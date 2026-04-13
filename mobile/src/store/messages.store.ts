import { create } from 'zustand';
import { messagesApi } from '../api/messages';
import type { Conversation, Message } from '../types';

interface MessagesState {
  conversations: Conversation[];
  activeMessages: Message[];
  activeSuggestions: string[];
  loading: boolean;
  error: string | null;

  fetchInbox: () => Promise<void>;
  fetchThread: (listingId: string) => Promise<void>;
  reply: (messageId: string, content: string) => Promise<void>;
  fetchSuggestions: (messageId: string) => Promise<void>;
  clearSuggestions: () => void;
  totalUnread: () => number;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [],
  activeMessages: [],
  activeSuggestions: [],
  loading: false,
  error: null,

  fetchInbox: async () => {
    set({ loading: true, error: null });
    try {
      const conversations = await messagesApi.getInbox();
      set({ conversations, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchThread: async (listingId) => {
    set({ loading: true });
    try {
      const messages = await messagesApi.getThread(listingId);
      set({ activeMessages: messages, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  reply: async (messageId, content) => {
    const sent = await messagesApi.reply(messageId, content);
    set((s) => ({ activeMessages: [...s.activeMessages, sent] }));
  },

  fetchSuggestions: async (messageId) => {
    const suggestions = await messagesApi.getSuggestions(messageId);
    set({ activeSuggestions: suggestions });
  },

  clearSuggestions: () => set({ activeSuggestions: [] }),

  totalUnread: () =>
    get().conversations.reduce((acc, c) => acc + c.unreadCount, 0),
}));
