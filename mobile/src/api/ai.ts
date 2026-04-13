import { api } from './client';
import type { AIIdentifyResult, AIGenerateResult, ReplyTone } from '../types';

export const aiApi = {
  /** POST /ai/identify — identify object from photo URLs */
  identify: (photoUrls: string[]) =>
    api.post<AIIdentifyResult>('/ai/identify', { photoUrls }),

  /** POST /ai/generate — generate title + description */
  generate: (params: {
    category: string;
    brand?: string;
    condition?: string;
    attributes?: Record<string, string>;
    language?: 'en' | 'fr' | 'es';
  }) => api.post<AIGenerateResult>('/ai/generate', params),

  /** POST /ai/suggest-reply — AI quick-reply suggestions for a buyer message */
  suggestReply: (messageId: string, tone: ReplyTone = 'friendly') =>
    api.post<{ suggestions: string[] }>('/ai/suggest-reply', { messageId, tone }),
};
