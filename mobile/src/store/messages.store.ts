import { create } from 'zustand';
import { messagesApi } from '../api/messages';
import { aiApi } from '../api/ai';
import type { Message, MessageThread } from '../types';

interface MessagesState {
  threads: MessageThread[];
  activeMessages: Message[];
  activeSuggestions: string[];
  loading: boolean;
  error: string | null;

  fetchThreads: () => Promise<void>;
  fetchThread: (listingId: string) => Promise<void>;
  reply: (messageId: string, content: string) => Promise<void>;
  fetchSuggestions: (messageId: string) => Promise<void>;
  clearSuggestions: () => void;
  totalUnread: () => number;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  threads: [],
  activeMessages: [],
  activeSuggestions: [],
  loading: false,
  error: null,

  fetchThreads: async () => {
    set({ loading: true, error: null });
    try {
      const threads = await messagesApi.getThreads();
      set({ threads, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  fetchThread: async (listingId) => {
    set({ loading: true });
    try {
      const messages = await messagesApi.getByListing(listingId);
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
    const result = await aiApi.suggestReply(messageId);
    set({ activeSuggestions: result.suggestions });
  },

  clearSuggestions: () => set({ activeSuggestions: [] }),

  totalUnread: () =>
    get().threads.reduce((acc, t) => acc + t.unreadCount, 0),
}));
