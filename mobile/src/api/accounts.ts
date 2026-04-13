import { api } from './client';
import type { Platform, PlatformAccount } from '../types';

export const accountsApi = {
  list: () => api.get<PlatformAccount[]>('/accounts'),

  connect: (platform: Platform) =>
    api.post<{ authUrl: string }>(`/accounts/${platform.toLowerCase()}/connect`),

  disconnect: (platform: Platform) =>
    api.delete<void>(`/accounts/${platform.toLowerCase()}`),
};
