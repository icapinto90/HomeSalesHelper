import { create } from 'zustand';
import { listingsApi } from '../api/listings';
import { aiApi } from '../api/ai';
import { pricingApi } from '../api/pricing';
import { photosApi } from '../api/photos';
import type {
  Listing,
  AIIdentifyResult,
  PriceSuggestion,
  Platform,
  CreateListingInput,
} from '../types';

// ─── Create Listing Draft (stepper state) ─────────────────────────────────────

export interface CreateListingDraft {
  /** Local file URIs chosen by the user */
  photoUris: string[];
  /** Uploaded photo URLs (from /photos/upload) */
  uploadedPhotoUrls: string[];
  aiResult?: AIIdentifyResult;
  overrides: Partial<AIIdentifyResult>;
  price?: number;
  priceSuggestion?: PriceSuggestion;
  title?: string;
  description?: string;
  selectedPlatforms: Platform[];
}

const initialDraft: CreateListingDraft = {
  photoUris: [],
  uploadedPhotoUrls: [],
  overrides: {},
  selectedPlatforms: [],
};

interface ListingsState {
  listings: Listing[];
  loading: boolean;
  error: string | null;
  draft: CreateListingDraft;

  // Actions
  fetchListings: () => Promise<void>;
  getListing: (id: string) => Listing | undefined;
  markSold: (id: string) => Promise<void>;
  removeListing: (id: string) => Promise<void>;

  // Draft stepper
  setDraftPhotos: (uris: string[]) => void;
  setDraftAiResult: (result: AIIdentifyResult) => void;
  setDraftOverrides: (overrides: Partial<AIIdentifyResult>) => void;
  setDraftPrice: (price: number) => void;
  setDraftPriceSuggestion: (suggestion: PriceSuggestion) => void;
  setDraftText: (title: string, description: string) => void;
  setDraftPlatforms: (platforms: Platform[]) => void;
  resetDraft: () => void;

  // Async draft steps
  runPhotoUpload: () => Promise<string[]>;
  runAiIdentify: () => Promise<AIIdentifyResult>;
  runAiGenerate: () => Promise<void>;
  fetchPriceSuggestion: () => Promise<void>;
  publishDraft: () => Promise<Listing>;
}

export const useListingsStore = create<ListingsState>((set, get) => ({
  listings: [],
  loading: false,
  error: null,
  draft: initialDraft,

  fetchListings: async () => {
    set({ loading: true, error: null });
    try {
      const listings = await listingsApi.list();
      set({ listings, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  getListing: (id) => get().listings.find((l) => l.id === id),

  markSold: async (id) => {
    const updated = await listingsApi.markSold(id);
    set((s) => ({ listings: s.listings.map((l) => (l.id === id ? updated : l)) }));
  },

  removeListing: async (id) => {
    await listingsApi.remove(id);
    set((s) => ({ listings: s.listings.filter((l) => l.id !== id) }));
  },

  // ── Draft helpers ────────────────────────────────────────────────────────────
  setDraftPhotos: (uris) =>
    set((s) => ({ draft: { ...s.draft, photoUris: uris, uploadedPhotoUrls: [] } })),

  setDraftAiResult: (result) =>
    set((s) => ({ draft: { ...s.draft, aiResult: result } })),

  setDraftOverrides: (overrides) =>
    set((s) => ({ draft: { ...s.draft, overrides: { ...s.draft.overrides, ...overrides } } })),

  setDraftPrice: (price) =>
    set((s) => ({ draft: { ...s.draft, price } })),

  setDraftPriceSuggestion: (priceSuggestion) =>
    set((s) => ({
      draft: { ...s.draft, priceSuggestion, price: priceSuggestion.recommended },
    })),

  setDraftText: (title, description) =>
    set((s) => ({ draft: { ...s.draft, title, description } })),

  setDraftPlatforms: (selectedPlatforms) =>
    set((s) => ({ draft: { ...s.draft, selectedPlatforms } })),

  resetDraft: () => set({ draft: initialDraft }),

  // ── Async steps ──────────────────────────────────────────────────────────────

  /** Step 1b: upload local URIs to Supabase Storage via /photos/upload */
  runPhotoUpload: async () => {
    const { draft } = get();
    if (draft.uploadedPhotoUrls.length > 0) return draft.uploadedPhotoUrls;
    const urls = await photosApi.upload(draft.photoUris);
    set((s) => ({ draft: { ...s.draft, uploadedPhotoUrls: urls } }));
    return urls;
  },

  /** Step 2: AI identify from uploaded URLs */
  runAiIdentify: async () => {
    const photoUrls = await get().runPhotoUpload();
    const result = await aiApi.identify(photoUrls);
    set((s) => ({ draft: { ...s.draft, aiResult: result } }));
    return result;
  },

  /** Step 4: AI generate title + description */
  runAiGenerate: async () => {
    const { draft } = get();
    const ai = { ...draft.aiResult, ...draft.overrides };
    if (!ai.category) return;
    const result = await aiApi.generate({
      category: ai.category,
      brand: ai.brand,
      condition: ai.condition,
      attributes: ai.attributes,
    });
    set((s) => ({
      draft: { ...s.draft, title: result.title, description: result.description },
    }));
  },

  /** Step 3: fetch price suggestion */
  fetchPriceSuggestion: async () => {
    const { draft } = get();
    const ai = { ...draft.aiResult, ...draft.overrides };
    if (!ai.category) return;
    const keywords = [ai.brand, ai.category, ai.condition].filter(Boolean).join(' ');
    const suggestion = await pricingApi.getSuggestions({
      keywords,
      condition: ai.condition,
    });
    set((s) => ({
      draft: { ...s.draft, priceSuggestion: suggestion, price: suggestion.recommended },
    }));
  },

  /** Step 5: upload photos (if not done), create listing, publish */
  publishDraft: async () => {
    const { draft } = get();

    // 1. Ensure photos are uploaded
    const photoUrls =
      draft.uploadedPhotoUrls.length > 0
        ? draft.uploadedPhotoUrls
        : await get().runPhotoUpload();

    // 2. Create listing with all collected data
    const input: CreateListingInput = {
      title: draft.title ?? '',
      description: draft.description ?? '',
      price: draft.price ?? 0,
      category: draft.aiResult?.category ?? draft.overrides.category,
      photos: photoUrls,
    };
    const listing = await listingsApi.create(input);

    // 3. Publish to selected platforms (async jobs on backend)
    await listingsApi.publish(listing.id, draft.selectedPlatforms);

    // 4. Fetch updated listing with platformListings status
    const updated = await listingsApi.get(listing.id);

    // 5. Prepend to local list
    set((s) => ({ listings: [updated, ...s.listings] }));
    return updated;
  },
}));
