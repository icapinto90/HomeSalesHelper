import { create } from 'zustand';
import { listingsApi } from '../api/listings';
import { aiApi } from '../api/ai';
import { pricingApi } from '../api/pricing';
import type {
  Listing,
  AIIdentifyResult,
  PriceSuggestion,
  Platform,
  CreateListingInput,
} from '../types';

// ─── Create Listing Draft (stepper state) ─────────────────────────────────────

export interface CreateListingDraft {
  photoUris: string[];
  uploadedListingId?: string;
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
  setDraftListingId: (id: string) => void;
  resetDraft: () => void;

  // Async draft steps
  runAiIdentify: (photoUrls: string[]) => Promise<AIIdentifyResult>;
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
    set((s) => ({ draft: { ...s.draft, photoUris: uris } })),

  setDraftAiResult: (result) =>
    set((s) => ({ draft: { ...s.draft, aiResult: result } })),

  setDraftOverrides: (overrides) =>
    set((s) => ({ draft: { ...s.draft, overrides: { ...s.draft.overrides, ...overrides } } })),

  setDraftPrice: (price) =>
    set((s) => ({ draft: { ...s.draft, price } })),

  setDraftPriceSuggestion: (priceSuggestion) =>
    set((s) => ({ draft: { ...s.draft, priceSuggestion, price: priceSuggestion.recommended } })),

  setDraftText: (title, description) =>
    set((s) => ({ draft: { ...s.draft, title, description } })),

  setDraftPlatforms: (selectedPlatforms) =>
    set((s) => ({ draft: { ...s.draft, selectedPlatforms } })),

  setDraftListingId: (id) =>
    set((s) => ({ draft: { ...s.draft, uploadedListingId: id } })),

  resetDraft: () => set({ draft: initialDraft }),

  // ── Async steps ──────────────────────────────────────────────────────────────
  runAiIdentify: async (photoUrls) => {
    const result = await aiApi.identify(photoUrls);
    set((s) => ({ draft: { ...s.draft, aiResult: result } }));
    return result;
  },

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

  fetchPriceSuggestion: async () => {
    const { draft } = get();
    const ai = { ...draft.aiResult, ...draft.overrides };
    if (!ai.category) return;
    const suggestion = await pricingApi.getSuggestions({
      category: ai.category,
      brand: ai.brand,
      condition: ai.condition,
    });
    set((s) => ({
      draft: { ...s.draft, priceSuggestion: suggestion, price: suggestion.recommended },
    }));
  },

  publishDraft: async () => {
    const { draft } = get();
    const ai = { ...draft.aiResult, ...draft.overrides };

    // 1. Create listing
    const input: CreateListingInput = {
      title: draft.title,
      description: draft.description,
      price: draft.price,
      category: ai.category,
      condition: ai.condition,
      brand: ai.brand,
    };
    let listing = draft.uploadedListingId
      ? await listingsApi.update(draft.uploadedListingId, input)
      : await listingsApi.create(input);

    // 2. Upload photos if not yet uploaded
    if (!draft.uploadedListingId && draft.photoUris.length > 0) {
      listing = await listingsApi.uploadPhotos(listing.id, draft.photoUris);
    }

    // 3. Publish to selected platforms
    listing = await listingsApi.publish(listing.id, draft.selectedPlatforms);

    // 4. Update listings list
    set((s) => ({ listings: [listing, ...s.listings] }));

    return listing;
  },
}));
