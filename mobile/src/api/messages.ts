import { api } from './client';
import type { Message, Conversation } from '../types';

export const messagesApi = {
  getInbox: () => api.get<Conversation[]>('/messages'),

  getThread: (listingId: string) =>
    api.get<Message[]>(`/messages/${listingId}`),

  reply: (messageId: string, content: string) =>
    api.post<Message>(`/messages/${messageId}/reply`, { content }),

  getSuggestions: (messageId: string) =>
    api.post<string[]>('/messages/suggestions', { messageId }),
};
