import { api } from './client';
import type { Platform, PlatformAccount } from '../types';

export const accountsApi = {
  /** GET /platform-accounts — list connected marketplace accounts */
  list: () => api.get<PlatformAccount[]>('/platform-accounts'),

  /** GET /platform-accounts/oauth/{platform}/url — get OAuth redirect URL */
  getOAuthUrl: (platform: Platform) =>
    api.get<{ url: string }>(`/platform-accounts/oauth/${platform.toLowerCase()}/url`),

  /** DELETE /platform-accounts/{platform} — disconnect account */
  disconnect: (platform: Platform) =>
    api.delete<void>(`/platform-accounts/${platform.toLowerCase()}`),
};
