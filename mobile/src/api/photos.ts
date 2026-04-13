import { api } from './client';
import { getToken } from './client';
import type { PhotoUploadResult } from '../types';

const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const photosApi = {
  /**
   * Upload local file URIs to Supabase Storage via POST /photos/upload (multipart).
   * Returns the array of public storage URLs.
   */
  upload: async (uris: string[]): Promise<string[]> => {
    const form = new FormData();
    uris.forEach((uri) => {
      const filename = uri.split('/').pop() ?? 'photo.jpg';
      form.append('file', {
        uri,
        name: filename,
        type: 'image/jpeg',
      } as unknown as Blob);
    });

    const token = await getToken();
    const res = await fetch(`${BASE_URL}/photos/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(`Photo upload failed: HTTP ${res.status}`);
    }

    const data: PhotoUploadResult = await res.json();
    return data.urls;
  },

  /** DELETE /photos — remove photos from storage by URL */
  delete: (urls: string[]) =>
    api.delete<void>('/photos', { urls }),
};
