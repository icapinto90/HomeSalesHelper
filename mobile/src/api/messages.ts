import { api } from './client';
import type { Message, MessageThread } from '../types';

export const messagesApi = {
  /** GET /messages/threads — conversations grouped by listing + buyer */
  getThreads: () => api.get<MessageThread[]>('/messages/threads'),

  /** GET /messages/listing/{listingId} — messages for a listing (marks them read) */
  getByListing: (listingId: string) =>
    api.get<Message[]>(`/messages/listing/${listingId}`),

  /** GET /messages/unread-count */
  getUnreadCount: () => api.get<{ unreadCount: number }>('/messages/unread-count'),

  /** POST /messages/{id}/reply */
  reply: (messageId: string, content: string) =>
    api.post<Message>(`/messages/${messageId}/reply`, { content }),

  /** POST /messages/{id}/read */
  markRead: (messageId: string) =>
    api.post<void>(`/messages/${messageId}/read`),
};
