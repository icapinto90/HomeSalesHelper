import { api } from './client';
import type { Listing, CreateListingInput, Platform } from '../types';

export const listingsApi = {
  list: () => api.get<Listing[]>('/listings'),

  get: (id: string) => api.get<Listing>(`/listings/${id}`),

  create: (input: CreateListingInput) => api.post<Listing>('/listings', input),

  update: (id: string, input: Partial<Omit<CreateListingInput, 'photos'>>) =>
    api.patch<Listing>(`/listings/${id}`, input),

  remove: (id: string) => api.delete<void>(`/listings/${id}`),

  publish: (id: string, platforms: Platform[]) =>
    api.post<{ jobIds: string[] }>(`/listings/${id}/publish`, { platforms }),

  publishStatus: (id: string) =>
    api.get<Record<Platform, { status: string; url?: string }>>(`/listings/${id}/publish-status`),

  markSold: (id: string) => api.patch<Listing>(`/listings/${id}/sold`, {}),
};
