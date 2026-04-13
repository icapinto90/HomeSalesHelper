import { api } from './client';
import type { PriceSuggestion } from '../types';

export const pricingApi = {
  /**
   * POST /pricing/suggest
   * Returns a price range based on eBay sold items.
   */
  getSuggestions: (params: {
    keywords: string;
    listingId?: string;
    condition?: string;
  }) => api.post<PriceSuggestion>('/pricing/suggest', params),
};
