import { api } from './client';
import type { Listing, CreateListingInput, Platform } from '../types';

export const listingsApi = {
  list: () => api.get<Listing[]>('/listings'),

  get: (id: string) => api.get<Listing>(`/listings/${id}`),

  create: (input: CreateListingInput) => api.post<Listing>('/listings', input),

  update: (id: string, input: Partial<CreateListingInput & { price: number }>) =>
    api.patch<Listing>(`/listings/${id}`, input),

  remove: (id: string) => api.delete<void>(`/listings/${id}`),

  uploadPhotos: (id: string, uris: string[]) => {
    const form = new FormData();
    uris.forEach((uri, i) => {
      form.append('photos', {
        uri,
        name: `photo_${i}.jpg`,
        type: 'image/jpeg',
      } as unknown as Blob);
    });
    return api.upload<Listing>(`/listings/${id}/photos`, form);
  },

  deletePhoto: (listingId: string, photoId: string) =>
    api.delete<void>(`/listings/${listingId}/photos/${photoId}`),

  publish: (id: string, platforms: Platform[]) =>
    api.post<Listing>(`/listings/${id}/publish`, { platforms }),

  markSold: (id: string) => api.patch<Listing>(`/listings/${id}/sold`, {}),
};
