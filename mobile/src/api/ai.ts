import { api } from './client';
import type { AIIdentifyResult, AIGenerateResult } from '../types';

export const aiApi = {
  identify: (photoUrls: string[]) =>
    api.post<AIIdentifyResult>('/ai/identify', { photoUrls }),

  generate: (params: {
    category: string;
    brand?: string;
    condition?: string;
    attributes?: Record<string, string>;
    language?: 'en' | 'fr' | 'es';
  }) => api.post<AIGenerateResult>('/ai/generate', params),
};
