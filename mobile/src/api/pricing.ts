import { api } from './client';
import type { PriceSuggestion } from '../types';

export const pricingApi = {
  getSuggestions: (params: { category: string; brand?: string; condition?: string }) =>
    api.get<PriceSuggestion>(
      `/pricing/suggestions?category=${encodeURIComponent(params.category)}` +
        (params.brand ? `&brand=${encodeURIComponent(params.brand)}` : '') +
        (params.condition ? `&condition=${encodeURIComponent(params.condition)}` : ''),
    ),
};
